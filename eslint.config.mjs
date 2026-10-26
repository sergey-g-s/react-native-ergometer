import reactNativeConfig from '@react-native/eslint-config/flat';
import examplePackage from './example/package.json' with { type: 'json' };

// eslint-plugin-ft-flow crashes on ESLint 9, and the repo has no Flow code.
const flowRulesOff = Object.fromEntries(
  reactNativeConfig
    .flatMap(config => Object.keys(config.rules ?? {}))
    .filter(rule => rule.startsWith('ft-flow/'))
    .map(rule => [rule, 'off']),
);

export default [
  {
    ignores: ['**/lib/', 'example/android/', 'example/ios/', 'example/vendor/'],
  },
  ...reactNativeConfig,
  {
    settings: {
      // pnpm installs react only inside example/, so "detect" can't find it from the root.
      react: { version: examplePackage.dependencies.react },
    },
    rules: {
      // BLE protocols pack fields into bits.
      'no-bitwise': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        // Plain JS here is config files and the app entry; no project-wide Babel config to load.
        requireConfigFile: false,
      },
    },
    rules: flowRulesOff,
  },
];
