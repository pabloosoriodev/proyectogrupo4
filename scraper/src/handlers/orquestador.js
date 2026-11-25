// Lambda orquestadora (ADR-0001): la dispara EventBridge Scheduler a las 06:00 de Lima. Lee la
// configuración de Parameter Store (ADR-0010) y envía un mensaje por comercio activo a la cola.
const { randomUUID } = require('node:crypto');
const shared = require('@proyectogrupo4/shared');
const { parseComerciosConfig } = require('../config/comercios');
const { leerParametro } = require('../aws/parametros');
const { enviarMensaje } = require('../aws/sqs');
const { orquestar } = require('../orquestar');
const { crearRepositorio } = require('../repositorio');

// Pool fuera del handler para reutilizar la conexión entre invocaciones (ADR-0002).
let pool;
function getPool() {
  if (!pool) {
    pool = shared.createPool();
  }
  return pool;
}

async function handler(event, context) {
  const ejecucionId = context?.awsRequestId ?? randomUUID();
  const log = shared.logger.child({ ejecucionId });
  try {
    const aws = shared.getOrquestadorAwsConfig();
    const texto = await leerParametro(aws.comerciosParameterName);
    const configuracion = parseComerciosConfig(texto, aws.comerciosParameterName);
    const mensajes = await orquestar({
      ejecucionId,
      configuracion,
      repositorio: crearRepositorio(getPool()),
      enviarMensaje: (mensaje) => enviarMensaje(aws.queueUrl, mensaje),
      log,
    });
    return { ejecucionId, comerciosActivos: mensajes.length };
  } catch (error) {
    log.error('Falló el orquestador', { error: shared.logger.serializeError(error) });
    // Se relanza: la invocación asíncrona reintenta y, agotada, va a la DLQ de la función.
    throw error;
  }
}

module.exports = { handler };
