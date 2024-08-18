/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  maxWorkers: 1,
  rootDir: 'src',
  globalSetup: '<rootDir>/tests/setups/globalSetup.ts',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/tests/setups/setupAfterEnv.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testRegex: '^(?!.*/-).*\\.(test|spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  verbose: false,
  collectCoverageFrom: ['(app|utils|modules)/**/[^-]*.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
};
