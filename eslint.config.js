const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '.aws-sam/**',
      'infra/dist/**',
      'web/dist/**',
      'coverage/**',
      'docs/**',
      'dashboard/**',
      '.claude/**',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  {
    // Node en CommonJS: package.json raíz, api, shared, scraper, db, infra (aclaración 13).
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    // Web: ES Modules dentro de Vite (aclaración 13).
    files: ['web/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },
  {
    files: ['web/vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Pruebas (Jest + Babel): pueden usar import o require.
    files: ['tests/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser, ...globals.jest },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
    },
  },
  prettier,
];
