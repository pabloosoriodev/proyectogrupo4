// Único punto de lectura de configuración (ADR-0010). En local los valores vienen de `.env`;
// las variables del proceso tienen prioridad (comportamiento por defecto de dotenv, sin override).
require('dotenv').config({ quiet: true });

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function readRequired(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new ConfigError(`Falta la variable de entorno ${name}`);
  }
  return value.trim();
}

function readBoolean(name) {
  const value = readRequired(name).toLowerCase();
  if (value !== 'true' && value !== 'false') {
    throw new ConfigError(`La variable de entorno ${name} debe ser "true" o "false"`);
  }
  return value === 'true';
}

function readPositiveInteger(name) {
  const value = Number(readRequired(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(`La variable de entorno ${name} debe ser un entero positivo`);
  }
  return value;
}

function getDbConfig() {
  return {
    host: readRequired('DB_HOST'),
    port: readPositiveInteger('DB_PORT'),
    database: readRequired('DB_NAME'),
    user: readRequired('DB_USER'),
    password: readRequired('DB_PASSWORD'),
    ssl: readBoolean('DB_SSL'),
    connectTimeoutMs: readPositiveInteger('DB_CONNECT_TIMEOUT_MS'),
  };
}

function getCorsConfig() {
  return {
    allowedOrigin: readRequired('CORS_ALLOWED_ORIGIN'),
  };
}

function getApiConfig() {
  return {
    port: readPositiveInteger('API_PORT'),
  };
}

module.exports = {
  ConfigError,
  getDbConfig,
  getCorsConfig,
  getApiConfig,
};
