// Adaptador VTEX, modo `json` (ADR-0004): Wong, Plaza Vea y Metro exponen el catálogo público
// /api/catalog_system/pub/products/search (contrato HU-01, "Formato de las webs").
const { ScrapingError } = require('../errores');

const RUTA_BUSQUEDA = '/api/catalog_system/pub/products/search';
// Paginación fijada en el contrato (decisiones 26 y 30): páginas de 50 (`_from`/`_to` inclusivos),
// el máximo que acepta VTEX. El tope por término llega por configuración (maxResultadosPorBusqueda).
const PRODUCTOS_POR_PAGINA = 50;

const aDosDecimales = (valor) => Math.round(valor * 100) / 100;
const esPrecio = (valor) => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
const textoONulo = (valor) =>
  typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;

// Convierte un producto VTEX en una fila de `publicacion` (tabla de correspondencia del contrato).
// Devuelve { producto } si se guarda, { noDisponible: true } (caso B9) o { omitido: motivo } si no
// se puede interpretar (caso B11, decisión 27).
function mapearProducto(producto, fechaCaptura) {
  const nombre = textoONulo(producto?.productName);
  const url = textoONulo(producto?.link);
  if (!nombre || !url) {
    return { omitido: 'sin productName o link' };
  }
  // Caso B8 / decisión 14: items[0] y su vendedor por defecto.
  const vendedores = producto.items?.[0]?.sellers;
  const vendedor = Array.isArray(vendedores)
    ? vendedores.find((s) => s?.sellerDefault === true)
    : undefined;
  const oferta = vendedor?.commertialOffer;
  if (!oferta) {
    return { omitido: `sin vendedor por defecto: ${url}` };
  }
  if (oferta.IsAvailable === false) {
    return { noDisponible: true };
  }
  if (!esPrecio(oferta.ListPrice) || !esPrecio(oferta.Price)) {
    return { omitido: `sin ListPrice o Price numéricos: ${url}` };
  }
  // Decisiones 7 y 18: regular = ListPrice; oferta = Price solo si es menor. Teasers se ignoran
  // (caso B10). Soles con 2 decimales, sin moneda (caso B6).
  const precioRegular = aDosDecimales(oferta.ListPrice);
  const precioVenta = aDosDecimales(oferta.Price);
  const categorias = producto.categories;
  return {
    producto: {
      nombreOriginal: nombre,
      marca: textoONulo(producto.brand),
      categoriaOrigen: Array.isArray(categorias) ? textoONulo(categorias[0]) : null,
      url,
      precioRegular,
      precioOferta: precioVenta < precioRegular ? precioVenta : null,
      fechaCaptura,
    },
  };
}

function crearAdaptadorVtex({ http, urlBase, robots, maxIntentos, log }) {
  async function pedirUnaVez(url) {
    const { status, cuerpo } = await http.get(url, { accept: 'application/json' });
    if (status < 200 || status >= 300) {
      throw new ScrapingError(`HTTP ${status}: GET ${url}`);
    }
    let datos;
    try {
      datos = JSON.parse(cuerpo);
    } catch {
      throw new ScrapingError(`Respuesta que no es JSON: GET ${url}`);
    }
    if (!Array.isArray(datos)) {
      throw new ScrapingError(`Respuesta sin lista de productos: GET ${url}`);
    }
    return { datos, fechaCaptura: new Date() };
  }

  // Decisión 24: cada petición de búsqueda (término y página) tiene hasta `maxIntentos` intentos,
  // seguidos y sin espera (el límite de D2 lo aplica el cliente HTTP). Si la misma petición falla
  // todas las veces, la web se da por caída y el error sube: el comercio falla en ese momento.
  async function pedirPagina(termino, desde) {
    const ruta =
      `${RUTA_BUSQUEDA}?ft=${encodeURIComponent(termino)}` +
      `&_from=${desde}&_to=${desde + PRODUCTOS_POR_PAGINA - 1}`;
    if (!robots.permite(ruta)) {
      throw new ScrapingError(`robots.txt prohíbe ${ruta}`);
    }
    const url = new URL(ruta, urlBase).toString();
    for (let intento = 1; ; intento += 1) {
      try {
        return await pedirUnaVez(url);
      } catch (error) {
        if (!(error instanceof ScrapingError) || intento >= maxIntentos) {
          throw error;
        }
        log.warn('Falló una petición de búsqueda; se reintenta', {
          termino,
          desde,
          intento,
          maxIntentos,
          motivo: error.message,
        });
      }
    }
  }

  // Productos disponibles de un término en las posiciones 0 a maxResultados − 1 (casos F4, F6 y
  // F7, decisión 30). Nunca se pide `_from` ≥ maxResultados; se para antes si una página trae menos
  // de 50. El tope cuenta posiciones: lo omitido dentro del tope no se reemplaza.
  async function buscar(termino, maxResultados) {
    const productos = [];
    for (let desde = 0; desde < maxResultados; desde += PRODUCTOS_POR_PAGINA) {
      const { datos, fechaCaptura } = await pedirPagina(termino, desde);
      for (const item of datos.slice(0, maxResultados - desde)) {
        const resultado = mapearProducto(item, fechaCaptura);
        if (resultado.omitido) {
          // Caso B11: el producto se omite y el comercio no falla.
          log.warn('Producto omitido: no se puede interpretar', {
            termino,
            motivo: resultado.omitido,
          });
        } else if (resultado.producto) {
          productos.push(resultado.producto);
        }
      }
      if (datos.length < PRODUCTOS_POR_PAGINA) {
        break;
      }
    }
    return productos;
  }

  return { buscar };
}

module.exports = { crearAdaptadorVtex, mapearProducto, RUTA_BUSQUEDA };
