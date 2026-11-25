// Un adaptador por modo de lectura (ADR-0004). HU-01 solo necesita `json` (decisión 16).
const { ScrapingError } = require('../errores');
const { crearAdaptadorVtex } = require('./vtex');

const ADAPTADORES = {
  json: crearAdaptadorVtex,
};

function crearAdaptador(tipo, dependencias) {
  const crear = ADAPTADORES[tipo];
  if (!crear) {
    throw new ScrapingError(`No hay adaptador para el tipo "${tipo}"`);
  }
  return crear(dependencias);
}

module.exports = { crearAdaptador };
