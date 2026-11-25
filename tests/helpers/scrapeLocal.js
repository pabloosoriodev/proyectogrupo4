'use strict';

/**
 * Ejecuta `npm run scrape:local` (interfaz observable 1 del contrato HU-01) y espera a que termine.
 * No importa nada del código del DEV: solo el comando, su código de salida y su salida.
 *
 * Entorno del proceso: `.env` (si existe) < `process.env` < `entorno` de la prueba. Las claves de
 * `quitar` se eliminan del entorno resultante.
 */

const { spawn, spawnSync } = require('child_process');
const { RAIZ_REPO } = require('../fixtures/contrato');
const { COMANDO_SCRAPE } = require('../fixtures/hu01/contratoHu01');
const { leerDotEnv, registrosJson } = require('./apiLocal');

const ES_WINDOWS = process.platform === 'win32';
const ESPERA_SCRAPE_MS = Number(process.env.TEST_SCRAPE_TIMEOUT_MS || 120000);

// Líneas que escribe npm, no el programa: no son logs del scraper.
const LINEA_DE_NPM = /^(>|npm (warn|notice|error|ERR!)\b)/;

/**
 * @param {{entorno?: Record<string,string>, quitar?: string[]}} opciones
 * @returns {Promise<{codigo: number, lineas: string[], logs: object[], lineasNoJson: string[],
 *   duracionMs: number}>}
 */
function ejecutarScrapeLocal({ entorno = {}, quitar = [] } = {}) {
  const env = { ...leerDotEnv(), ...process.env, ...entorno };
  for (const clave of quitar) delete env[clave];

  const inicio = Date.now();
  const lineas = [];
  let resto = '';

  // Igual que en apiLocal: en Windows `npm` es un .cmd; se pasa como una sola cadena fija.
  const proceso = spawn(
    ES_WINDOWS ? `npm run ${COMANDO_SCRAPE}` : 'npm',
    ES_WINDOWS ? [] : ['run', COMANDO_SCRAPE],
    { cwd: RAIZ_REPO, env, shell: ES_WINDOWS, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const alRecibir = (fragmento) => {
    const partes = (resto + fragmento.toString('utf8')).split(/\r?\n/);
    resto = partes.pop();
    lineas.push(...partes);
  };
  proceso.stdout.on('data', alRecibir);
  proceso.stderr.on('data', alRecibir);

  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => {
      if (ES_WINDOWS) {
        spawnSync('taskkill', ['/pid', String(proceso.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        proceso.kill('SIGKILL');
      }
      reject(
        new Error(
          `\`npm run ${COMANDO_SCRAPE}\` no terminó en ${ESPERA_SCRAPE_MS} ms. Salida:\n${lineas.join('\n')}`,
        ),
      );
    }, ESPERA_SCRAPE_MS);

    proceso.once('error', (error) => {
      clearTimeout(limite);
      reject(error);
    });
    proceso.once('close', (codigo) => {
      clearTimeout(limite);
      if (resto) lineas.push(resto);
      const delPrograma = lineas.filter(
        (linea) => linea.trim() && !LINEA_DE_NPM.test(linea.trim()),
      );
      resolve({
        codigo: codigo === null ? -1 : codigo,
        lineas,
        logs: registrosJson(delPrograma),
        lineasNoJson: delPrograma.filter((linea) => {
          try {
            const valor = JSON.parse(linea.trim());
            return valor === null || typeof valor !== 'object' || Array.isArray(valor);
          } catch {
            return true;
          }
        }),
        duracionMs: Date.now() - inicio,
      });
    });
  });
}

/** Resumen legible de una ejecución para los mensajes de error. */
function describirEjecucion({ codigo, lineas }) {
  return `código ${codigo}; salida:\n${lineas.join('\n')}`;
}

module.exports = { ejecutarScrapeLocal, describirEjecucion };
