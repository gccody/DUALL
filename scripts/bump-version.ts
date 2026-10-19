import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// package.json is the single source of truth for the app version;
// app.config.js derives the native version and extra.displayVersion from it.

// Get current directory (compatible with both Node and Bun)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Get the last committed version
let lastCommittedVersion: string;
try {
  const lastPackageJson = execSync('git show HEAD~1:package.json', { encoding: 'utf8' });
  lastCommittedVersion = JSON.parse(lastPackageJson).version;
} catch {
  // If we can't get the previous version, assume version hasn't changed
  console.log('Could not get previous version, assuming first commit');
  lastCommittedVersion = currentVersion;
}

console.log(`Current version: ${currentVersion}`);
console.log(`Last committed version: ${lastCommittedVersion}`);

if (currentVersion !== lastCommittedVersion) {
  console.log('Version has been manually updated. No auto-bump needed.');
  process.exit(0);
}

console.log('Version has not changed. Auto-bumping...');

// Bump the prerelease number (1.0.1-beta1 -> 1.0.1-beta2) or the patch (1.0.1 -> 1.0.2).
function bumpVersion(version: string): string {
  const preReleaseMatch = version.match(/^(\d+\.\d+\.\d+)-([A-Za-z]+)(\d+)$/);
  if (preReleaseMatch) {
    const [, baseVersion, preReleaseType, preReleaseNumber] = preReleaseMatch;
    return `${baseVersion}-${preReleaseType}${parseInt(preReleaseNumber, 10) + 1}`;
  }

  const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (versionMatch) {
    const [, major, minor, patch] = versionMatch;
    return `${major}.${minor}.${parseInt(patch, 10) + 1}`;
  }

  throw new Error(`Invalid version format: ${version}`);
}

const newVersion = bumpVersion(currentVersion);
console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped successfully! New version: ${newVersion}`);
