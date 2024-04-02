/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  maxWorkers: 5,
  globalSetup: '<rootDir>/src/tests/setup.ts',
  setupFilesAfterEnv: ['jest-extended/all'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testRegex: ['.*\\.spec\\.ts$', '.*\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  verbose: false,
  collectCoverageFrom: ['src/app/**/*.(t|j)s', 'src/modules/**/*.{!(gateway),}.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
};
