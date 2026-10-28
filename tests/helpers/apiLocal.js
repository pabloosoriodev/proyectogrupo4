'use strict';

/**
 * Levanta la API con el comando observable de la DoD (`npm run dev:api`) y la apaga al terminar.
 * No importa nada del código del DEV: solo usa el comando, el puerto de `openapi.yaml` y HTTP.
 *
 * El entorno del proceso es `.env` (si existe) + `process.env` + los valores que pida la prueba,
 * en ese orden de precedencia creciente.
 */

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { RAIZ_REPO, RUTA_SALUD, CAMPOS_LOG, urlBaseApi } = require('../fixtures/contrato');

const ES_WINDOWS = process.platform === 'win32';
const ESPERA_ARRANQUE_MS = Number(process.env.TEST_API_STARTUP_TIMEOUT_MS || 60000);
const ESPERA_PETICION_MS = Number(process.env.TEST_API_REQUEST_TIMEOUT_MS || 15000);
const ESPERA_LOG_MS = 2000;

function leerDotEnv() {
  const ruta = path.join(RAIZ_REPO, '.env');
  if (!fs.existsSync(ruta)) return {};
  const variables = {};
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const coincidencia = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!coincidencia) continue;
    let valor = coincidencia[2];
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    variables[coincidencia[1]] = valor;
  }
  return variables;
}

function destinoApi() {
  const url = new URL(urlBaseApi());
  return { host: url.hostname, port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)) };
}

function puertoEscuchando({ host, port }) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const terminar = (resultado) => {
      socket.destroy();
      resolve(resultado);
    };
    socket.once('connect', () => terminar(true));
    socket.once('error', () => terminar(false));
    socket.setTimeout(1000, () => terminar(false));
  });
}

async function esperarHasta(condicion, timeoutMs, intervaloMs = 250) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    if (await condicion()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
  return condicion();
}

/**
 * @param {Record<string,string>} entornoExtra variables que pisan `.env` y `process.env`.
 * @returns {Promise<{salida: string[], estaVivo: () => boolean, detener: () => Promise<void>}>}
 */
async function iniciarApi(entornoExtra = {}) {
  const destino = destinoApi();
  if (await puertoEscuchando(destino)) {
    throw new Error(
      `Ya hay un proceso escuchando en ${destino.host}:${destino.port}. Detené cualquier ` +
        '`npm run dev:api` antes de correr estas pruebas: el arnés levanta la API con su propia configuración.',
    );
  }

  const salida = [];
  let resto = '';
  let codigoSalida = null;

  const proceso = spawn('npm', ['run', 'dev:api'], {
    cwd: RAIZ_REPO,
    env: { ...leerDotEnv(), ...process.env, ...entornoExtra },
    shell: ES_WINDOWS,
    detached: !ES_WINDOWS,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const alRecibir = (fragmento) => {
    const lineas = (resto + fragmento.toString('utf8')).split(/\r?\n/);
    resto = lineas.pop();
    salida.push(...lineas);
  };
  proceso.stdout.on('data', alRecibir);
  proceso.stderr.on('data', alRecibir);
  proceso.once('exit', (codigo) => {
    if (resto) salida.push(resto);
    resto = '';
    codigoSalida = codigo === null ? -1 : codigo;
  });

  const estaVivo = () => codigoSalida === null;

  async function detener() {
    if (estaVivo()) {
      if (ES_WINDOWS) {
        spawnSync('taskkill', ['/pid', String(proceso.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        try {
          process.kill(-proceso.pid, 'SIGTERM');
        } catch (error) {
          // El grupo de procesos ya terminó.
        }
      }
    }
    await esperarHasta(async () => !(await puertoEscuchando(destino)), 15000);
  }

  const escuchando = await esperarHasta(
    async () => !estaVivo() || (await puertoEscuchando(destino)),
    ESPERA_ARRANQUE_MS,
  );
  if (!estaVivo() || !escuchando) {
    await detener();
    throw new Error(
      `\`npm run dev:api\` no quedó escuchando en ${destino.host}:${destino.port} ` +
        `(código de salida: ${codigoSalida}). Salida:\n${salida.join('\n')}`,
    );
  }

  return { salida, estaVivo, detener };
}

/** GET /v1/health con un límite de tiempo; nunca deja la prueba colgada. */
async function pedirSalud() {
  const inicio = Date.now();
  const respuesta = await fetch(new URL(RUTA_SALUD, urlBaseApi()), {
    signal: AbortSignal.timeout(ESPERA_PETICION_MS),
  });
  const texto = await respuesta.text();
  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch (error) {
    cuerpo = undefined;
  }
  return {
    status: respuesta.status,
    contentType: respuesta.headers.get('content-type') || '',
    cuerpo,
    texto,
    duracionMs: Date.now() - inicio,
  };
}

function registrosJson(lineas) {
  const registros = [];
  for (const linea of lineas) {
    const recortada = linea.trim();
    if (!recortada.startsWith('{')) continue;
    try {
      registros.push(JSON.parse(recortada));
    } catch (error) {
      // No es una línea JSON completa: no cuenta como log estructurado.
    }
  }
  return registros;
}

function tieneCamposDeLog(registro) {
  return CAMPOS_LOG.every((campo) => {
    const valor = registro[campo];
    return valor !== undefined && valor !== null && String(valor).trim() !== '';
  });
}

/**
 * Espera a que aparezca, desde la línea `desde` de la salida, al menos un log JSON con
 * `level`, `message` y `requestId`. Devuelve los registros JSON nuevos (con o sin esos campos).
 */
async function esperarLogsDesde(api, desde) {
  await esperarHasta(
    () => registrosJson(api.salida.slice(desde)).some(tieneCamposDeLog),
    ESPERA_LOG_MS,
    100,
  );
  return registrosJson(api.salida.slice(desde));
}

module.exports = { iniciarApi, pedirSalud, esperarLogsDesde, tieneCamposDeLog, esperarHasta };
