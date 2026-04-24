module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server-test.js',
    '!node_modules/**',
    '!coverage/**',
    '!server.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
