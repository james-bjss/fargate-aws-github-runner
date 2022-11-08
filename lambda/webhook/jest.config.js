/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

// eslint-disable-next-line
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test_reports',
        outputName: 'jest-junit.xml',
      },
    ],
  ],
  coveragePathIgnorePatterns: ['node_modules'],
};

// eslint-disable-next-line no-undef
process.env = Object.assign(process.env, {
  LOG_LEVEL: 'ERROR', // Set log level to ERROR for tests
});
