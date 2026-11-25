// npm run scrape:local — ejecución diaria completa en local (contrato HU-01, comportamiento A;
// decisión 2). Simula lo que en AWS hacen EventBridge Scheduler (una ejecución del orquestador) y
// SQS (entrega de cada mensaje al scraper), sin Docker. Los reintentos (SCRAPING_MAX_INTENTOS) son
// por petición de búsqueda, dentro del scraper (decisión 24).
const { randomUUID } = require('node:crypto');
const shared = require('@proyectogrupo4/shared');
const { cargarComerciosDesdeArchivo } = require('./config/comercios');
const { crearDlqLocal } = require('./dlq/dlqLocal');
const { orquestar } = require('./orquestar');
const { procesarMensaje } = require('./procesarMensaje');
const { crearRepositorio } = require('./repositorio');

const MENSAJE_FINAL = 'Actualización diaria terminada';

// Cola simulada: entrega cada mensaje al scraper una vez.
async function entregar({ mensaje, scraping, deps, log }) {
  try {
    return await procesarMensaje({ mensaje, scraping, deps });
  } catch (error) {
    // Falló incluso la publicación en la DLQ: en AWS, SQS reentregaría el mensaje y, agotado
    // maxReceiveCount, lo movería a la DLQ por la RedrivePolicy.
    log.error('No se pudo resolver el mensaje del comercio', {
      comercio: mensaje.comercio.slug,
      error: shared.logger.serializeError(error),
    });
    return { estado: 'fallido' };
  }
}

async function ejecutar({ ejecucionId, logger = shared.logger, fetchImpl }) {
  const log = logger.child({ ejecucionId });
  let pool;
  try {
    // Toda la configuración se valida antes de pedir cualquier web (caso E2).
    const scraping = shared.getScrapingConfig();
    const local = shared.getScrapingLocalConfig();
    const dbConfig = shared.getDbConfig();
    const configuracion = await cargarComerciosDesdeArchivo(local.comerciosConfigPath);

    // Una conexión por comercio activo para que sus transacciones no se esperen entre sí.
    const activos = configuracion.comercios.filter((c) => c.activo).length;
    pool = shared.createPool(dbConfig, { maxConnections: Math.max(1, activos) });
    const repositorio = crearRepositorio(pool);
    const deps = {
      repositorio,
      dlq: crearDlqLocal(local.dlqLocalPath),
      logger,
      fetchImpl,
    };

    const cola = [];
    await orquestar({
      ejecucionId,
      configuracion,
      repositorio,
      enviarMensaje: async (mensaje) => {
        cola.push(mensaje);
      },
      log,
    });

    // Los comercios se procesan en paralelo: el fallo de uno no afecta a los demás (caso C4).
    const resultados = await Promise.all(
      cola.map((mensaje) => entregar({ mensaje, scraping, deps, log })),
    );
    const comerciosOk = resultados.filter((r) => r.estado === 'ok').length;
    log.info(MENSAJE_FINAL, { comerciosOk, comerciosFallidos: resultados.length - comerciosOk });
    return 0;
  } catch (error) {
    // Configuración que falta o base de datos inaccesible: el proceso no puede ejecutarse.
    log.error(error.message, { error: logger.serializeError(error) });
    return 1;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (error) {
        log.warn('No se pudo cerrar la conexión a PostgreSQL', {
          error: logger.serializeError(error),
        });
      }
    }
  }
}

if (require.main === module) {
  ejecutar({ ejecucionId: randomUUID() }).then((codigo) => {
    process.exitCode = codigo;
  });
}

module.exports = { ejecutar, MENSAJE_FINAL };
