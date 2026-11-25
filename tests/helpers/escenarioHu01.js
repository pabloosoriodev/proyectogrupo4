'use strict';

/**
 * Arma un escenario del contrato HU-01: una web VTEX falsa por comercio, el archivo de
 * configuración de comercios (`COMERCIOS_CONFIG_PATH`), un archivo de DLQ propio
 * (`SCRAPING_DLQ_LOCAL_PATH`) y el resto de las variables del contrato. Luego ejecuta
 * `npm run scrape:local` las veces que la prueba necesite.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  COMERCIOS,
  VARIABLES,
  MAX_INTENTOS_INICIAL,
  MAX_RESULTADOS_INICIAL,
  BASE_DE_PRUEBAS,
} = require('../fixtures/hu01/contratoHu01');
const { iniciarWebVtex } = require('./servidorVtexFalso');
const { ejecutarScrapeLocal } = require('./scrapeLocal');

const USER_AGENT_DE_PRUEBA = 'ComparadorPruebasHU01/1.0 (+tester)';
const TIMEOUT_PETICION_MS = 3000;
// Límite alto por defecto para que las pruebas que no son del caso D2 no tarden.
const LIMITE_POR_DEFECTO = 50;

/** Valor para `maxResultadosPorBusqueda` que deja el campo fuera del JSON (caso E2). */
const OMITIR = Symbol('omitir');

/**
 * Contenido del archivo de `COMERCIOS_CONFIG_PATH`, con el formato de la sección "Formato del JSON
 * de `COMERCIOS_CONFIG_PATH`" del contrato (v5, decisión 26; v6, decisión 30). `url` va sin `/`
 * final.
 */
function contenidoConfiguracion(comercios, busquedas, maxResultadosPorBusqueda) {
  const contenido = { comercios, busquedas };
  if (maxResultadosPorBusqueda !== OMITIR) {
    contenido.maxResultadosPorBusqueda = maxResultadosPorBusqueda;
  }
  return contenido;
}

function archivoTemporal(prefijo, extension) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), `hu01-${prefijo}-`));
  return path.join(carpeta, `${prefijo}${extension}`);
}

/**
 * @param {object} opciones
 * @param {Array<{clave: keyof COMERCIOS, activo?: boolean, catalogo?: object, robots?: string,
 *   alBuscar?: Function, limitePeticionesPorSegundo?: number}>} opciones.comercios
 * @param {string[]} opciones.busquedas
 * @param {number} [opciones.maxIntentos]
 * @param {number} [opciones.timeoutMs]
 * @param {string} [opciones.userAgent]
 * @param {*} [opciones.maxResultadosPorBusqueda] valor tal cual en el JSON, u `OMITIR`
 */
async function prepararEscenario({
  comercios,
  busquedas,
  maxResultadosPorBusqueda = MAX_RESULTADOS_INICIAL,
  maxIntentos = MAX_INTENTOS_INICIAL,
  timeoutMs = TIMEOUT_PETICION_MS,
  userAgent = USER_AGENT_DE_PRUEBA,
}) {
  const webs = {};
  const configurados = [];
  for (const definicion of comercios) {
    const { slug, nombre } = COMERCIOS[definicion.clave];
    const web = await iniciarWebVtex({
      catalogo: definicion.catalogo,
      robots: definicion.robots,
      alBuscar: definicion.alBuscar,
      alPedirRobots: definicion.alPedirRobots,
    });
    webs[slug] = web;
    configurados.push({
      slug,
      nombre,
      activo: definicion.activo ?? true,
      url: web.url,
      tipo: definicion.tipo ?? 'json',
      limitePeticionesPorSegundo: definicion.limitePeticionesPorSegundo ?? LIMITE_POR_DEFECTO,
    });
  }

  const rutaConfig = archivoTemporal('comercios', '.json');
  fs.writeFileSync(
    rutaConfig,
    JSON.stringify(
      contenidoConfiguracion(configurados, busquedas, maxResultadosPorBusqueda),
      null,
      2,
    ),
    'utf8',
  );
  const rutaDlq = archivoTemporal('dlq', '.jsonl');

  const entornoBase = {
    DB_NAME: BASE_DE_PRUEBAS, // decisión 29
    [VARIABLES.config]: rutaConfig,
    [VARIABLES.maxIntentos]: String(maxIntentos),
    [VARIABLES.timeout]: String(timeoutMs),
    [VARIABLES.userAgent]: userAgent,
    [VARIABLES.dlq]: rutaDlq,
  };

  return {
    webs,
    configurados,
    rutaConfig,
    rutaDlq,
    userAgent,
    entornoBase,
    /** Ejecuta `npm run scrape:local` con el entorno del escenario. */
    ejecutar: ({ entorno = {}, quitar = [] } = {}) =>
      ejecutarScrapeLocal({ entorno: { ...entornoBase, ...entorno }, quitar }),
    /** Entradas de la DLQ local (JSON Lines). Una línea que no es JSON se devuelve como texto. */
    dlq() {
      if (!fs.existsSync(rutaDlq)) return [];
      return fs
        .readFileSync(rutaDlq, 'utf8')
        .split(/\r?\n/)
        .filter((linea) => linea.trim())
        .map((linea) => {
          try {
            return JSON.parse(linea);
          } catch {
            return linea;
          }
        });
    },
    async cerrar() {
      await Promise.all(Object.values(webs).map((web) => web.cerrar()));
      for (const ruta of [rutaConfig, rutaDlq]) {
        fs.rmSync(path.dirname(ruta), { recursive: true, force: true });
      }
    },
  };
}

module.exports = { prepararEscenario, OMITIR, USER_AGENT_DE_PRUEBA, TIMEOUT_PETICION_MS };
