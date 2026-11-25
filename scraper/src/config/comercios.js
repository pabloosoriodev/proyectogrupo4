// Configuración de comercios y búsquedas (contrato HU-01, decisiones 3, 4 y 19).
// El mismo formato JSON se lee de un archivo en local (COMERCIOS_CONFIG_PATH) y de Parameter Store
// en AWS (/comparador/{entorno}/comercios, ADR-0010). Formato documentado en .env.example.
const fs = require('node:fs/promises');
const { ConfigError } = require('@proyectogrupo4/shared');

function fail(origen, detalle) {
  throw new ConfigError(`Configuración de comercios inválida (${origen}): ${detalle}`);
}

function validarComercio(comercio, indice, origen) {
  const donde = `comercios[${indice}]`;
  if (comercio === null || typeof comercio !== 'object') {
    fail(origen, `${donde} debe ser un objeto`);
  }
  for (const campo of ['slug', 'nombre', 'url', 'tipo']) {
    if (typeof comercio[campo] !== 'string' || comercio[campo].trim() === '') {
      fail(origen, `falta ${donde}.${campo}`);
    }
  }
  if (typeof comercio.activo !== 'boolean') {
    fail(origen, `falta ${donde}.activo (true o false)`);
  }
  const limite = comercio.limitePeticionesPorSegundo;
  if (typeof limite !== 'number' || !Number.isFinite(limite) || limite <= 0) {
    fail(origen, `falta ${donde}.limitePeticionesPorSegundo (número mayor que 0)`);
  }
  let url;
  try {
    url = new URL(comercio.url);
  } catch {
    fail(origen, `${donde}.url no es una URL válida`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    fail(origen, `${donde}.url debe usar http o https`);
  }
  return {
    slug: comercio.slug.trim(),
    nombre: comercio.nombre.trim(),
    activo: comercio.activo,
    url: comercio.url.trim().replace(/\/+$/, ''),
    tipo: comercio.tipo.trim(),
    limitePeticionesPorSegundo: limite,
  };
}

function parseComerciosConfig(texto, origen) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    fail(origen, `no es JSON válido (${error.message})`);
  }
  if (datos === null || typeof datos !== 'object' || !Array.isArray(datos.comercios)) {
    fail(origen, 'falta la lista "comercios"');
  }
  if (datos.comercios.length === 0) {
    fail(origen, 'la lista "comercios" está vacía');
  }
  if (!Array.isArray(datos.busquedas) || datos.busquedas.length === 0) {
    fail(origen, 'falta la lista "busquedas"');
  }
  const busquedas = datos.busquedas.map((termino, indice) => {
    if (typeof termino !== 'string' || termino.trim() === '') {
      fail(origen, `busquedas[${indice}] debe ser un texto no vacío`);
    }
    return termino.trim();
  });
  // Decisión 30 (v6): tope de posiciones de resultado por término y comercio; obligatorio (E2).
  const maxResultados = datos.maxResultadosPorBusqueda;
  if (!Number.isInteger(maxResultados) || maxResultados <= 0) {
    fail(origen, 'falta maxResultadosPorBusqueda (entero mayor que 0)');
  }
  const comercios = datos.comercios.map((comercio, indice) =>
    validarComercio(comercio, indice, origen),
  );
  const slugs = new Set();
  for (const { slug } of comercios) {
    if (slugs.has(slug)) {
      fail(origen, `el slug "${slug}" está repetido`);
    }
    slugs.add(slug);
  }
  return {
    comercios,
    busquedas: [...new Set(busquedas)],
    maxResultadosPorBusqueda: maxResultados,
  };
}

async function cargarComerciosDesdeArchivo(ruta) {
  let texto;
  try {
    texto = await fs.readFile(ruta, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ConfigError(`No existe el archivo de comercios ${ruta} (COMERCIOS_CONFIG_PATH)`);
    }
    throw new ConfigError(
      `No se pudo leer el archivo de comercios ${ruta} (COMERCIOS_CONFIG_PATH): ${error.message}`,
    );
  }
  return parseComerciosConfig(texto, ruta);
}

module.exports = { parseComerciosConfig, cargarComerciosDesdeArchivo };
