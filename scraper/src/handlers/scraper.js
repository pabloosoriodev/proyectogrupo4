// Lambda scraper (ADR-0001): consume la cola liviana, un mensaje por comercio (BatchSize 1).
// Los reintentos son por petición de búsqueda dentro del scraper (decisión 24); si el comercio
// falla, el propio scraper publica en la DLQ con comercio, url y motivo (decisión 15) y da el
// mensaje por resuelto. SQS solo reentrega si la invocación falla de forma inesperada (p. ej. no se
// pudo publicar en la DLQ) y, superado maxReceiveCount, lo mueve a la DLQ (RedrivePolicy).
const shared = require('@proyectogrupo4/shared');
const { crearDlqSqs } = require('../aws/sqs');
const { procesarMensaje } = require('../procesarMensaje');
const { crearRepositorio } = require('../repositorio');

// Pool fuera del handler para reutilizar la conexión entre invocaciones (ADR-0002).
let pool;
function getPool() {
  if (!pool) {
    pool = shared.createPool();
  }
  return pool;
}

async function handler(event) {
  const batchItemFailures = [];
  for (const record of event?.Records ?? []) {
    try {
      const scraping = shared.getScrapingConfig();
      const { dlqUrl } = shared.getScraperAwsConfig();
      await procesarMensaje({
        mensaje: JSON.parse(record.body),
        scraping,
        deps: {
          repositorio: crearRepositorio(getPool()),
          dlq: crearDlqSqs(dlqUrl),
          logger: shared.logger,
        },
      });
    } catch (error) {
      shared.logger.error('Mensaje devuelto a la cola', {
        messageId: record.messageId,
        error: shared.logger.serializeError(error),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}

module.exports = { handler };
