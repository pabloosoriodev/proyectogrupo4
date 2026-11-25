// npm run build:scraper — empaqueta las Lambdas de HU-01 (orquestador y scraper) con esbuild antes
// de `sam build`, igual que build:api: el resultado va a infra/dist/scraper (CodeUri de ambas).
// El AWS SDK v3 queda fuera del paquete: lo trae el runtime nodejs22.x de Lambda.
const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const HANDLERS_DIR = path.join(ROOT_DIR, 'scraper', 'src', 'handlers');
const OUT_DIR = path.join(ROOT_DIR, 'infra', 'dist', 'scraper');

const FUNCTION_MANIFEST = {
  name: 'scraper-functions',
  version: '0.1.0',
  private: true,
};

async function main() {
  try {
    await fs.rm(OUT_DIR, { recursive: true, force: true });
    await esbuild.build({
      entryPoints: [
        path.join(HANDLERS_DIR, 'orquestador.js'),
        path.join(HANDLERS_DIR, 'scraper.js'),
      ],
      outdir: OUT_DIR,
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      external: ['pg-native', '@aws-sdk/*'],
      logLevel: 'warning',
    });
    await fs.writeFile(
      path.join(OUT_DIR, 'package.json'),
      `${JSON.stringify(FUNCTION_MANIFEST, null, 2)}\n`,
    );
    console.info(
      JSON.stringify({
        level: 'info',
        message: 'Lambdas de scraping empaquetadas',
        outDir: path.relative(ROOT_DIR, OUT_DIR),
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Falló el empaquetado de las Lambdas de scraping',
        error: error.message,
      }),
    );
    process.exitCode = 1;
  }
}

main();
