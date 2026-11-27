// npm run db:migrate — aplica las migraciones pendientes de db/migrations con node-pg-migrate.
// Regla del proyecto: toda migración debe ser no bloqueante (p. ej. CREATE INDEX CONCURRENTLY).
const path = require('node:path');
const { buildConnectionConfig, getDbConfig, logger } = require('@proyectogrupo4/shared');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'pgmigrations';

const migrationLogger = {
  debug: () => {},
  info: (message) => logger.info(message),
  warn: (message) => logger.warn(message),
  error: (message) => logger.error(message),
};

async function main() {
  try {
    // node-pg-migrate 9 es solo ESM (SEC-05): se carga con import() dinámico para que este script
    // siga siendo CommonJS (aclaración 13 del Sprint 0).
    const { runner: runMigrations } = await import('node-pg-migrate');
    const applied = await runMigrations({
      databaseUrl: buildConnectionConfig(getDbConfig()),
      dir: MIGRATIONS_DIR,
      migrationsTable: MIGRATIONS_TABLE,
      direction: 'up',
      count: Infinity,
      checkOrder: true,
      logger: migrationLogger,
    });
    logger.info('Migraciones aplicadas', {
      count: applied.length,
      migrations: applied.map((m) => m.name),
    });
  } catch (error) {
    logger.error('Fallaron las migraciones', { error: logger.serializeError(error) });
    process.exitCode = 1;
  }
}

main();
