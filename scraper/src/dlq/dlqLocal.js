// DLQ local de `npm run scrape:local`: una línea JSON por comercio fallido (SCRAPING_DLQ_LOCAL_PATH).
const fs = require('node:fs/promises');
const path = require('node:path');

function crearDlqLocal(ruta) {
  return {
    // Caso C3: exactamente los campos comercio, url y motivo.
    async publicar({ comercio, url, motivo }) {
      await fs.mkdir(path.dirname(path.resolve(ruta)), { recursive: true });
      await fs.appendFile(ruta, `${JSON.stringify({ comercio, url, motivo })}\n`, 'utf8');
    },
  };
}

module.exports = { crearDlqLocal };
