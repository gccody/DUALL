/**
 * Builds the bundled service icon set and its registry module.
 *
 *   bun run scripts/scrapeTotp.ts                  fetch the 2fa.directory list, download missing
 *                                                  icons, prune stale ones, regenerate the registry
 *   bun run scripts/scrapeTotp.ts --offline        no network: regenerate the registry from the
 *                                                  entries already in utils/iconRegistry.generated.ts
 *   bun run scripts/scrapeTotp.ts --offline --from <file.json>
 *                                                  no network: use a local site list, either
 *                                                  [{ name, domain }] or the raw 2fa.directory format
 *
 * Every mode only registers domains whose icon file exists and deletes icon files whose domain is
 * not in the site list.
 */
import cliProgress from 'cli-progress';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

interface SiteData {
  name: string;
  domain: string;
}

/** Entry of https://api.2fa.directory/v3/totp.json: [name, { domain, img? }] */
type ApiSite = [string, { domain: string; img?: string }];

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = path.join(ROOT, 'assets', 'custom-icons');
const REGISTRY_PATH = path.join(ROOT, 'utils', 'iconRegistry.generated.ts');
const ICON_EXT = '.avif';
const ICON_SIZE = 100;
const API_URL = 'https://api.2fa.directory/v3/totp.json';
const IMG_BASE_URL = 'https://raw.githubusercontent.com/2factorauth/twofactorauth/master/img';

function iconPath(domain: string): string {
  return path.join(ICONS_DIR, `${domain}${ICON_EXT}`);
}

/** Accepts [{ name, domain }] or the raw API format; keeps the first entry per domain. */
function normalizeSiteList(raw: unknown): SiteData[] {
  if (!Array.isArray(raw)) throw new Error('Site list must be a JSON array');
  const seen = new Set<string>();
  const sites: SiteData[] = [];
  for (const item of raw) {
    const site: SiteData | null = Array.isArray(item)
      ? { name: item[0], domain: item[1]?.domain }
      : item && typeof item === 'object'
        ? { name: (item as SiteData).name, domain: (item as SiteData).domain }
        : null;
    if (!site || typeof site.name !== 'string' || typeof site.domain !== 'string') continue;
    if (!site.domain || seen.has(site.domain)) continue;
    seen.add(site.domain);
    sites.push(site);
  }
  return sites;
}

/** Reads the entries back out of a registry produced by renderRegistry(). */
async function readExistingRegistry(): Promise<SiteData[]> {
  const source = await fs.readFile(REGISTRY_PATH, 'utf-8');
  const entry = /^\s*("(?:[^"\\]|\\.)*"): \{ name: ("(?:[^"\\]|\\.)*"), source:/gm;
  return [...source.matchAll(entry)].map(m => ({ domain: JSON.parse(m[1]), name: JSON.parse(m[2]) }));
}

async function downloadIcon(site: ApiSite): Promise<void> {
  const [, { domain, img }] = site;
  const imgPath = img || `${domain}.svg`;
  const url = `${IMG_BASE_URL}/${imgPath[0]}/${imgPath}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .avif()
    .toFile(iconPath(domain));
}

/** Downloads icons that aren't on disk yet; returns the normalized site list. */
async function fetchUpstream(): Promise<SiteData[]> {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`Failed to fetch ${API_URL}: HTTP ${response.status}`);
  const apiSites: ApiSite[] = await response.json();

  const failures: string[] = [];
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(apiSites.length, 0);
  for (const site of apiSites) {
    const domain = site[1]?.domain;
    if (domain && !existsSync(iconPath(domain))) {
      try {
        await downloadIcon(site);
      } catch (error) {
        failures.push(`${domain}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    bar.increment();
  }
  bar.stop();

  if (failures.length) {
    console.log(`Failed to fetch ${failures.length} icon(s):\n  ${failures.join('\n  ')}`);
  }
  return normalizeSiteList(apiSites);
}

/** Deletes icon files whose domain is no longer in the site list. */
async function pruneStaleIcons(sites: SiteData[]): Promise<string[]> {
  const wanted = new Set(sites.map(s => `${s.domain}${ICON_EXT}`));
  const stale = (await fs.readdir(ICONS_DIR)).filter(f => f.endsWith(ICON_EXT) && !wanted.has(f));
  await Promise.all(stale.map(f => fs.unlink(path.join(ICONS_DIR, f))));
  return stale;
}

function renderRegistry(sites: SiteData[]): string {
  const lines = sites.map(({ domain, name }) => {
    const file = JSON.stringify(`../assets/custom-icons/${domain}${ICON_EXT}`);
    return `  ${JSON.stringify(domain)}: { name: ${JSON.stringify(name)}, source: require(${file}) },`;
  });
  return `/*
 * This file is automatically generated by scripts/scrapeTotp.ts (bun run fetch:data).
 * Do not modify it directly.
 */
import type { ImageSourcePropType } from 'react-native';

export interface IconEntry {
  /** Service name from the 2fa.directory list */
  name: string;
  source: ImageSourcePropType;
}

/** Bundled service icons keyed by domain (e.g. "github.com"). */
export const ICONS: Record<string, IconEntry> = {
${lines.join('\n')}
};
`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const offline = args.includes('--offline');
  const fromIndex = args.indexOf('--from');
  const fromFile = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
  if (fromIndex >= 0 && !fromFile) throw new Error('--from needs a path');

  await fs.mkdir(ICONS_DIR, { recursive: true });

  let sites: SiteData[];
  if (fromFile) {
    sites = normalizeSiteList(JSON.parse(await fs.readFile(path.resolve(fromFile), 'utf-8')));
  } else if (offline) {
    sites = await readExistingRegistry();
  } else {
    sites = await fetchUpstream();
  }
  // Never prune the whole icon set because of an empty/broken list.
  if (sites.length === 0) throw new Error('Site list is empty; refusing to prune icons');

  const stale = await pruneStaleIcons(sites);
  if (stale.length) console.log(`Removed ${stale.length} stale icon(s): ${stale.join(', ')}`);

  const available = sites.filter(s => existsSync(iconPath(s.domain)));
  await fs.writeFile(REGISTRY_PATH, renderRegistry(available), 'utf-8');
  console.log(`Wrote ${path.relative(ROOT, REGISTRY_PATH)} with ${available.length} icons`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
