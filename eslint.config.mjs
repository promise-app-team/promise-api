import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import imports from 'eslint-plugin-import'
import jest from 'eslint-plugin-jest'
import jestExtended from 'eslint-plugin-jest-extended'
import jsdoc from 'eslint-plugin-jsdoc'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', '**/-*'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  stylistic.configs['recommended-flat'],

  {
    name: 'jsdoc',
    ...jsdoc.configs['flat/recommended'],
    rules: {
      'jsdoc/no-undefined-types': ['warn'],
    },
  },

  {
    name: 'custom/rules',
    rules: {
      'prefer-const': 'warn',
      'object-shorthand': 'warn',

      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      '@typescript-eslint/no-empty-object-type': ['error', {
        allowInterfaces: 'with-single-extends',
      }],
      '@typescript-eslint/no-namespace': ['off'],
      '@typescript-eslint/no-extraneous-class': ['off'],
    },
  },

  {
    ...imports.flatConfigs.recommended,
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      'import/no-cycle': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-relative-packages': 'warn',
      'import/order': ['error', {
        'alphabetize': {
          caseInsensitive: true,
          orderImportKind: 'asc',
          order: 'asc',
        },
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always',
      }],
    },
  },

  {
    name: 'custom/rules/test',
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/valid-title': ['error', {
        ignoreTypeOfDescribeName: true,
      }],
      'jest/no-conditional-expect': ['off'],
      'jest/expect-expect': ['warn', {
        assertFunctionNames: ['expect', '**.expect'],
      }],
      // 'jest/no-focused-tests': 'warn',
    },
  },
  {
    name: 'custom/rules/test/extended',
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    ...jestExtended.configs['flat/all'],
  },
)
