'use strict';

/**
 * Nombres y valores tomados textualmente de `contratos/CONTRATO-HU-01.md` (v4, Aprobado).
 * Las pruebas comparan contra estos valores; no se ajustan al código.
 */

// Interfaz observable 1: el comando
const COMANDO_SCRAPE = 'scrape:local';

// Nombres que no se negocian: tablas
const TABLA_COMERCIO = 'comercio';
const TABLA_PUBLICACION = 'publicacion';

// Slugs / nombres
const COMERCIOS = Object.freeze({
  wong: Object.freeze({ slug: 'wong', nombre: 'Wong' }),
  plazaVea: Object.freeze({ slug: 'plaza-vea', nombre: 'Plaza Vea' }),
  metro: Object.freeze({ slug: 'metro', nombre: 'Metro' }),
});
const SLUGS = Object.freeze(Object.values(COMERCIOS).map(({ slug }) => slug));

// Variables
const VARIABLES = Object.freeze({
  config: 'COMERCIOS_CONFIG_PATH',
  maxIntentos: 'SCRAPING_MAX_INTENTOS',
  timeout: 'SCRAPING_TIMEOUT_MS',
  userAgent: 'SCRAPING_USER_AGENT',
  dlq: 'SCRAPING_DLQ_LOCAL_PATH',
});
const MAX_INTENTOS_INICIAL = 3;

// Campo de la raíz del JSON de comercios (v6, decisión 30): tope de posiciones por término.
const CAMPO_MAX_RESULTADOS = 'maxResultadosPorBusqueda';
const MAX_RESULTADOS_INICIAL = 100;
const TAMANO_PAGINA = 50; // "Paginación de la búsqueda": _from/_to de 50 en 50

// Endpoint consultado (formato VTEX)
const RUTA_BUSQUEDA_VTEX = '/api/catalog_system/pub/products/search';
const PARAMETRO_TEXTO = 'ft';
const RUTA_ROBOTS = '/robots.txt';

// Campos de la DLQ y de los logs
const CAMPOS_DLQ = Object.freeze(['comercio', 'url', 'motivo']);
const CAMPOS_LOG_SIEMPRE = Object.freeze(['level', 'message', 'ejecucionId']);
const CAMPO_LOG_COMERCIO = 'comercio';
const MENSAJE_FINAL = 'Actualización diaria terminada';
const NIVEL_INFO = 'info';
const NIVEL_ERROR = 'error';
const NIVEL_WARN = 'warn'; // B11 (decisión 27)

// Base de pruebas aparte (v5, decisión 29): se elige pisando DB_NAME. Nunca comparador_dev.
const BASE_DE_PRUEBAS = 'comparador_test';

// Sección F: términos iniciales (decisión 19)
const BUSQUEDAS_INICIALES = Object.freeze(['leche', 'arroz', 'azúcar', 'atún', 'aceite']);

module.exports = {
  COMANDO_SCRAPE,
  TABLA_COMERCIO,
  TABLA_PUBLICACION,
  COMERCIOS,
  SLUGS,
  VARIABLES,
  MAX_INTENTOS_INICIAL,
  CAMPO_MAX_RESULTADOS,
  MAX_RESULTADOS_INICIAL,
  TAMANO_PAGINA,
  RUTA_BUSQUEDA_VTEX,
  PARAMETRO_TEXTO,
  RUTA_ROBOTS,
  CAMPOS_DLQ,
  CAMPOS_LOG_SIEMPRE,
  CAMPO_LOG_COMERCIO,
  MENSAJE_FINAL,
  NIVEL_INFO,
  NIVEL_ERROR,
  NIVEL_WARN,
  BASE_DE_PRUEBAS,
  BUSQUEDAS_INICIALES,
};
