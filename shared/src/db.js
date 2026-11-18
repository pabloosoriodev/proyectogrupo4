// Conexión a PostgreSQL (ADR-0002). SSL según DB_SSL (ADR-0003, parte Sprint 0).
const { Client, Pool } = require('pg');
const { getDbConfig } = require('./config');
const logger = require('./logger');

// Una conexión por instancia de Lambda: sin RDS Proxy, evita agotar las conexiones (ADR-0002).
const MAX_CONNECTIONS_PER_INSTANCE = 1;

function buildConnectionConfig(dbConfig = getDbConfig()) {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl ? true : false,
    connectionTimeoutMillis: dbConfig.connectTimeoutMs,
    query_timeout: dbConfig.connectTimeoutMs,
  };
}

function createPool(dbConfig = getDbConfig()) {
  const pool = new Pool({
    ...buildConnectionConfig(dbConfig),
    max: MAX_CONNECTIONS_PER_INSTANCE,
  });
  // Sin este listener, un cliente inactivo que pierde la conexión derriba el proceso.
  pool.on('error', (error) => {
    logger.error('Error en una conexión inactiva a PostgreSQL', {
      error: logger.serializeError(error),
    });
  });
  return pool;
}

function createClient(dbConfig = getDbConfig()) {
  return new Client(buildConnectionConfig(dbConfig));
}

module.exports = {
  buildConnectionConfig,
  createPool,
  createClient,
};
