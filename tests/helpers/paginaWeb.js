'use strict';

/**
 * Abre páginas de la web en jsdom como lo haría el navegador, sin importar componentes del DEV por
 * su nombre: monta `web/index.html` (aclaración 12), navega a la ruta pedida y ejecuta el script de
 * módulo de entrada que esa página declara. La API llega por `VITE_API_URL`.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { RAIZ_REPO, RUTA_SALUD } = require('../fixtures/contrato');
const { HOST_LOCAL } = require('../fixtures/red');

const RAIZ_WEB = path.join(RAIZ_REPO, 'web');
const ESPERA_TEXTO_MS = 5000;

const CABECERAS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

/** API falsa: responde `status`/`cuerpo` en GET /v1/health, 404 en cualquier otra ruta. */
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

/** Registra cada URL que la página pide por `fetch` o `XMLHttpRequest`. */
function espiarRed() {
  const urls = [];
  const fetchOriginal = window.fetch;
  const abrirOriginal = window.XMLHttpRequest.prototype.open;

  window.fetch = (entrada, opciones) => {
    urls.push(
      String(entrada && typeof entrada === 'object' && 'url' in entrada ? entrada.url : entrada),
    );
    return fetchOriginal(entrada, opciones);
  };
  window.XMLHttpRequest.prototype.open = function abrir(metodo, url, ...resto) {
    urls.push(String(url));
    return abrirOriginal.call(this, metodo, url, ...resto);
  };

  return {
    urls,
    rutas: () => urls.map((url) => new URL(url, window.location.href).pathname),
    restaurar() {
      window.fetch = fetchOriginal;
      window.XMLHttpRequest.prototype.open = abrirOriginal;
    },
  };
}

/** Navega a `ruta`, monta el HTML de `web/index.html` y ejecuta su script de entrada. */
function abrirPagina(ruta) {
  const html = fs.readFileSync(path.join(RAIZ_WEB, 'index.html'), 'utf8');
  const pagina = new DOMParser().parseFromString(html, 'text/html');
  const script = pagina.querySelector('script[type="module"][src]');
  if (!script)
    throw new Error('web/index.html no declara un <script type="module" src="..."> de entrada');

  window.history.pushState({}, '', ruta);
  pagina.querySelectorAll('script').forEach((nodo) => nodo.remove());
  document.head.innerHTML = pagina.head.innerHTML;
  document.body.innerHTML = pagina.body.innerHTML;

  const entrada = path.join(RAIZ_WEB, script.getAttribute('src').replace(/^\//, ''));
  jest.isolateModules(() => {
    require(entrada);
  });
}

function cerrarPagina() {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
}

/** Texto visible con los espacios normalizados (incluye espacios no separables). */
function normalizar(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textoDe(elemento = document.body) {
  return normalizar(elemento.textContent);
}

/**
 * Como `textoDe`, pero separa con un espacio el texto de cada nodo: `textContent` pega elementos
 * vecinos (`Gloria` + `400 g` → `Gloria400 g`) aunque en pantalla se vean separados.
 */
function textoPorNodos(elemento) {
  const recorrido = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
  const partes = [];
  while (recorrido.nextNode()) partes.push(recorrido.currentNode.nodeValue);
  return normalizar(partes.join(' '));
}

async function esperarCondicion(condicion, timeoutMs = ESPERA_TEXTO_MS) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    if (condicion()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return condicion();
}

function esperarTexto(texto) {
  return esperarCondicion(() => textoDe().includes(texto));
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  iniciarApiFalsa,
  espiarRed,
  abrirPagina,
  cerrarPagina,
  normalizar,
  textoDe,
  textoPorNodos,
  esperarCondicion,
  esperarTexto,
  esperar,
};
