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
    // Packages compiled from src/ import Babel helpers that pnpm installs only here.
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    // Load workspace packages from src/ instead of the built lib/.
    unstable_conditionNames: [
      '@ergometer/source',
      ...defaultConfig.resolver.unstable_conditionNames,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
