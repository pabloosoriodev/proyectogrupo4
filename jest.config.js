'use strict';

/**
 * Configuración de Jest del monorepo (dueño: TESTER).
 *
 * Proyectos:
 *  - unit:        pruebas sin base de datos real (Node).
 *  - web:         pruebas de la página `/` de la web (jsdom + fetch).
 *  - integration: pruebas contra la API levantada con `npm run dev:api` y el PostgreSQL local.
 *
 * Scripts sugeridos para el package.json raíz (DEV):
 *   "test":             "jest --selectProjects unit web"
 *   "test:integration": "jest --selectProjects integration"
 *
 * Dependencias que necesita (las instala el DEV como devDependencies):
 *   jest, jest-environment-jsdom, babel-jest, @babel/preset-env, @babel/preset-react,
 *   babel-plugin-transform-vite-meta-env, yaml, ajv
 */

// Babel solo para la web: compila el JSX/ESM del DEV y traduce `import.meta.env.X` a
// `process.env.X`. Se ignora cualquier configuración de Babel del repo para no depender de ella.
const TRANSFORM_WEB = [
  'babel-jest',
  {
    babelrc: false,
    configFile: false,
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
    plugins: ['babel-plugin-transform-vite-meta-env'],
  },
];

module.exports = {
  // Las suites que levantan la API usan el mismo puerto: nunca pueden correr en paralelo.
  maxWorkers: 1,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      transform: {},
    },
    {
      displayName: 'web',
      testEnvironment: '<rootDir>/tests/fixtures/entornoJsdomConFetch.js',
      testMatch: ['<rootDir>/tests/web/**/*.test.js'],
      transform: { '\\.[cm]?jsx?$': TRANSFORM_WEB },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/fixtures/estiloVacio.js',
        '\\.(svg|png|jpe?g|gif|webp|ico)$': '<rootDir>/tests/fixtures/archivoVacio.js',
      },
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      transform: {},
    },
  ],
};
