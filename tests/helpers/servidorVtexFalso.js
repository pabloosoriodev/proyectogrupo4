'use strict';

/**
 * Web de comercio falsa con el catálogo público VTEX del contrato HU-01 (v5, "Paginación de la
 * búsqueda", decisión 26):
 *   GET /api/catalog_system/pub/products/search?ft=<término>&_from=<i>&_to=<j>
 *   GET /robots.txt
 *
 * Paginación como VTEX: `_from`/`_to` con índices inclusivos; sin ellos, 0–9; un rango de más de
 * `TAMANO_MAXIMO_PAGINA` (50) resultados responde 400. Las respuestas de búsqueda son
 * `206 application/json` con la cabecera `resources: <from>-<to>/<total>`. Lo que el contrato no
 * fija (rango por defecto, 400, cabecera `resources`) imita a VTEX y es compatible con la v5.
 *
 * Registra cada petición (ruta, query, User-Agent e instante) para que las pruebas puedan contar
 * intentos, rutas pedidas y el ritmo de peticiones. Nunca sale a internet.
 */

const http = require('http');
const { HOST_LOCAL } = require('../fixtures/red');
const {
  RUTA_BUSQUEDA_VTEX,
  RUTA_ROBOTS,
  PARAMETRO_TEXTO,
} = require('../fixtures/hu01/contratoHu01');

const TAMANO_PAGINA_POR_DEFECTO = 10;
const TAMANO_MAXIMO_PAGINA = 50;
const ROBOTS_PERMITE_TODO = 'User-agent: *\nAllow: /\n';

function ahoraMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function rangoPedido(query) {
  const tieneRango = query.has('_from') || query.has('_to');
  const desde = tieneRango ? Number(query.get('_from') || 0) : 0;
  const hasta = tieneRango
    ? Number(query.get('_to') ?? desde + TAMANO_PAGINA_POR_DEFECTO - 1)
    : TAMANO_PAGINA_POR_DEFECTO - 1;
  const valido =
    Number.isInteger(desde) &&
    Number.isInteger(hasta) &&
    desde >= 0 &&
    hasta >= desde &&
    hasta - desde + 1 <= TAMANO_MAXIMO_PAGINA;
  return { desde, hasta, valido };
}

/**
 * @param {object} opciones
 * @param {Record<string, object[]>} [opciones.catalogo] productos VTEX por término de búsqueda
 * @param {string} [opciones.robots] contenido de /robots.txt
 * @param {(busqueda: {termino: string, desde: number, hasta: number, numero: number}) =>
 *   ({status?: number, cuerpo?: string, colgar?: boolean} | null | undefined)} [opciones.alBuscar]
 *   permite forzar fallos: devuelve un status/cuerpo propio, o `colgar` para no responder nunca.
 * @param {() => ({status?: number, colgar?: boolean} | null | undefined)} [opciones.alPedirRobots]
 *   lo mismo para /robots.txt (casos D1c y D1d).
 */
function iniciarWebVtex({
  catalogo = {},
  robots = ROBOTS_PERMITE_TODO,
  alBuscar,
  alPedirRobots,
} = {}) {
  const peticiones = [];
  const colgadas = new Set();
  let numeroBusqueda = 0;
  let catalogoActual = catalogo;
  let urlBase;

  function resolverLinks(productos) {
    return productos.map((producto) => ({
      ...producto,
      link: producto.link.startsWith('/') ? `${urlBase}${producto.link}` : producto.link,
    }));
  }

  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://web');
    peticiones.push({
      metodo: req.method,
      ruta: url.pathname,
      query: Object.fromEntries(url.searchParams),
      userAgent: req.headers['user-agent'],
      instanteMs: ahoraMs(),
    });

    if (req.method === 'GET' && url.pathname === RUTA_ROBOTS) {
      const forzado = alPedirRobots && alPedirRobots();
      if (forzado && forzado.colgar) {
        colgadas.add(res);
        return;
      }
      if (forzado && forzado.status) {
        res.writeHead(forzado.status, { 'Content-Type': 'text/plain' }).end('estado forzado');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(robots);
      return;
    }

    if (req.method === 'GET' && url.pathname === RUTA_BUSQUEDA_VTEX) {
      numeroBusqueda += 1;
      const termino = url.searchParams.get(PARAMETRO_TEXTO) || '';
      const { desde, hasta, valido } = rangoPedido(url.searchParams);
      const forzado = alBuscar && alBuscar({ termino, desde, hasta, numero: numeroBusqueda });
      if (forzado && forzado.colgar) {
        colgadas.add(res);
        return;
      }
      if (forzado && forzado.status) {
        res
          .writeHead(forzado.status, { 'Content-Type': 'application/json' })
          .end(forzado.cuerpo ?? JSON.stringify({ error: `estado forzado ${forzado.status}` }));
        return;
      }
      if (!valido) {
        res
          .writeHead(400, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: `rango inválido _from=${desde} _to=${hasta}` }));
        return;
      }
      const todos = resolverLinks(catalogoActual[termino] || []);
      const pagina = todos.slice(desde, hasta + 1);
      res
        .writeHead(206, {
          'Content-Type': 'application/json; charset=utf-8',
          resources: `${desde}-${hasta}/${todos.length}`,
        })
        .end(JSON.stringify(pagina));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('no existe');
  });

  return new Promise((resolve) => {
    servidor.listen(0, HOST_LOCAL, () => {
      urlBase = `http://${HOST_LOCAL}:${servidor.address().port}`;
      resolve({
        url: urlBase,
        peticiones,
        /** Peticiones al endpoint de búsqueda VTEX. */
        busquedas: () => peticiones.filter(({ ruta }) => ruta === RUTA_BUSQUEDA_VTEX),
        /** Peticiones a /robots.txt. */
        pedidosDeRobots: () => peticiones.filter(({ ruta }) => ruta === RUTA_ROBOTS),
        /** Cambia el catálogo entre una ejecución y la siguiente (B3, B4, C5). */
        cambiarCatalogo(nuevo) {
          catalogoActual = nuevo;
        },
        /** Olvida las peticiones registradas y el contador de búsquedas. */
        reiniciarRegistro() {
          peticiones.length = 0;
          numeroBusqueda = 0;
        },
        cerrar: () =>
          new Promise((fin) => {
            colgadas.forEach((res) => res.destroy());
            servidor.closeAllConnections?.();
            servidor.close(() => fin());
          }),
      });
    });
  });
}

module.exports = {
  iniciarWebVtex,
  TAMANO_PAGINA_POR_DEFECTO,
  TAMANO_MAXIMO_PAGINA,
  ROBOTS_PERMITE_TODO,
};
