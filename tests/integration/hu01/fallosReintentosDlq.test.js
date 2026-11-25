'use strict';

/**
 * Contrato HU-01, comportamiento C: fallos, reintentos y DLQ (C1–C6). C7 (plantilla SAM) se
 * verifica por revisión: ver `informes/TESTER-HU-01.md`.
 *
 * Un intento es una petición de búsqueda (término y página). Si la misma petición falla todas las
 * veces, el comercio falla en ese momento y no se sigue buscando (v5, decisión 24).
 */

const { COMERCIOS, CAMPOS_DLQ } = require('../../fixtures/hu01/contratoHu01');
const { productoVtex } = require('../../fixtures/hu01/productosVtex');
const { prepararEscenario } = require('../../helpers/escenarioHu01');
const { publicacionesDe } = require('../../helpers/baseHu01');
const { describirEjecucion } = require('../../helpers/scrapeLocal');
const {
  exigirTablasHu01,
  partirDeBaseLimpia,
  logsFinales,
  sinBarraFinal,
  huella,
} = require('../../helpers/pruebaHu01');

jest.setTimeout(180000);

const WONG = COMERCIOS.wong.slug;
const PLAZA_VEA = COMERCIOS.plazaVea.slug;
const METRO = COMERCIOS.metro.slug;

const fallaSiempre = () => ({ status: 500 });

function catalogo(sufijo, terminos = ['leche']) {
  return Object.fromEntries(
    terminos.map((termino) => [
      termino,
      [
        productoVtex({
          nombre: `${termino} ${sufijo} 1`,
          link: `/${termino}-${sufijo}-1/p`,
          listPrice: 5,
          price: 4.5,
        }),
        productoVtex({
          nombre: `${termino} ${sufijo} 2`,
          link: `/${termino}-${sufijo}-2/p`,
          listPrice: 6,
          price: 6,
        }),
      ],
    ]),
  );
}

async function ejecutarBien(escenario) {
  const ejecucion = await escenario.ejecutar();
  expect({ codigo: ejecucion.codigo, detalle: describirEjecucion(ejecucion) }).toMatchObject({
    codigo: 0,
  });
  return ejecucion;
}

describe('[HU-01 C] fallos, reintentos y DLQ', () => {
  let escenario;

  beforeAll(exigirTablasHu01);
  beforeEach(partirDeBaseLimpia);
  afterEach(async () => {
    if (escenario) await escenario.cerrar();
    escenario = undefined;
  });

  test.each([3, 2])(
    '[C1] robots.txt bien y la búsqueda da 500 siempre, con 3 términos y SCRAPING_MAX_INTENTOS = %i → el endpoint recibe exactamente esas peticiones y el comercio falla',
    async (maxIntentos) => {
      escenario = await prepararEscenario({
        comercios: [
          {
            clave: 'metro',
            catalogo: catalogo('c1', ['leche', 'arroz', 'aceite']),
            alBuscar: fallaSiempre,
          },
        ],
        busquedas: ['leche', 'arroz', 'aceite'],
        maxIntentos,
      });

      const ejecucion = await ejecutarBien(escenario);

      expect(escenario.webs[METRO].busquedas()).toHaveLength(maxIntentos);
      expect(logsFinales(ejecucion.logs)).toEqual([
        expect.objectContaining({ comerciosOk: 0, comerciosFallidos: 1 }),
      ]);
    },
  );

  test('[C1, decisión 24] los reintentos repiten la misma petición (mismo término y página)', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'metro', catalogo: catalogo('c1b', ['leche', 'arroz']), alBuscar: fallaSiempre },
      ],
      busquedas: ['leche', 'arroz'],
    });

    await ejecutarBien(escenario);

    const pedidas = escenario.webs[METRO].busquedas().map(({ query }) => JSON.stringify(query));
    expect(pedidas).toHaveLength(3);
    expect(new Set(pedidas).size).toBe(1);
  });

  test('[C2] una petición de búsqueda da 500 la primera vez y bien la segunda → el comercio se guarda y no hay entrada en la DLQ', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'plazaVea',
          catalogo: catalogo('c2'),
          alBuscar: ({ numero }) => (numero === 1 ? { status: 500 } : null),
        },
      ],
      busquedas: ['leche'],
    });

    await ejecutarBien(escenario);

    expect(await publicacionesDe(PLAZA_VEA)).toHaveLength(2);
    expect(escenario.dlq().filter((entrada) => entrada.comercio === PLAZA_VEA)).toEqual([]);
  });

  test('[C3] intentos agotados → exactamente una entrada en la DLQ con comercio (slug), url (URL base) y motivo', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', catalogo: catalogo('c3') },
        { clave: 'metro', catalogo: catalogo('c3'), alBuscar: fallaSiempre },
      ],
      busquedas: ['leche'],
    });

    await ejecutarBien(escenario);

    const entradas = escenario.dlq();
    const deMetro = entradas.filter((entrada) => entrada.comercio === METRO);
    expect(deMetro).toHaveLength(1);
    for (const campo of CAMPOS_DLQ) expect(deMetro[0]).toHaveProperty(campo);
    expect(sinBarraFinal(deMetro[0].url)).toBe(sinBarraFinal(escenario.webs[METRO].url));
    expect(typeof deMetro[0].motivo).toBe('string');
    expect(deMetro[0].motivo.trim()).not.toBe('');
    expect(entradas.filter((entrada) => entrada.comercio === WONG)).toEqual([]);
  });

  test.each([
    ['no responde dentro de SCRAPING_TIMEOUT_MS', () => ({ colgar: true })],
    ['responde algo que no es JSON', () => ({ status: 200, cuerpo: '<html>no es json</html>' })],
    ['responde JSON que no es una lista', () => ({ status: 206, cuerpo: '{"productos":[]}' })],
    ['responde 429 Too Many Requests', () => ({ status: 429 })],
  ])(
    '[C, definición de fallo] si la web %s, el comercio falla y llega a la DLQ',
    async (_caso, alBuscar) => {
      escenario = await prepararEscenario({
        comercios: [{ clave: 'metro', catalogo: catalogo('cx'), alBuscar }],
        busquedas: ['leche'],
        timeoutMs: 1000,
      });

      const ejecucion = await ejecutarBien(escenario);

      expect(logsFinales(ejecucion.logs)).toEqual([
        expect.objectContaining({ comerciosOk: 0, comerciosFallidos: 1 }),
      ]);
      expect(escenario.dlq().filter((entrada) => entrada.comercio === METRO)).toHaveLength(1);
    },
  );

  test('[C4] 1 de 3 comercios falla siempre → los otros 2 se guardan completos en la misma ejecución', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', catalogo: catalogo('wong', ['leche', 'arroz']) },
        { clave: 'plazaVea', catalogo: catalogo('pv', ['leche', 'arroz']) },
        { clave: 'metro', catalogo: catalogo('metro', ['leche', 'arroz']), alBuscar: fallaSiempre },
      ],
      busquedas: ['leche', 'arroz'],
    });

    await ejecutarBien(escenario);

    expect((await publicacionesDe(WONG)).length).toBe(4);
    expect((await publicacionesDe(PLAZA_VEA)).length).toBe(4);
    expect(await publicacionesDe(METRO)).toEqual([]);
  });

  test('[C5] un comercio con filas guardadas falla → ninguna de sus filas cambia', async () => {
    let fallar = false;
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: catalogo('c5'),
          alBuscar: () => (fallar ? { status: 500 } : null),
        },
      ],
      busquedas: ['leche'],
    });
    await ejecutarBien(escenario);
    const antes = (await publicacionesDe(METRO)).map(huella);
    expect(antes).toHaveLength(2);

    fallar = true;
    escenario.webs[METRO].cambiarCatalogo({
      leche: [
        productoVtex({ nombre: 'leche c5 1', link: '/leche-c5-1/p', listPrice: 9, price: 8 }),
      ],
    });
    await ejecutarBien(escenario);

    expect((await publicacionesDe(METRO)).map(huella)).toEqual(antes);
  });

  test('[C6] falla después de leer parte de sus productos → ninguna de sus filas cambia (todo o nada)', async () => {
    let fallarArroz = false;
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: catalogo('c6', ['leche', 'arroz']),
          alBuscar: ({ termino }) => (fallarArroz && termino === 'arroz' ? { status: 500 } : null),
        },
      ],
      busquedas: ['leche', 'arroz'],
    });
    await ejecutarBien(escenario);
    const antes = (await publicacionesDe(METRO)).map(huella);
    expect(antes).toHaveLength(4);

    fallarArroz = true;
    escenario.webs[METRO].cambiarCatalogo({
      leche: [
        productoVtex({ nombre: 'leche c6 1', link: '/leche-c6-1/p', listPrice: 9, price: 8 }),
        productoVtex({ nombre: 'leche nueva', link: '/leche-nueva/p', listPrice: 3, price: 3 }),
      ],
      arroz: catalogo('c6', ['arroz']).arroz,
    });
    await ejecutarBien(escenario);

    expect((await publicacionesDe(METRO)).map(huella)).toEqual(antes);
  });
});
