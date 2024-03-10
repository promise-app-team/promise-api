/** @type {import('jest').Config}  */
module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts', 'json'],
  rootDir: 'src',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['app/**/*.{!(module),}.(t|j)s', 'modules/**/*.{!(module|gateway),}.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
