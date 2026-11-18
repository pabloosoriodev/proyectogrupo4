// npm run db:check — comprueba que el PostgreSQL configurado en el entorno responde.
const { createClient, getDbConfig, logger } = require('@proyectogrupo4/shared');

async function main() {
  let client;
  try {
    const dbConfig = getDbConfig();
    client = createClient(dbConfig);
    await client.connect();
    await client.query('SELECT 1');
    logger.info('Base de datos disponible', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
    });
  } catch (error) {
    logger.error('Base de datos no disponible', { error: logger.serializeError(error) });
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

main();
