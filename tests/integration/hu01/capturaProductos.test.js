'use strict';

/**
 * Contrato HU-01, comportamiento B: captura de productos de un comercio (B1–B10), con la tabla de
 * correspondencia VTEX → `publicacion` de la sección "Formato de las webs".
 */

const { COMERCIOS, TABLA_PUBLICACION, NIVEL_WARN } = require('../../fixtures/hu01/contratoHu01');
const {
  productoVtex,
  vendedorNoPredeterminado,
  itemExtra,
} = require('../../fixtures/hu01/productosVtex');
const { prepararEscenario } = require('../../helpers/escenarioHu01');
const { publicacionesDe, comercioPorSlug, columnasDe } = require('../../helpers/baseHu01');
const { describirEjecucion } = require('../../helpers/scrapeLocal');
const {
  exigirTablasHu01,
  partirDeBaseLimpia,
  huella,
  logsFinales,
} = require('../../helpers/pruebaHu01');

jest.setTimeout(180000);

const PLAZA_VEA = COMERCIOS.plazaVea.slug;
const WONG = COMERCIOS.wong.slug;

/** Escenario de un solo comercio con la búsqueda `leche`. */
function unComercio(clave, productos) {
  return prepararEscenario({
    comercios: [{ clave, catalogo: { leche: productos } }],
    busquedas: ['leche'],
  });
}

async function ejecutarBien(escenario) {
  const ejecucion = await escenario.ejecutar();
  expect({ codigo: ejecucion.codigo, detalle: describirEjecucion(ejecucion) }).toMatchObject({
    codigo: 0,
  });
  return ejecucion;
}

function filaPorUrl(filas, url) {
  return filas.find((fila) => fila.url === url);
}

describe('[HU-01 B] captura de productos de un comercio', () => {
  let escenario;

  beforeAll(exigirTablasHu01);
  beforeEach(partirDeBaseLimpia);
  afterEach(async () => {
    if (escenario) await escenario.cerrar();
    escenario = undefined;
  });

  test('[B1] producto con oferta en Plaza Vea: ListPrice 5.90 y Price 4.90 → una fila con regular 5.90, oferta 4.90 y los campos de la correspondencia', async () => {
    const producto = productoVtex({
      nombre: 'Leche Gloria Entera Lata 400 g',
      marca: 'Gloria',
      categoria: '/Lácteos/Leches/Leche Evaporada/',
      link: '/leche-gloria-entera-lata-400g/p',
      listPrice: 5.9,
      price: 4.9,
    });
    escenario = await unComercio('plazaVea', [producto]);

    const inicio = new Date();
    await ejecutarBien(escenario);
    const fin = new Date();

    const comercio = await comercioPorSlug(PLAZA_VEA);
    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      comercio_id: comercio.id,
      grupo_id: null, // decisión 11
      nombre_original: 'Leche Gloria Entera Lata 400 g',
      marca: 'Gloria',
      categoria_origen: '/Lácteos/Leches/Leche Evaporada/',
      url: `${escenario.webs[PLAZA_VEA].url}/leche-gloria-entera-lata-400g/p`,
      precio_regular: '5.90',
      precio_oferta: '4.90',
    });
    const captura = new Date(filas[0].fecha_captura).getTime();
    expect(captura).toBeGreaterThanOrEqual(inicio.getTime() - 1000);
    expect(captura).toBeLessThanOrEqual(fin.getTime() + 1000);
  });

  test('[B1, correspondencia] brand vacío → marca nula', async () => {
    escenario = await unComercio('plazaVea', [
      productoVtex({
        nombre: 'Leche sin marca',
        marca: '',
        link: '/sin-marca/p',
        listPrice: 4,
        price: 4,
      }),
    ]);

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas).toHaveLength(1);
    expect(filas[0].marca).toBeNull();
  });

  test('[B2] producto sin oferta en Wong: ListPrice 5.90 y Price 5.90 → regular 5.90 y oferta nula', async () => {
    escenario = await unComercio('wong', [
      productoVtex({ nombre: 'Leche Pura Vida', link: '/pura-vida/p', listPrice: 5.9, price: 5.9 }),
    ]);

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(WONG);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ precio_regular: '5.90', precio_oferta: null });
  });

  test('[B3] misma url en una ejecución posterior con otro precio → se actualiza la misma fila con precios y fecha_captura nuevos', async () => {
    const link = '/leche-b3/p';
    escenario = await unComercio('plazaVea', [
      productoVtex({ nombre: 'Leche B3', link, listPrice: 5.9, price: 5.9 }),
    ]);
    await ejecutarBien(escenario);
    const [antes] = await publicacionesDe(PLAZA_VEA);

    escenario.webs[PLAZA_VEA].cambiarCatalogo({
      leche: [productoVtex({ nombre: 'Leche B3', link, listPrice: 6.5, price: 6.2 })],
    });
    await ejecutarBien(escenario);

    const despues = await publicacionesDe(PLAZA_VEA);
    expect(despues).toHaveLength(1);
    expect(despues[0]).toMatchObject({
      id: antes.id,
      precio_regular: '6.50',
      precio_oferta: '6.20',
    });
    expect(new Date(despues[0].fecha_captura).getTime()).toBeGreaterThan(
      new Date(antes.fecha_captura).getTime(),
    );
  });

  test('[B4] un producto guardado que hoy la web no publica se conserva sin cambios, con su fecha_captura original', async () => {
    const desaparece = productoVtex({
      nombre: 'Leche que desaparece',
      link: '/desaparece/p',
      listPrice: 4.5,
      price: 4.2,
    });
    const sigue = productoVtex({
      nombre: 'Leche que sigue',
      link: '/sigue/p',
      listPrice: 5,
      price: 5,
    });
    escenario = await unComercio('plazaVea', [desaparece, sigue]);
    await ejecutarBien(escenario);
    const url = `${escenario.webs[PLAZA_VEA].url}/desaparece/p`;
    const antes = filaPorUrl(await publicacionesDe(PLAZA_VEA), url);
    expect(antes).toBeDefined();

    escenario.webs[PLAZA_VEA].cambiarCatalogo({ leche: [sigue] });
    await ejecutarBien(escenario);

    const despues = filaPorUrl(await publicacionesDe(PLAZA_VEA), url);
    expect(despues).toBeDefined();
    expect(huella(despues)).toEqual(huella(antes));
  });

  test('[B5] Price mayor que ListPrice → oferta nula y regular = ListPrice', async () => {
    escenario = await unComercio('plazaVea', [
      productoVtex({ nombre: 'Leche B5', link: '/b5/p', listPrice: 5, price: 6 }),
    ]);

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ precio_regular: '5.00', precio_oferta: null });
  });

  test('[B6] precios guardados como número en soles con 2 decimales (12.5 → 12.50, 9 → 9.00)', async () => {
    escenario = await unComercio('plazaVea', [
      productoVtex({ nombre: 'Leche B6', link: '/b6/p', listPrice: 12.5, price: 9 }),
    ]);

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ precio_regular: '12.50', precio_oferta: '9.00' });
  });

  test('[B6] publicacion guarda los precios como numeric(10,2), sin campo de moneda', async () => {
    const columnas = await columnasDe(TABLA_PUBLICACION);
    const porNombre = Object.fromEntries(columnas.map((columna) => [columna.nombre, columna]));

    for (const nombre of ['precio_regular', 'precio_oferta']) {
      expect({
        nombre,
        tipo: porNombre[nombre]?.tipo,
        precision: porNombre[nombre]?.precision,
        escala: porNombre[nombre]?.escala,
      }).toEqual({
        nombre,
        tipo: 'numeric',
        precision: 10,
        escala: 2,
      });
    }
    expect(columnas.filter(({ nombre }) => /moneda|currency/i.test(nombre))).toEqual([]);
  });

  test('[B7] los comercios configurados que no están en la tabla comercio quedan con su slug, nombre y activo según la configuración', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'wong',
          activo: true,
          catalogo: {
            leche: [productoVtex({ nombre: 'L', link: '/l/p', listPrice: 4, price: 4 })],
          },
        },
        { clave: 'plazaVea', activo: false },
        {
          clave: 'metro',
          activo: true,
          catalogo: {
            leche: [productoVtex({ nombre: 'M', link: '/m/p', listPrice: 4, price: 4 })],
          },
        },
      ],
      busquedas: ['leche'],
    });

    await ejecutarBien(escenario);

    for (const { clave, activo } of [
      { clave: 'wong', activo: true },
      { clave: 'plazaVea', activo: false },
      { clave: 'metro', activo: true },
    ]) {
      const { slug, nombre } = COMERCIOS[clave];
      expect(await comercioPorSlug(slug)).toMatchObject({ slug, nombre, activo });
    }
  });

  test('[B8] varios SKU y vendedores: se usa items[0] y su vendedor sellerDefault; una sola fila por link', async () => {
    escenario = await unComercio('plazaVea', [
      productoVtex({
        nombre: 'Leche B8',
        link: '/b8/p',
        listPrice: 5.9,
        price: 4.9,
        vendedoresAntes: [vendedorNoPredeterminado({ listPrice: 3.1, price: 2.1 })],
        itemsExtra: [
          itemExtra({ listPrice: 8.8, price: 7.7 }),
          itemExtra({ listPrice: 1.1, price: 1.0 }),
        ],
      }),
    ]);

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ precio_regular: '5.90', precio_oferta: '4.90' });
  });

  test('[B9] producto con IsAvailable: false en el vendedor por defecto → no se guarda', async () => {
    escenario = await unComercio('plazaVea', [
      productoVtex({
        nombre: 'Leche agotada',
        link: '/agotada/p',
        listPrice: 5,
        price: 5,
        disponible: false,
      }),
      productoVtex({ nombre: 'Leche disponible', link: '/disponible/p', listPrice: 5, price: 5 }),
    ]);

    await ejecutarBien(escenario);

    const urls = (await publicacionesDe(PLAZA_VEA)).map(({ url }) => url);
    expect(urls).toEqual([`${escenario.webs[PLAZA_VEA].url}/disponible/p`]);
  });

  test('[B9] si ya existía y hoy no está disponible, su fila se conserva sin cambios', async () => {
    const otro = productoVtex({
      nombre: 'Leche que sigue',
      link: '/sigue/p',
      listPrice: 5,
      price: 5,
    });
    escenario = await unComercio('plazaVea', [
      productoVtex({ nombre: 'Leche B9', link: '/b9/p', listPrice: 5, price: 4.5 }),
      otro,
    ]);
    await ejecutarBien(escenario);
    const url = `${escenario.webs[PLAZA_VEA].url}/b9/p`;
    const antes = filaPorUrl(await publicacionesDe(PLAZA_VEA), url);
    expect(antes).toBeDefined();

    escenario.webs[PLAZA_VEA].cambiarCatalogo({
      leche: [
        productoVtex({
          nombre: 'Leche B9',
          link: '/b9/p',
          listPrice: 7,
          price: 6,
          disponible: false,
        }),
        otro,
      ],
    });
    await ejecutarBien(escenario);

    expect(huella(filaPorUrl(await publicacionesDe(PLAZA_VEA), url))).toEqual(huella(antes));
  });

  test('[B10] Teasers y PromotionTeasers (promociones con tarjeta) se ignoran: solo cuentan ListPrice y Price', async () => {
    const promocion = {
      '<Name>k__BackingField': 'Precio con tarjeta 3.50',
      '<Effects>k__BackingField': {
        '<Parameters>k__BackingField': [
          {
            '<Name>k__BackingField': 'PromotionalPriceTableItemsDiscount',
            '<Value>k__BackingField': '3.50',
          },
        ],
      },
    };
    escenario = await unComercio('plazaVea', [
      productoVtex({
        nombre: 'Leche B10',
        link: '/b10/p',
        listPrice: 5.9,
        price: 4.9,
        ofertaExtra: { Teasers: [promocion], PromotionTeasers: [promocion] },
      }),
    ]);

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ precio_regular: '5.90', precio_oferta: '4.90' });
  });

  describe('[B11] producto mal formado (decisión 27)', () => {
    function malFormados() {
      const sinItems = productoVtex({
        nombre: 'Sin items',
        link: '/sin-items/p',
        listPrice: 5,
        price: 5,
      });
      sinItems.items = [];
      const sinListPrice = productoVtex({
        nombre: 'Sin ListPrice',
        link: '/sin-listprice/p',
        listPrice: 5,
        price: 5,
      });
      delete sinListPrice.items[0].sellers[0].commertialOffer.ListPrice;
      const sinPredeterminado = productoVtex({
        nombre: 'Sin sellerDefault',
        link: '/sin-default/p',
        listPrice: 5,
        price: 5,
      });
      sinPredeterminado.items[0].sellers[0].sellerDefault = false;
      return { sinItems, sinListPrice, sinPredeterminado };
    }

    test.each(['sinItems', 'sinListPrice', 'sinPredeterminado'])(
      'producto %s: no se guarda, hay un log warn con comercio y el resto del comercio se guarda sin fallar',
      async (tipo) => {
        escenario = await unComercio('plazaVea', [
          malFormados()[tipo],
          productoVtex({ nombre: 'Leche bien formada', link: '/bien/p', listPrice: 5, price: 4 }),
        ]);

        const ejecucion = await ejecutarBien(escenario);

        expect((await publicacionesDe(PLAZA_VEA)).map(({ url }) => url)).toEqual([
          `${escenario.webs[PLAZA_VEA].url}/bien/p`,
        ]);
        expect(
          ejecucion.logs.filter((log) => log.level === NIVEL_WARN && log.comercio === PLAZA_VEA),
        ).not.toHaveLength(0);
        expect(logsFinales(ejecucion.logs)).toEqual([
          expect.objectContaining({ comerciosOk: 1, comerciosFallidos: 0 }),
        ]);
        expect(escenario.dlq()).toEqual([]);
      },
    );

    test('si todos los productos están mal formados no queda ninguno → aplica F5 (fallo del comercio)', async () => {
      const { sinItems, sinListPrice, sinPredeterminado } = malFormados();
      escenario = await unComercio('plazaVea', [sinItems, sinListPrice, sinPredeterminado]);

      const ejecucion = await ejecutarBien(escenario);

      expect(logsFinales(ejecucion.logs)).toEqual([
        expect.objectContaining({ comerciosOk: 0, comerciosFallidos: 1 }),
      ]);
      expect(escenario.dlq().filter((entrada) => entrada.comercio === PLAZA_VEA)).toHaveLength(1);
    });
  });
});
