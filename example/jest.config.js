module.exports = {
  preset: '@react-native/jest-preset',
  // pnpm puts packages under node_modules/.pnpm/, so allow that prefix before the preset's list.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native(-community)?)/)',
  ],
  testEnvironmentOptions: {
    // Same as Metro: load workspace packages from src/ instead of the built lib/.
    customExportConditions: ['@ergometer/source', 'require', 'react-native'],
  },
};
