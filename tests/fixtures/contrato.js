'use strict';

/**
 * Nombres y valores tomados textualmente de `SPRINT0.md` (DoD) y `openapi.yaml`.
 * Las pruebas comparan contra estos valores; no se ajustan al código.
 */

const fs = require('fs');
const path = require('path');

const RAIZ_REPO = path.resolve(__dirname, '..', '..');

// openapi.yaml → paths
const RUTA_SALUD = '/v1/health';

// DoD 5 y 6
const CUERPO_SALUD_OK = Object.freeze({ status: 'ok', db: 'ok' });
const CUERPO_SALUD_DEGRADADA = Object.freeze({ status: 'degraded', db: 'error' });
const STATUS_SALUD_OK = 200;
const STATUS_SALUD_DEGRADADA = 503;
const MARGEN_FALLO_SEGURO_MS = 1000; // "en menos de DB_CONNECT_TIMEOUT_MS + 1 s"

// DoD 7
const TEXTO_API_OK = 'API: ok';
const TEXTO_API_NO_DISPONIBLE = 'API: no disponible';

// DoD 11 + aclaración 15 (requestId distinto en cada invocación)
const CAMPOS_LOG = Object.freeze(['level', 'message', 'requestId']);

// Aclaración 14: Access-Control-Allow-Origin = CORS_ALLOWED_ORIGIN. Se usa un origen propio de la
// prueba (no el de `.env`) para demostrar que el valor sale de la variable y no está fijo.
const ORIGEN_CORS_DE_PRUEBA = 'http://origen-de-prueba.localhost:5173';

// DoD 18–20 + aclaración 23: maquetado estático de "Buscar productos" en /buscar
const RUTA_BUSCAR = '/buscar';
const BUSQUEDA_INICIAL = 'leche';
const TEXTO_BOTON_BUSCAR = 'Buscar';
const ROTULO_SELECTOR_MARCA = 'Marca';
const ROTULO_SELECTOR_CATEGORIA = 'Categoría';
const TEXTO_RESULTADOS = '12 productos encontrados para «leche»';
const MINIMO_TARJETAS = 3;
const FORMATO_PRECIO = /Desde S\/ \d+\.\d{2}(?!\d)/;
const FORMATO_DISPONIBILIDAD = /Disponible en (\d+) comercios/;
const COMERCIOS_MIN = 1;
const COMERCIOS_MAX = 3;
const TEXTO_BOTON_COMPARAR = 'Comparar precios';
const PREFIJO_RUTAS_API = '/v1/';
const RUTA_PRODUCTOS = '/v1/productos';

let openapiCache;

function cargarOpenapi() {
  if (!openapiCache) {
    const YAML = require('yaml');
    openapiCache = YAML.parse(fs.readFileSync(path.join(RAIZ_REPO, 'openapi.yaml'), 'utf8'));
  }
  return openapiCache;
}

/** URL base de la API: `servers[0].url` del contrato, o `TEST_API_URL` si se quiere otra. */
function urlBaseApi() {
  return process.env.TEST_API_URL || cargarOpenapi().servers[0].url;
}

function resolverRef(documento, ref) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((nodo, clave) => nodo[clave], documento);
}

/** Esquema JSON que `openapi.yaml` declara para GET /v1/health con ese status. */
function esquemaRespuestaSalud(status) {
  const openapi = cargarOpenapi();
  const respuesta = openapi.paths[RUTA_SALUD].get.responses[String(status)];
  if (!respuesta)
    throw new Error(`openapi.yaml no declara la respuesta ${status} de ${RUTA_SALUD}`);
  const esquema = respuesta.content['application/json'].schema;
  return esquema.$ref ? resolverRef(openapi, esquema.$ref) : esquema;
}

/** Valida un cuerpo contra el esquema del contrato. Devuelve los errores de Ajv (vacío = válido). */
function erroresContraContrato(status, cuerpo) {
  const Ajv2020 = require('ajv/dist/2020').default;
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const validar = ajv.compile(esquemaRespuestaSalud(status));
  return validar(cuerpo) ? [] : validar.errors;
}

module.exports = {
  RAIZ_REPO,
  RUTA_SALUD,
  CUERPO_SALUD_OK,
  CUERPO_SALUD_DEGRADADA,
  STATUS_SALUD_OK,
  STATUS_SALUD_DEGRADADA,
  MARGEN_FALLO_SEGURO_MS,
  TEXTO_API_OK,
  TEXTO_API_NO_DISPONIBLE,
  CAMPOS_LOG,
  ORIGEN_CORS_DE_PRUEBA,
  RUTA_BUSCAR,
  BUSQUEDA_INICIAL,
  TEXTO_BOTON_BUSCAR,
  ROTULO_SELECTOR_MARCA,
  ROTULO_SELECTOR_CATEGORIA,
  TEXTO_RESULTADOS,
  MINIMO_TARJETAS,
  FORMATO_PRECIO,
  FORMATO_DISPONIBILIDAD,
  COMERCIOS_MIN,
  COMERCIOS_MAX,
  TEXTO_BOTON_COMPARAR,
  PREFIJO_RUTAS_API,
  RUTA_PRODUCTOS,
  urlBaseApi,
  esquemaRespuestaSalud,
  erroresContraContrato,
};
