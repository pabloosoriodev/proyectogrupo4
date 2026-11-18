// npm run build:api — empaqueta la Lambda de salud con esbuild antes de `sam build`.
// El resultado (handler + shared/ + pg + dotenv en un solo archivo) va a infra/dist/api, que es el
// CodeUri de la función. Así `sam build` no ejecuta npm sobre el monorepo: su paso NpmUpdate
// podaba node_modules con npm 10 (Node 22).
const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const ENTRY_POINT = path.join(ROOT_DIR, 'api', 'src', 'handlers', 'health.js');
const OUT_DIR = path.join(ROOT_DIR, 'infra', 'dist', 'api');

// package.json sin dependencias: el builder de Node de SAM lo exige, pero no tiene nada que instalar.
const FUNCTION_MANIFEST = {
  name: 'health-function',
  version: '0.1.0',
  private: true,
  main: 'health.js',
};

async function main() {
  try {
    await fs.rm(OUT_DIR, { recursive: true, force: true });
    await esbuild.build({
      entryPoints: [ENTRY_POINT],
      outfile: path.join(OUT_DIR, 'health.js'),
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      // Módulo nativo opcional de pg que no se usa.
      external: ['pg-native'],
      logLevel: 'warning',
    });
    await fs.writeFile(
      path.join(OUT_DIR, 'package.json'),
      `${JSON.stringify(FUNCTION_MANIFEST, null, 2)}\n`,
    );
    console.info(
      JSON.stringify({
        level: 'info',
        message: 'Lambda de salud empaquetada',
        outDir: path.relative(ROOT_DIR, OUT_DIR),
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Falló el empaquetado de la Lambda',
        error: error.message,
      }),
    );
    process.exitCode = 1;
  }
}

main();
