// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        tsconfigRootDir: __dirname,
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
