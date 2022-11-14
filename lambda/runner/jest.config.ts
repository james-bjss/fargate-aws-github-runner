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
