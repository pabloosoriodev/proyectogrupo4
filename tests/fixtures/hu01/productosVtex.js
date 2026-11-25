'use strict';

/**
 * Productos con el formato del catálogo VTEX descrito en el contrato HU-01 ("Formato de las
 * webs"). Solo se llenan los campos que el contrato usa, más los que VTEX trae siempre.
 */

let siguienteId = 1;

/**
 * @param {object} p
 * @param {string} p.nombre          → productName
 * @param {string} [p.marca]         → brand ('' = vacío)
 * @param {string} [p.categoria]     → categories[0]
 * @param {string} p.link            → link (URL absoluta o ruta; se resuelve contra la web falsa)
 * @param {number} p.listPrice       → commertialOffer.ListPrice del vendedor por defecto
 * @param {number} p.price           → commertialOffer.Price del vendedor por defecto
 * @param {boolean} [p.disponible]   → commertialOffer.IsAvailable
 * @param {object[]} [p.itemsExtra]  ítems adicionales después de items[0] (caso B8)
 * @param {object[]} [p.vendedoresAntes] vendedores no predeterminados antes del predeterminado (B8)
 * @param {object} [p.ofertaExtra]   campos extra de commertialOffer (Teasers, B10)
 */
function productoVtex({
  nombre,
  marca = 'Marca de prueba',
  categoria = '/Lácteos/Leches/',
  link,
  listPrice,
  price,
  disponible = true,
  itemsExtra = [],
  vendedoresAntes = [],
  ofertaExtra = {},
}) {
  const id = String(siguienteId++);
  return {
    productId: id,
    productName: nombre,
    brand: marca,
    link,
    categories: [categoria, '/Lácteos/'],
    items: [
      {
        itemId: `${id}0`,
        sellers: [
          ...vendedoresAntes,
          {
            sellerId: '1',
            sellerName: 'Vendedor por defecto',
            sellerDefault: true,
            commertialOffer: {
              Price: price,
              ListPrice: listPrice,
              IsAvailable: disponible,
              Teasers: [],
              PromotionTeasers: [],
              ...ofertaExtra,
            },
          },
        ],
      },
      ...itemsExtra,
    ],
  };
}

/** Vendedor que no es el predeterminado (B8). */
function vendedorNoPredeterminado({ listPrice, price }) {
  return {
    sellerId: '99',
    sellerName: 'Otro vendedor',
    sellerDefault: false,
    commertialOffer: {
      Price: price,
      ListPrice: listPrice,
      IsAvailable: true,
      Teasers: [],
      PromotionTeasers: [],
    },
  };
}

/** Ítem (SKU) adicional con su propio vendedor por defecto (B8). */
function itemExtra({ listPrice, price }) {
  return {
    itemId: `extra-${siguienteId++}`,
    sellers: [
      {
        sellerId: '1',
        sellerName: 'Vendedor por defecto',
        sellerDefault: true,
        commertialOffer: {
          Price: price,
          ListPrice: listPrice,
          IsAvailable: true,
          Teasers: [],
          PromotionTeasers: [],
        },
      },
    ],
  };
}

/** `cantidad` productos disponibles con links distintos, para llenar páginas (F4). */
function productosEnSerie(prefijo, cantidad, { listPrice = 3.5, price = 3.5 } = {}) {
  return Array.from({ length: cantidad }, (_, indice) =>
    productoVtex({
      nombre: `${prefijo} ${indice + 1}`,
      link: `/${prefijo}-${indice + 1}/p`,
      listPrice,
      price,
    }),
  );
}

module.exports = { productoVtex, vendedorNoPredeterminado, itemExtra, productosEnSerie };
