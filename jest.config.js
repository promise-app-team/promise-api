/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  maxWorkers: 1,
  globalSetup: '<rootDir>/src/tests/setup.ts',
  setupFilesAfterEnv: ['jest-extended/all'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testRegex: ['^(?!.*/_).*\\.test\\.ts$', '^(?!.*/_)..*\\.spec\\.ts$', '^(?!.*/_)..*\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  verbose: false,
  collectCoverageFrom: [
    'src/app/**/[^_]*.(t|j)s',
    'src/modules/**/[^_]*.{!(gateway),}.(t|j)s',
    'src/utils/**/[^_]*.(t|j)s',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
};
