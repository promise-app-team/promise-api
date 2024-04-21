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
  testRegex: ['^(?!.*/_).*\\.test\\.ts$', '^(?!.*/_)..*\\.spec\\.ts$', '^(?!.*/_)..*\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tests/tsconfig.json',
      },
    ],
  },
  verbose: false,
  collectCoverageFrom: ['app/**/[^_]*.(t|j)s', 'modules/**/[^_]*.{!(gateway),}.(t|j)s', 'utils/**/[^_]*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
};
