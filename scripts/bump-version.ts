import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory (compatible with both Node and Bun)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
  [key: string]: any;
}

interface AppJson {
  expo: {
    version: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Read package.json
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Get the current version
const currentVersion = packageJson.version;

// Get the last committed version
let lastCommittedVersion: string;
try {
  const lastPackageJson = execSync('git show HEAD~1:package.json', { encoding: 'utf8' });
  lastCommittedVersion = JSON.parse(lastPackageJson).version;
} catch (error) {
  // If we can't get the previous version, assume version hasn't changed
  console.log('Could not get previous version, assuming first commit');
  lastCommittedVersion = currentVersion;
}

console.log(`Current version: ${currentVersion}`);
console.log(`Last committed version: ${lastCommittedVersion}`);

// Check if version has changed
if (currentVersion !== lastCommittedVersion) {
  console.log('Version has been manually updated. No auto-bump needed.');
  process.exit(0);
}

// Version hasn't changed, so bump it
console.log('Version has not changed. Auto-bumping...');

// Parse version and bump the appropriate part
function bumpVersion(version: string): string {
  // Check if it's a pre-release version (e.g., 1.0.1-beta1)
  const preReleaseMatch = version.match(/^(\d+\.\d+\.\d+)-([\w]+)(\d+)$/);
  if (preReleaseMatch) {
    const [, baseVersion, preReleaseType, preReleaseNumber] = preReleaseMatch;
    const newPreReleaseNumber = parseInt(preReleaseNumber) + 1;
    return `${baseVersion}-${preReleaseType}${newPreReleaseNumber}`;
  }

  // Regular version (e.g., 1.0.1)
  const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (versionMatch) {
    const [, major, minor, patch] = versionMatch;
    const newPatch = parseInt(patch) + 1;
    return `${major}.${minor}.${newPatch}`;
  }

  throw new Error(`Invalid version format: ${version}`);
}

const newVersion = bumpVersion(currentVersion);
console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update app.json
const appJsonPath = join(__dirname, '..', 'app.json');
const appJson: AppJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = newVersion;
writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log('Version bumped successfully!');
console.log(`New version: ${newVersion}`);

// Output the new version for GitHub Actions
console.log(`::set-output name=version::${newVersion}`);
console.log(`::set-output name=version_changed::true`);