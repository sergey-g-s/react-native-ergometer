const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Watch the whole monorepo: workspace packages and pnpm's store live outside example/.
  watchFolders: [root],
  resolver: {
    // Load workspace packages from src/ (see "exports" in packages/*/package.json),
    // so changes show up on reload without rebuilding lib/.
    unstable_conditionNames: [
      '@ergometer/source',
      ...defaultConfig.resolver.unstable_conditionNames,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
