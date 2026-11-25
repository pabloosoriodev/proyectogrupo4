// Cliente HTTP del scraper: cabecera User-Agent (caso D3), tiempo máximo por petición
// (SCRAPING_TIMEOUT_MS) y límite de peticiones por comercio (caso D2).
const { ScrapingError } = require('../errores');

function crearClienteHttp({ userAgent, timeoutMs, limite, fetchImpl = globalThis.fetch }) {
  async function get(url, { accept } = {}) {
    await limite.esperarTurno();
    let respuesta;
    try {
      respuesta = await fetchImpl(url, {
        method: 'GET',
        headers: { 'User-Agent': userAgent, ...(accept ? { Accept: accept } : {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new ScrapingError(`Sin respuesta en ${timeoutMs} ms: GET ${url}`, { cause: error });
      }
      const detalle = error.cause?.code ?? error.message;
      throw new ScrapingError(`Error de red (${detalle}): GET ${url}`, { cause: error });
    }
    let cuerpo;
    try {
      cuerpo = await respuesta.text();
    } catch (error) {
      throw new ScrapingError(`No se pudo leer la respuesta de GET ${url}: ${error.message}`, {
        cause: error,
      });
    }
    return { status: respuesta.status, cuerpo };
  }

  return { get };
}

module.exports = { crearClienteHttp };
