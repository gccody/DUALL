// package.json is the single source of truth for the app version.
//
// iOS requires CFBundleShortVersionString to be a numeric "x.y.z", so the
// native `version` is the core of the package.json version (prerelease tags
// such as "-alpha2" are stripped). The full string is exposed to the app as
// `extra.displayVersion`. Build numbers are managed remotely by EAS
// (`appVersionSource: "remote"` in eas.json).
const { version: packageVersion } = require('./package.json');

const match = /^(\d+)\.(\d+)\.(\d+)/.exec(packageVersion);
if (!match) {
  throw new Error(`package.json version "${packageVersion}" must start with x.y.z`);
}
const nativeVersion = match.slice(1, 4).join('.');

/** @param {import('expo/config').ConfigContext} ctx @returns {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  version: nativeVersion,
  extra: {
    ...config.extra,
    displayVersion: packageVersion,
  },
});
