// Logger estructurado: una línea JSON por evento, para su ingesta en CloudWatch (ADR-0011).

function serializeError(error) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  return {
    name: error.name,
    message: error.message,
    ...(error.code ? { code: error.code } : {}),
  };
}

function write(level, message, fields = {}) {
  const entry = {
    ...fields,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  // Se resuelve console[level] en cada llamada para respetar sustituciones (p. ej. en pruebas).
  console[level](JSON.stringify(entry));
}

module.exports = {
  info: (message, fields) => write('info', message, fields),
  warn: (message, fields) => write('warn', message, fields),
  error: (message, fields) => write('error', message, fields),
  serializeError,
};
