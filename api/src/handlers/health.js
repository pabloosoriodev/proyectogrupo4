// Lambda de GET /v1/health (contrato en openapi.yaml): ejecuta SELECT 1 contra PostgreSQL.
const { randomUUID } = require('node:crypto');
const shared = require('@proyectogrupo4/shared');

const HEALTH_QUERY = 'SELECT 1';

function createHealthHandler({ getPool, getCorsConfig, logger }) {
  function buildHeaders(requestId) {
    const headers = { 'Content-Type': 'application/json' };
    try {
      headers['Access-Control-Allow-Origin'] = getCorsConfig().allowedOrigin;
    } catch (error) {
      logger.error('No se pudo leer la configuración de CORS', {
        requestId,
        error: logger.serializeError(error),
      });
    }
    return headers;
  }

  return async function handler(event, context) {
    const requestId = context?.awsRequestId ?? event?.requestContext?.requestId ?? randomUUID();
    const headers = buildHeaders(requestId);

    try {
      await getPool().query(HEALTH_QUERY);
      logger.info('Health check: base de datos disponible', { requestId, db: 'ok' });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', db: 'ok' }),
      };
    } catch (error) {
      logger.error('Health check: base de datos no disponible', {
        requestId,
        db: 'error',
        error: logger.serializeError(error),
      });
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ status: 'degraded', db: 'error' }),
      };
    }
  };
}

// El pool se crea fuera del handler para reutilizar la conexión entre invocaciones (ADR-0002).
let pool;
function getPool() {
  if (!pool) {
    pool = shared.createPool();
  }
  return pool;
}

module.exports = {
  createHealthHandler,
  handler: createHealthHandler({
    getPool,
    getCorsConfig: shared.getCorsConfig,
    logger: shared.logger,
  }),
};
