// robots.txt (contrato HU-01, caso D1; RFC 9309): el scraper nunca pide una ruta prohibida para su
// agente. Se aplica el grupo del token de producto de SCRAPING_USER_AGENT o, si no hay, el de `*`.
// Ante varias reglas que coinciden gana la más larga; si empatan, gana Allow.
const { ScrapingError } = require('../errores');

const ROBOTS_PATH = '/robots.txt';

// "MiBot/1.0 (+https://...)" → "mibot"
function tokenDeAgente(userAgent) {
  return userAgent.trim().split(/[/\s]/)[0].toLowerCase();
}

function parsearRobots(texto) {
  const grupos = [];
  let actual = null;
  for (const lineaCruda of texto.split(/\r?\n/)) {
    const linea = lineaCruda.replace(/#.*$/, '').trim();
    const separador = linea.indexOf(':');
    if (separador === -1) {
      continue;
    }
    const campo = linea.slice(0, separador).trim().toLowerCase();
    const valor = linea.slice(separador + 1).trim();
    if (campo === 'user-agent') {
      // Varias líneas user-agent seguidas comparten las reglas que vienen después.
      if (!actual || actual.reglas.length > 0) {
        actual = { agentes: [], reglas: [] };
        grupos.push(actual);
      }
      actual.agentes.push(valor.toLowerCase());
    } else if ((campo === 'allow' || campo === 'disallow') && actual) {
      if (valor !== '') {
        actual.reglas.push({ permitir: campo === 'allow', patron: valor });
      }
    }
  }
  return grupos;
}

function patronARegExp(patron) {
  const anclado = patron.endsWith('$');
  const cuerpo = (anclado ? patron.slice(0, -1) : patron)
    .split('*')
    .map((parte) => parte.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${cuerpo}${anclado ? '$' : ''}`);
}

function crearReglasRobots(texto, userAgent) {
  const grupos = parsearRobots(texto);
  const token = tokenDeAgente(userAgent);
  const propios = grupos.filter((g) => g.agentes.includes(token));
  const aplicables = propios.length > 0 ? propios : grupos.filter((g) => g.agentes.includes('*'));
  const reglas = aplicables
    .flatMap((g) => g.reglas)
    .map((regla) => ({ ...regla, expresion: patronARegExp(regla.patron) }));

  return {
    // `ruta` incluye la query (p. ej. /api/...?ft=leche&_from=0&_to=49).
    permite(ruta) {
      let ganadora = null;
      for (const regla of reglas) {
        if (!regla.expresion.test(ruta)) {
          continue;
        }
        if (
          !ganadora ||
          regla.patron.length > ganadora.patron.length ||
          (regla.patron.length === ganadora.patron.length && regla.permitir)
        ) {
          ganadora = regla;
        }
      }
      return ganadora ? ganadora.permitir : true;
    },
  };
}

const SIN_REGLAS = { permite: () => true };

// Qué hacer según la respuesta de robots.txt (casos D1c y D1d, decisión 25): 2xx → se aplican sus
// reglas; 4xx → no hay reglas (RFC 9309 §2.3.1.3); 5xx, timeout o error de red → todo prohibido
// (§2.3.1.4): el comercio falla sin pedir ninguna búsqueda. Se pide una sola vez, sin reintentos.
async function obtenerReglasRobots({ http, urlBase, userAgent }) {
  const url = new URL(ROBOTS_PATH, urlBase).toString();
  let respuesta;
  try {
    respuesta = await http.get(url, { accept: 'text/plain' });
  } catch (error) {
    throw new ScrapingError(`robots.txt no disponible: ${error.message}`, { cause: error });
  }
  if (respuesta.status >= 200 && respuesta.status < 300) {
    return crearReglasRobots(respuesta.cuerpo, userAgent);
  }
  if (respuesta.status >= 400 && respuesta.status < 500) {
    return SIN_REGLAS;
  }
  throw new ScrapingError(`robots.txt respondió HTTP ${respuesta.status}: GET ${url}`);
}

module.exports = { obtenerReglasRobots, crearReglasRobots, tokenDeAgente };
