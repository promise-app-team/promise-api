/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,

  env: {
    node: true,
  },

  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.*.json',
    sourceType: 'module',
  },

  ignorePatterns: ['node_modules', 'dist', '-*'],

  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:deprecation/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],

  plugins: ['@typescript-eslint/eslint-plugin', 'prettier', 'import', 'jsdoc'],

  rules: {
    'prettier/prettier': ['warn'],

    'prefer-const': 'warn',
    'object-shorthand': 'warn',

    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          Function: false,
        },
      },
    ],

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
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
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

  overrides: [
    {
      env: { jest: true },
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
      extends: ['plugin:jest/style', 'plugin:jest/recommended', 'plugin:jest-extended/all'],
      plugins: ['jest', 'jest-extended'],
      rules: {
        'jest/valid-title': 'off',
        'jest/no-conditional-expect': 'off',
        'jest/expect-expect': [
          'warn',
          {
            assertFunctionNames: ['expect', '**.expect'],
          },
        ],
        'jest/no-focused-tests': 'warn',
      },
    },
  ],
};
