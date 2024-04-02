/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,

  env: {
    node: true,
    jest: true,
  },

  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.*.json',
    sourceType: 'module',
  },

  ignorePatterns: ['node_modules', 'dist', '_*'],

  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:deprecation/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jest-extended/all',
    'prettier',
  ],

  plugins: ['@typescript-eslint/eslint-plugin', 'prettier', 'import', 'jsdoc', 'jest-extended'],

  rules: {
    'prettier/prettier': ['warn'],

    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    'jsdoc/no-undefined-types': 'warn',
    'no-restricted-imports': [
      'error',
      {
        patterns: ['**/*/_*'],
      },
    ],
    'import/order': [
      'warn',
      {
        alphabetize: {
          caseInsensitive: true,
          orderImportKind: 'asc',
          order: 'asc',
        },
        'newlines-between': 'always',
      },
    ],
    'import/no-relative-packages': 'warn',
    'import/newline-after-import': 'warn',
  },

  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
};
