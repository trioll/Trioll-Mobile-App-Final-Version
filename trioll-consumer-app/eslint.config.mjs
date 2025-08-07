import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Disable console.log warnings (we already cleaned them up)
      'no-console': 'off',

      // Allow any types for now (we'll fix these gradually)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Allow require imports for React Native
      '@typescript-eslint/no-require-imports': 'off',

      // React Native specific
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Allow unescaped entities in JSX
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Test file specific configuration
    files: [
      '**/*.test.{js,ts,jsx,tsx}',
      '**/*.spec.{js,ts,jsx,tsx}',
      '__tests__/**/*',
      'jest.setup.js',
      'jest.config.js',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.mjs',
      'metro.config.js',
      'babel.config.js',
    ],
  },
];
