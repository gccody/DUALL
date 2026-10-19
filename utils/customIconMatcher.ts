import { Service } from '@/types';
import type { ImageSourcePropType } from 'react-native';
import { ICONS } from './iconRegistry.generated';

/**
 * Normalize a string for comparison by converting to lowercase and removing special characters
 */
function normalizeString(str: string | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface IndexedIcon {
  domain: string;
  name: string;
  normalizedName: string;
  /** Domain with every non-alphanumeric character (dots included) removed, e.g. "githubcom". */
  normalizedDomain: string;
}

// Normalized once at module load, in registry order (ties keep the first match).
const ICON_INDEX: IndexedIcon[] = Object.entries(ICONS).map(([domain, { name }]) => ({
  domain,
  name,
  normalizedName: normalizeString(name),
  normalizedDomain: normalizeString(domain),
}));

// Cache for issuer lookups, keyed by normalized issuer
const domainCache = new Map<string, string | null>();

function hasIcon(domain: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICONS, domain);
}

/**
 * Extract domain from issuer using various heuristics
 */
function extractDomainFromIssuer(issuer: string): string | null {
  const normalized = issuer.toLowerCase().trim();

  const domainPatterns = [
    // Match domains with TLD
    /([a-z0-9-]+\.[a-z]{2,})/,
    // Match subdomains
    /([a-z0-9-]+\.[a-z0-9-]+\.[a-z]{2,})/,
  ];

  for (const pattern of domainPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Find the best matching icon domain for an issuer
 */
function findMatchingDomain(issuer: string | undefined): string | null {
  if (!issuer) return null;

  const normalizedIssuer = normalizeString(issuer);
  const cached = domainCache.get(normalizedIssuer);
  if (cached !== undefined) return cached;

  // Issuer that looks like a domain we have an icon for
  const directDomain = extractDomainFromIssuer(issuer);
  if (directDomain && hasIcon(directDomain)) {
    domainCache.set(normalizedIssuer, directDomain);
    return directDomain;
  }

  let bestMatch: string | null = null;
  let bestScore = 0;
  const consider = (domain: string, score: number) => {
    if (score > bestScore) {
      bestMatch = domain;
      bestScore = score;
    }
  };

  for (const { domain, normalizedName, normalizedDomain } of ICON_INDEX) {
    // Exact name match (highest priority)
    if (normalizedName === normalizedIssuer) {
      bestMatch = domain;
      bestScore = 100;
      break;
    }

    // Domain contains issuer
    if (normalizedIssuer.length > 2 && normalizedDomain.includes(normalizedIssuer)) {
      consider(domain, (normalizedIssuer.length / normalizedDomain.length) * 80);
    }

    // Issuer contains domain. The normalized domain has no dots, so this compares
    // against e.g. "githubcom" (the TLD is not stripped).
    if (normalizedDomain.length > 2 && normalizedIssuer.includes(normalizedDomain)) {
      consider(domain, (normalizedDomain.length / normalizedIssuer.length) * 70);
    }

    // Name contains issuer
    if (normalizedIssuer.length > 2 && normalizedName.includes(normalizedIssuer)) {
      consider(domain, (normalizedIssuer.length / normalizedName.length) * 60);
    }

    // Issuer contains name
    if (normalizedName.length > 2 && normalizedIssuer.includes(normalizedName)) {
      consider(domain, (normalizedName.length / normalizedIssuer.length) * 50);
    }
  }

  // Only return matches with a reasonable confidence score
  const result = bestScore >= 30 ? bestMatch : null;
  domainCache.set(normalizedIssuer, result);
  return result;
}

/**
 * Get the bundled icon for a domain (e.g. "github.com"), or null if there is none
 */
export function getIconSource(domain: string): ImageSourcePropType | null {
  return hasIcon(domain) ? ICONS[domain].source : null;
}

/**
 * Get the matched icon domain for a service based on its issuer, or null if none found
 */
export function getCustomIconDomain(service: Service): string | null {
  return findMatchingDomain(service.otp.issuer);
}

/**
 * Pre-populate the domain cache for a list of services so first-scroll icon
 * resolution is O(1) rather than scanning the icon list per item.
 */
export function warmIconCache(services: Service[]): void {
  for (const service of services) {
    if (service.icon !== null && !service.icon?.label) {
      findMatchingDomain(service.otp.issuer);
    }
  }
}

/**
 * Get custom icon for a service based on its issuer
 */
export function getCustomIcon(service: Service): ImageSourcePropType | null {
  const domain = findMatchingDomain(service.otp.issuer);
  return domain ? getIconSource(domain) : null;
}

/**
 * Search for custom icons by domain or name, sorted by name
 */
export function searchCustomIcons(query: string): { domain: string; name: string; icon: ImageSourcePropType }[] {
  const normalizedQuery = normalizeString(query);

  return ICON_INDEX
    .filter(({ normalizedName, normalizedDomain }) =>
      normalizedName.includes(normalizedQuery) || normalizedDomain.includes(normalizedQuery))
    .map(({ domain, name }) => ({ domain, name, icon: ICONS[domain].source }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Label older versions stored to mean "the user removed the icon" (now `icon: null`). */
const LEGACY_REMOVED_LABEL = 'none';

/**
 * The icon to show for a service: its chosen bundled icon, nothing if the user
 * removed it, or the auto-matched icon when none was chosen.
 */
export function resolveIcon(service: Service): ImageSourcePropType | null {
  const { icon } = service;
  if (icon === null || icon?.label === LEGACY_REMOVED_LABEL) return null;
  if (icon?.label) return getIconSource(icon.label);
  return getCustomIcon(service);
}
