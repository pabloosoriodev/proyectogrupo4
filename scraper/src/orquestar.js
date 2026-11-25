// Orquestador (ADR-0001): registra los comercios configurados y envía un mensaje por cada comercio
// activo. En AWS lo dispara EventBridge Scheduler; en local, `npm run scrape:local`.

/**
 * @returns {Promise<object[]>} los mensajes enviados (uno por comercio activo, caso A2)
 */
async function orquestar({ ejecucionId, configuracion, repositorio, enviarMensaje, log }) {
  const { comercios, busquedas, maxResultadosPorBusqueda } = configuracion;
  // Caso B7 / decisión 5: todos los comercios configurados quedan en la tabla, activos o no.
  const ids = await repositorio.guardarComercios(comercios);
  const mensajes = comercios
    .filter((comercio) => comercio.activo)
    .map((comercio) => ({
      ejecucionId,
      comercio: { ...comercio, id: ids.get(comercio.slug) },
      busquedas,
      maxResultadosPorBusqueda,
    }));
  for (const mensaje of mensajes) {
    await enviarMensaje(mensaje);
  }
  log.info('Mensajes enviados a la cola', {
    comerciosActivos: mensajes.length,
    comerciosConfigurados: comercios.length,
  });
  return mensajes;
}

module.exports = { orquestar };
