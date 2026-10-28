'use strict';

/**
 * DoD Sprint 0 — criterio 7 (parte "prueba"): la página `/` muestra `API: ok` cuando la API
 * responde 200 y `API: no disponible` si no.
 *
 * Caja negra sobre la página: se carga `web/index.html` (lo que Vite sirve en `/`), se ejecuta el
 * script de módulo que esa página declara, y la API es un servidor HTTP falso al que la web llega
 * por `VITE_API_URL` (DoD 12). No se importa ningún componente del DEV por su nombre.
 *
 * Given: la API falsa responde 200 / 503 / no existe.
 * When:  se abre la página `/`.
 * Then:  el texto que la DoD dice que se ve.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const {
  RAIZ_REPO,
  RUTA_SALUD,
  CUERPO_SALUD_OK,
  CUERPO_SALUD_DEGRADADA,
  TEXTO_API_OK,
  TEXTO_API_NO_DISPONIBLE,
} = require('../fixtures/contrato');
const { HOST_LOCAL, puertoCerrado } = require('../fixtures/red');

jest.setTimeout(30000);

const RAIZ_WEB = path.join(RAIZ_REPO, 'web');
const ESPERA_TEXTO_MS = 5000;

const CABECERAS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function iniciarApiFalsa(status, cuerpo) {
  const peticiones = [];
  const servidor = http.createServer((req, res) => {
    peticiones.push({ metodo: req.method, ruta: req.url });
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CABECERAS_CORS).end();
      return;
    }
    if (req.method === 'GET' && new URL(req.url, 'http://api').pathname === RUTA_SALUD) {
      res.writeHead(status, { ...CABECERAS_CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cuerpo));
      return;
    }
    res.writeHead(404, CABECERAS_CORS).end();
  });
  return new Promise((resolve) => {
    servidor.listen(0, HOST_LOCAL, () => {
      resolve({
        url: `http://${HOST_LOCAL}:${servidor.address().port}`,
        peticiones,
        cerrar: () => new Promise((fin) => servidor.close(() => fin())),
      });
    });
  });
}

/** Monta el HTML de `web/index.html` y ejecuta su script de entrada, como haría el navegador. */
function abrirPagina() {
  const html = fs.readFileSync(path.join(RAIZ_WEB, 'index.html'), 'utf8');
  const pagina = new DOMParser().parseFromString(html, 'text/html');
  const script = pagina.querySelector('script[type="module"][src]');
  if (!script) throw new Error('web/index.html no declara un <script type="module" src="..."> de entrada');

  pagina.querySelectorAll('script').forEach((nodo) => nodo.remove());
  document.head.innerHTML = pagina.head.innerHTML;
  document.body.innerHTML = pagina.body.innerHTML;

  const entrada = path.join(RAIZ_WEB, script.getAttribute('src').replace(/^\//, ''));
  jest.isolateModules(() => {
    require(entrada);
  });
}

async function esperarTexto(texto) {
  const limite = Date.now() + ESPERA_TEXTO_MS;
  while (Date.now() < limite) {
    if (document.body.textContent.includes(texto)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return document.body.textContent.includes(texto);
}

describe('página / de la web', () => {
  const VITE_API_URL_ORIGINAL = process.env.VITE_API_URL;
  let apiFalsa;

  afterEach(async () => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    if (apiFalsa) await apiFalsa.cerrar();
    apiFalsa = undefined;
  });

  afterAll(() => {
    if (VITE_API_URL_ORIGINAL === undefined) delete process.env.VITE_API_URL;
    else process.env.VITE_API_URL = VITE_API_URL_ORIGINAL;
  });

  test(`[DoD 7] muestra "${TEXTO_API_OK}" cuando GET /v1/health responde 200`, async () => {
    apiFalsa = await iniciarApiFalsa(200, CUERPO_SALUD_OK);
    process.env.VITE_API_URL = apiFalsa.url;

    abrirPagina();

    expect(await esperarTexto(TEXTO_API_OK)).toBe(true);
    expect(document.body.textContent).not.toContain(TEXTO_API_NO_DISPONIBLE);
    expect(apiFalsa.peticiones).toContainEqual({ metodo: 'GET', ruta: expect.stringMatching(/^\/v1\/health(\?|$)/) });
  });

  test(`[DoD 7] muestra "${TEXTO_API_NO_DISPONIBLE}" cuando GET /v1/health responde 503`, async () => {
    apiFalsa = await iniciarApiFalsa(503, CUERPO_SALUD_DEGRADADA);
    process.env.VITE_API_URL = apiFalsa.url;

    abrirPagina();

    expect(await esperarTexto(TEXTO_API_NO_DISPONIBLE)).toBe(true);
    expect(document.body.textContent).not.toContain(TEXTO_API_OK);
  });

  test(`[DoD 7] muestra "${TEXTO_API_NO_DISPONIBLE}" cuando la API no responde`, async () => {
    process.env.VITE_API_URL = `http://${HOST_LOCAL}:${await puertoCerrado()}`;

    abrirPagina();

    expect(await esperarTexto(TEXTO_API_NO_DISPONIBLE)).toBe(true);
    expect(document.body.textContent).not.toContain(TEXTO_API_OK);
  });
});
