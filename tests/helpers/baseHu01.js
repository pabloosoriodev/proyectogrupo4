'use strict';

/**
 * Lectura de las tablas `comercio` y `publicacion` (interfaz observable 2 del contrato HU-01) en
 * la base de pruebas `comparador_test` (v5, decisión 29), con el resto de las variables `DB_*` de
 * `.env` / `process.env` (aclaraciones 18–19 del Sprint 0). No crea bases ni tablas.
 */

const { leerDotEnv } = require('./apiLocal');
const {
  TABLA_COMERCIO,
  TABLA_PUBLICACION,
  BASE_DE_PRUEBAS,
} = require('../fixtures/hu01/contratoHu01');

function configuracionBase() {
  const env = { ...leerDotEnv(), ...process.env };
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    // Siempre la base de pruebas: nunca se lee ni se borra comparador_dev (decisión 29).
    database: BASE_DE_PRUEBAS,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: String(env.DB_SSL).toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: Number(env.DB_CONNECT_TIMEOUT_MS || 5000),
  };
}

async function conBase(trabajo) {
  const { Client } = require('pg');
  const cliente = new Client(configuracionBase());
  await cliente.connect();
  try {
    return await trabajo(cliente);
  } finally {
    await cliente.end();
  }
}

/** Nombres de las tablas que faltan de las dos del contrato (vacío = están las dos). */
function tablasHu01Faltantes() {
  return conBase(async (cliente) => {
    const { rows } = await cliente.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = ANY($1)`,
      [[TABLA_COMERCIO, TABLA_PUBLICACION]],
    );
    const existentes = rows.map(({ table_name: nombre }) => nombre);
    return [TABLA_COMERCIO, TABLA_PUBLICACION].filter((tabla) => !existentes.includes(tabla));
  });
}

/** Columnas de una tabla con su tipo, precisión y si admite nulos. */
function columnasDe(tabla) {
  return conBase(async (cliente) => {
    const { rows } = await cliente.query(
      `SELECT column_name AS nombre, data_type AS tipo, numeric_precision AS precision,
              numeric_scale AS escala, is_nullable = 'YES' AS nulo
         FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1`,
      [tabla],
    );
    return rows;
  });
}

/** Fila de `comercio` por slug, o undefined. */
function comercioPorSlug(slug) {
  return conBase(async (cliente) => {
    const { rows } = await cliente.query(
      `SELECT id, slug, nombre, activo FROM ${TABLA_COMERCIO} WHERE slug = $1`,
      [slug],
    );
    return rows[0];
  });
}

/**
 * Filas de `publicacion` de un comercio, ordenadas por url. Los precios se leen como texto para
 * ver exactamente los 2 decimales guardados.
 */
function publicacionesDe(slug) {
  return conBase(async (cliente) => {
    const { rows } = await cliente.query(
      `SELECT p.id, p.comercio_id, p.grupo_id, p.nombre_original, p.marca, p.categoria_origen,
              p.url, p.precio_regular::text AS precio_regular,
              p.precio_oferta::text AS precio_oferta, p.fecha_captura
         FROM ${TABLA_PUBLICACION} p
         JOIN ${TABLA_COMERCIO} c ON c.id = p.comercio_id
        WHERE c.slug = $1
        ORDER BY p.url`,
      [slug],
    );
    return rows;
  });
}

/**
 * Deja la base sin filas de esos comercios (ni las suyas de `publicacion`), para que cada prueba
 * parta de un estado conocido. Solo toca los slugs que se le pasan.
 */
function borrarDatosDe(slugs) {
  return conBase(async (cliente) => {
    const { rows } = await cliente.query('SELECT current_database() AS base');
    if (rows[0].base !== BASE_DE_PRUEBAS) {
      throw new Error(
        `Se negó a borrar: la conexión apunta a ${rows[0].base}, no a ${BASE_DE_PRUEBAS}`,
      );
    }
    await cliente.query('BEGIN');
    try {
      await cliente.query(
        `DELETE FROM ${TABLA_PUBLICACION}
          WHERE comercio_id IN (SELECT id FROM ${TABLA_COMERCIO} WHERE slug = ANY($1))`,
        [slugs],
      );
      await cliente.query(`DELETE FROM ${TABLA_COMERCIO} WHERE slug = ANY($1)`, [slugs]);
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    }
  });
}

module.exports = {
  tablasHu01Faltantes,
  columnasDe,
  comercioPorSlug,
  publicacionesDe,
  borrarDatosDe,
};
