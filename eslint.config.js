// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    ignores: [
      'node_modules/*',
      '.github/*',
      'functions/*',
      'lib/*',
    ],
  },
  {
    settings: {
      'env': {
        'browser': false,
        'node': true,
      },
      'import/resolver': {
        'node': {
          'extensions': [
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
          ],
        },
      },
      'settings': {
        'jsdoc': {
          'tagNamePreference': {
            'returns': 'return',
          },
        },
      },
    },
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        jsDocParsingMode: 'type-info',
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: './',
        ecmaFeatures: {
          modules: true,
          spread: true,
          restParams: true,
          defaultParams: true,
        },
      },
    },
    files: [
      'src/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'off',
      ],
      'max-len': [
        'error',
        {
          'code': 200,
          'ignoreComments': true,
          'ignoreUrls': true,
        },
      ],
      'no-mixed-spaces-and-tabs': 'error',
      'prefer-const': 'off',
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/no-namespace': ['off'],
      '@typescript-eslint/no-unused-vars': ['off'],
    },
  },
);
