// Fallo de un comercio (contrato HU-01, sección C): HTTP >= 400, timeout, error de red, respuesta
// que el adaptador no puede interpretar o cero productos. Su `message` es el `motivo` de la DLQ.
class ScrapingError extends Error {
  constructor(message, { cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ScrapingError';
  }
}

module.exports = { ScrapingError };
