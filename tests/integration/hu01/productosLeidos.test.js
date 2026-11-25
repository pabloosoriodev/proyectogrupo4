'use strict';

/**
 * Contrato HU-01, sección F: productos que se leen (F1–F5). La lista `busquedas` es común a los
 * comercios (decisión 19) y no hay filtro de categoría (decisión 20).
 */

const { COMERCIOS, PARAMETRO_TEXTO } = require('../../fixtures/hu01/contratoHu01');
const { productoVtex, productosEnSerie } = require('../../fixtures/hu01/productosVtex');
const { prepararEscenario } = require('../../helpers/escenarioHu01');
const { publicacionesDe } = require('../../helpers/baseHu01');
const { describirEjecucion } = require('../../helpers/scrapeLocal');
const { exigirTablasHu01, partirDeBaseLimpia, logsFinales } = require('../../helpers/pruebaHu01');

jest.setTimeout(180000);

const PLAZA_VEA = COMERCIOS.plazaVea.slug;
const METRO = COMERCIOS.metro.slug;

/** `_from`/`_to` de las peticiones de un término a Plaza Vea, en orden. */
function paginasPedidas(escenario, termino) {
  return escenario.webs[PLAZA_VEA].busquedas()
    .filter(({ query }) => query[PARAMETRO_TEXTO] === termino)
    .map(({ query }) => ({ _from: query._from, _to: query._to }));
}

function desdesPedidos(escenario, termino) {
  return paginasPedidas(escenario, termino).map(({ _from: desde }) => Number(desde));
}

async function ejecutarBien(escenario) {
  const ejecucion = await escenario.ejecutar();
  expect({ codigo: ejecucion.codigo, detalle: describirEjecucion(ejecucion) }).toMatchObject({
    codigo: 0,
  });
  return ejecucion;
}

describe('[HU-01 F] productos que se leen', () => {
  let escenario;

  beforeAll(exigirTablasHu01);
  beforeEach(partirDeBaseLimpia);
  afterEach(async () => {
    if (escenario) await escenario.cerrar();
    escenario = undefined;
  });

  test('[F1] solo se piden búsquedas (ft=) de los términos configurados', async () => {
    const busquedas = ['leche', 'arroz'];
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'plazaVea',
          catalogo: {
            leche: [
              productoVtex({ nombre: 'Leche F1', link: '/leche-f1/p', listPrice: 5, price: 5 }),
            ],
            arroz: [
              productoVtex({ nombre: 'Arroz F1', link: '/arroz-f1/p', listPrice: 4, price: 4 }),
            ],
            chocolate: [
              productoVtex({ nombre: 'Chocolate F1', link: '/choco-f1/p', listPrice: 3, price: 3 }),
            ],
            'comida para perros': [
              productoVtex({ nombre: 'Croquetas', link: '/perro/p', listPrice: 30, price: 30 }),
            ],
          },
        },
      ],
      busquedas,
    });

    await ejecutarBien(escenario);

    const terminosPedidos = escenario.webs[PLAZA_VEA].busquedas().map(
      ({ query }) => query[PARAMETRO_TEXTO],
    );
    expect(terminosPedidos.filter((termino) => !busquedas.includes(termino))).toEqual([]);
    expect([...new Set(terminosPedidos)].sort()).toEqual([...busquedas].sort());
  });

  test('[F2] sin filtro de categoría: la búsqueda de leche guarda "Chocolate con Leche" (Chocolatería) y "Leche Gloria" (Lácteos)', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'plazaVea',
          catalogo: {
            leche: [
              productoVtex({
                nombre: 'Chocolate con Leche Sublime 30 g',
                categoria: '/Abarrotes/Chocolatería/Chocolates de Leche/',
                link: '/chocolate-con-leche/p',
                listPrice: 2.5,
                price: 2.5,
              }),
              productoVtex({
                nombre: 'Leche Gloria Entera 400 g',
                categoria: '/Lácteos/Leches/',
                link: '/leche-gloria/p',
                listPrice: 4.2,
                price: 4.2,
              }),
            ],
          },
        },
      ],
      busquedas: ['leche'],
    });

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(
      filas.map(({ nombre_original: nombre, categoria_origen: categoria }) => ({
        nombre,
        categoria,
      })),
    ).toEqual([
      {
        nombre: 'Chocolate con Leche Sublime 30 g',
        categoria: '/Abarrotes/Chocolatería/Chocolates de Leche/',
      },
      { nombre: 'Leche Gloria Entera 400 g', categoria: '/Lácteos/Leches/' },
    ]);
  });

  test('[F3] el mismo link en dos búsquedas → una sola fila', async () => {
    const compartido = productoVtex({
      nombre: 'Arroz con leche Costeño',
      link: '/arroz-con-leche/p',
      listPrice: 6,
      price: 5,
    });
    escenario = await prepararEscenario({
      comercios: [{ clave: 'plazaVea', catalogo: { leche: [compartido], arroz: [compartido] } }],
      busquedas: ['leche', 'arroz'],
    });

    await ejecutarBien(escenario);

    const filas = await publicacionesDe(PLAZA_VEA);
    expect(filas.map(({ url }) => url)).toEqual([
      `${escenario.webs[PLAZA_VEA].url}/arroz-con-leche/p`,
    ]);
  });

  test('[F4] maxResultadosPorBusqueda = 100 y 80 resultados → se piden _from=0 (50) y _from=50 (30, se para) y se usan las 80 posiciones', async () => {
    escenario = await prepararEscenario({
      comercios: [{ clave: 'plazaVea', catalogo: { leche: productosEnSerie('leche-f4', 80) } }],
      busquedas: ['leche'],
      maxResultadosPorBusqueda: 100,
    });

    await ejecutarBien(escenario);

    expect(desdesPedidos(escenario, 'leche')).toEqual([0, 50]);
    expect((await publicacionesDe(PLAZA_VEA)).length).toBe(80);
  });

  test('[F6] maxResultadosPorBusqueda = 100 y 1596 resultados → exactamente 2 peticiones (_from=0 y 50), nunca _from=100, y 100 filas', async () => {
    escenario = await prepararEscenario({
      comercios: [{ clave: 'plazaVea', catalogo: { leche: productosEnSerie('leche-f6', 1596) } }],
      busquedas: ['leche'],
      maxResultadosPorBusqueda: 100,
    });

    await ejecutarBien(escenario);

    expect(desdesPedidos(escenario, 'leche')).toEqual([0, 50]);
    expect((await publicacionesDe(PLAZA_VEA)).length).toBe(100);
  });

  test('[F6] el tope es por término: con 2 términos de 1596 resultados cada uno se guardan 100 de cada término', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'plazaVea',
          catalogo: {
            leche: productosEnSerie('leche-f6b', 1596),
            arroz: productosEnSerie('arroz-f6b', 1596),
          },
        },
      ],
      busquedas: ['leche', 'arroz'],
      maxResultadosPorBusqueda: 100,
    });

    await ejecutarBien(escenario);

    expect(desdesPedidos(escenario, 'leche')).toEqual([0, 50]);
    expect(desdesPedidos(escenario, 'arroz')).toEqual([0, 50]);
    expect((await publicacionesDe(PLAZA_VEA)).length).toBe(200);
  });

  test('[F6, decisión 30] el tope cuenta posiciones, no filas: los no disponibles dentro del tope no se reemplazan', async () => {
    const productos = productosEnSerie('leche-pos', 300);
    for (let posicion = 0; posicion < 10; posicion += 1) {
      productos[posicion].items[0].sellers[0].commertialOffer.IsAvailable = false;
    }
    escenario = await prepararEscenario({
      comercios: [{ clave: 'plazaVea', catalogo: { leche: productos } }],
      busquedas: ['leche'],
      maxResultadosPorBusqueda: 100,
    });

    await ejecutarBien(escenario);

    expect(desdesPedidos(escenario, 'leche')).toEqual([0, 50]);
    expect((await publicacionesDe(PLAZA_VEA)).length).toBe(90);
  });

  test('[F7] maxResultadosPorBusqueda = 120 y 1596 resultados → 3 peticiones completas (0–49, 50–99, 100–149) y se usan solo las posiciones 0–119', async () => {
    escenario = await prepararEscenario({
      comercios: [{ clave: 'plazaVea', catalogo: { leche: productosEnSerie('leche-f7', 1596) } }],
      busquedas: ['leche'],
      maxResultadosPorBusqueda: 120,
    });

    await ejecutarBien(escenario);

    expect(paginasPedidas(escenario, 'leche')).toEqual([
      { _from: '0', _to: '49' },
      { _from: '50', _to: '99' },
      { _from: '100', _to: '149' },
    ]);
    const base = escenario.webs[PLAZA_VEA].url;
    const esperadas = Array.from({ length: 120 }, (_, i) => `${base}/leche-f7-${i + 1}/p`).sort();
    expect((await publicacionesDe(PLAZA_VEA)).map(({ url }) => url).sort()).toEqual(esperadas);
  });

  test('[decisión 26] las páginas se piden con ft, _from y _to de 50 en 50, y se para al recibir menos de 50', async () => {
    escenario = await prepararEscenario({
      comercios: [{ clave: 'plazaVea', catalogo: { azúcar: productosEnSerie('azucar-f4', 120) } }],
      busquedas: ['azúcar'],
      maxResultadosPorBusqueda: 1000,
    });

    await ejecutarBien(escenario);

    const paginas = escenario.webs[PLAZA_VEA].busquedas().map(({ query }) => query);
    expect(paginas).toEqual([
      expect.objectContaining({ [PARAMETRO_TEXTO]: 'azúcar', _from: '0', _to: '49' }),
      expect.objectContaining({ [PARAMETRO_TEXTO]: 'azúcar', _from: '50', _to: '99' }),
      expect.objectContaining({ [PARAMETRO_TEXTO]: 'azúcar', _from: '100', _to: '149' }),
    ]);
  });

  test('[F5] ninguna búsqueda devuelve productos → fallo del comercio (comerciosFallidos y entrada en la DLQ)', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'plazaVea',
          catalogo: {
            leche: [productoVtex({ nombre: 'Leche F5', link: '/f5/p', listPrice: 5, price: 5 })],
          },
        },
        { clave: 'metro', catalogo: {} },
      ],
      busquedas: ['leche', 'arroz'],
    });

    const ejecucion = await ejecutarBien(escenario);

    expect(logsFinales(ejecucion.logs)).toEqual([
      expect.objectContaining({ comerciosOk: 1, comerciosFallidos: 1 }),
    ]);
    expect(escenario.dlq().filter((entrada) => entrada.comercio === METRO)).toHaveLength(1);
    expect(await publicacionesDe(METRO)).toEqual([]);
  });

  test('[F5 + B9] solo productos no disponibles cuenta como cero productos → fallo del comercio', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: {
            leche: [
              productoVtex({
                nombre: 'Leche agotada',
                link: '/agotada/p',
                listPrice: 5,
                price: 5,
                disponible: false,
              }),
            ],
          },
        },
      ],
      busquedas: ['leche'],
    });

    const ejecucion = await ejecutarBien(escenario);

    expect(logsFinales(ejecucion.logs)).toEqual([
      expect.objectContaining({ comerciosOk: 0, comerciosFallidos: 1 }),
    ]);
    expect(escenario.dlq().filter((entrada) => entrada.comercio === METRO)).toHaveLength(1);
  });
});
