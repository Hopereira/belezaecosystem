/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/seeders/**',
    '!src/models/index.js',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches:   40,
      functions:  50,
      lines:      50,
    },
  },
  testTimeout: 15000,
  setupFiles: ['./tests/setup.js'],
  // Display names for cleaner output
  verbose: true,
};
