'use strict';

/** Utilidades comunes de las suites de integración de HU-01. */

const { SLUGS, MENSAJE_FINAL, BASE_DE_PRUEBAS } = require('../fixtures/hu01/contratoHu01');
const { tablasHu01Faltantes, borrarDatosDe } = require('./baseHu01');

/**
 * Corta la suite con un mensaje claro si `comparador_test` no existe o no tiene la migración del
 * DEV: esas pruebas quedan NO EJECUTADAS (encargo, punto 4; decisión 29). El TESTER no crea bases
 * ni tablas.
 */
async function exigirTablasHu01() {
  let faltantes;
  try {
    faltantes = await tablasHu01Faltantes();
  } catch (error) {
    throw new Error(
      `NO EJECUTADA: no se pudo usar la base de pruebas ${BASE_DE_PRUEBAS} (${error.message}). ` +
        'La crea y la migra el humano (decisión 29).',
    );
  }
  if (faltantes.length) {
    throw new Error(
      `NO EJECUTADA: faltan las tablas ${faltantes.join(', ')} en ${BASE_DE_PRUEBAS} ` +
        '(la migración de HU-01 no está aplicada ahí).',
    );
  }
}

/** Ninguna fila de los comercios del contrato en `comercio` ni en `publicacion`. */
function partirDeBaseLimpia() {
  return borrarDatosDe([...SLUGS]);
}

/** Logs con `message` = "Actualización diaria terminada" (decisión 12). */
function logsFinales(logs) {
  return logs.filter((log) => log.message === MENSAJE_FINAL);
}

/** URL sin la barra final, para comparar la URL base de la web. */
function sinBarraFinal(url) {
  return String(url).replace(/\/+$/, '');
}

/** Lo que una fila de `publicacion` debe conservar intacto (B4, B9, C5, C6). */
function huella(fila) {
  return {
    id: fila.id,
    nombre_original: fila.nombre_original,
    marca: fila.marca,
    categoria_origen: fila.categoria_origen,
    url: fila.url,
    precio_regular: fila.precio_regular,
    precio_oferta: fila.precio_oferta,
    fecha_captura: new Date(fila.fecha_captura).toISOString(),
  };
}

module.exports = { exigirTablasHu01, partirDeBaseLimpia, logsFinales, sinBarraFinal, huella };
