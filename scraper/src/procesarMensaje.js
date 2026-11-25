// Scraper: procesa el mensaje de un comercio (ADR-0001). Es el mismo código en la Lambda (SQS) y en
// `npm run scrape:local` (cola simulada). Los reintentos son por petición de búsqueda (decisión 24,
// en el adaptador); aquí el comercio se procesa una vez: o se guarda entero o va a la DLQ.
const { crearAdaptador } = require('./adaptadores');
const { ScrapingError } = require('./errores');
const { crearClienteHttp } = require('./http/clienteHttp');
const { crearLimitePeticiones } = require('./http/limitePeticiones');
const { obtenerReglasRobots } = require('./robots/robots');

async function leerComercio({
  comercio,
  busquedas,
  maxResultadosPorBusqueda,
  scraping,
  fetchImpl,
  log,
}) {
  // Un límite por comercio para toda la ejecución, que cuenta también robots.txt (caso D2).
  const http = crearClienteHttp({
    userAgent: scraping.userAgent,
    timeoutMs: scraping.timeoutMs,
    limite: crearLimitePeticiones(comercio.limitePeticionesPorSegundo),
    fetchImpl,
  });
  // Caso D1b: robots.txt una vez por comercio y ejecución, antes de la primera búsqueda.
  const robots = await obtenerReglasRobots({
    http,
    urlBase: comercio.url,
    userAgent: scraping.userAgent,
  });
  const adaptador = crearAdaptador(comercio.tipo, {
    http,
    urlBase: comercio.url,
    robots,
    maxIntentos: scraping.maxIntentos,
    log,
  });
  // Un producto que aparece en varias búsquedas o páginas se guarda una sola vez (caso F3).
  const porUrl = new Map();
  for (const termino of busquedas) {
    for (const producto of await adaptador.buscar(termino, maxResultadosPorBusqueda)) {
      porUrl.set(producto.url, producto);
    }
  }
  if (porUrl.size === 0) {
    // Decisión 8 / caso F5.
    throw new ScrapingError('Cero productos disponibles en las búsquedas configuradas');
  }
  return [...porUrl.values()];
}

/**
 * Procesa el mensaje { ejecucionId, comercio, busquedas }.
 * - Éxito: guarda todo en una transacción (decisión 9) y devuelve { estado: 'ok', productos }.
 * - Fallo del comercio: publica una entrada en la DLQ (caso C3, decisión 15) y devuelve
 *   { estado: 'fallido', motivo }. Si falla la propia DLQ, el error sube.
 */
async function procesarMensaje({ mensaje, scraping, deps }) {
  const { repositorio, dlq, logger, fetchImpl } = deps;
  const { ejecucionId, comercio, busquedas, maxResultadosPorBusqueda } = mensaje;
  const log = logger.child({ ejecucionId, comercio: comercio.slug });

  try {
    const productos = await leerComercio({
      comercio,
      busquedas,
      maxResultadosPorBusqueda,
      scraping,
      fetchImpl,
      log,
    });
    await repositorio.guardarPublicaciones(comercio.id, productos);
    log.info('Comercio actualizado', { productos: productos.length });
    return { estado: 'ok', productos: productos.length };
  } catch (error) {
    const motivo = error.message;
    await dlq.publicar({ comercio: comercio.slug, url: comercio.url, motivo });
    log.error('Comercio fallido: enviado a la DLQ', {
      motivo,
      error: logger.serializeError(error),
    });
    return { estado: 'fallido', motivo };
  }
}

module.exports = { procesarMensaje };
