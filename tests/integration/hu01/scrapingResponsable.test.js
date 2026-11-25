'use strict';

/**
 * Contrato HU-01, comportamiento D: scraping responsable (D1, D1b, D1c, D1d, D2, D3), con las
 * reglas de robots.txt de la decisión 25 (v5).
 */

const { COMERCIOS, RUTA_BUSQUEDA_VTEX, RUTA_ROBOTS } = require('../../fixtures/hu01/contratoHu01');
const { productoVtex } = require('../../fixtures/hu01/productosVtex');
const { prepararEscenario, USER_AGENT_DE_PRUEBA } = require('../../helpers/escenarioHu01');
const { publicacionesDe } = require('../../helpers/baseHu01');
const { describirEjecucion } = require('../../helpers/scrapeLocal');
const { exigirTablasHu01, partirDeBaseLimpia, logsFinales } = require('../../helpers/pruebaHu01');

jest.setTimeout(180000);

const METRO = COMERCIOS.metro.slug;
const VENTANA_MS = 1000;
// Token de producto del User-Agent de prueba: lo anterior a `/` o al primer espacio (D1b).
const TOKEN_DE_PRODUCTO = USER_AGENT_DE_PRUEBA.split(/[/ ]/)[0];

function catalogo(terminos) {
  return Object.fromEntries(
    terminos.map((termino) => [
      termino,
      [productoVtex({ nombre: `${termino} D`, link: `/${termino}-d/p`, listPrice: 5, price: 5 })],
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

/** Mayor cantidad de peticiones que cae en alguna ventana [t, t + 1 s). */
function maximoEnUnaVentana(peticiones) {
  const instantes = peticiones.map(({ instanteMs }) => instanteMs).sort((a, b) => a - b);
  let maximo = 0;
  for (let i = 0; i < instantes.length; i += 1) {
    const enVentana = instantes.filter((t) => t >= instantes[i] && t < instantes[i] + VENTANA_MS);
    maximo = Math.max(maximo, enVentana.length);
  }
  return maximo;
}

describe('[HU-01 D] scraping responsable', () => {
  let escenario;

  beforeAll(exigirTablasHu01);
  beforeEach(partirDeBaseLimpia);
  afterEach(async () => {
    if (escenario) await escenario.cerrar();
    escenario = undefined;
  });

  test('[D1] robots.txt prohíbe el endpoint de búsqueda para todos (*) → el scraper nunca lo pide', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: catalogo(['leche']),
          robots: `User-agent: *\nDisallow: ${RUTA_BUSQUEDA_VTEX}\n`,
        },
      ],
      busquedas: ['leche'],
    });

    await escenario.ejecutar();

    expect(escenario.webs[METRO].busquedas()).toEqual([]);
  });

  test('[D1 + D1b] el grupo del token de producto del User-Agent prohíbe /api/ → el scraper nunca lo pide, aunque * lo permita', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: catalogo(['leche']),
          robots: `User-agent: ${TOKEN_DE_PRODUCTO}\nDisallow: /api/\n\nUser-agent: *\nAllow: /\n`,
        },
      ],
      busquedas: ['leche'],
    });

    await escenario.ejecutar();

    expect(escenario.webs[METRO].peticiones.filter(({ ruta }) => ruta.startsWith('/api/'))).toEqual(
      [],
    );
  });

  test('[D1b] si hay grupo para el token de producto, se usa ese y no el grupo *', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: catalogo(['leche']),
          robots: `User-agent: *\nDisallow: /\n\nUser-agent: ${TOKEN_DE_PRODUCTO}\nAllow: /\n`,
        },
      ],
      busquedas: ['leche'],
    });

    await ejecutarBien(escenario);

    expect(escenario.webs[METRO].busquedas().length).toBeGreaterThan(0);
    expect(await publicacionesDe(METRO)).toHaveLength(1);
  });

  test('[D1b] /robots.txt se pide una vez por comercio y ejecución, antes de la primera búsqueda', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', catalogo: catalogo(['leche', 'arroz', 'aceite']) },
        { clave: 'metro', catalogo: catalogo(['leche', 'arroz', 'aceite']) },
      ],
      busquedas: ['leche', 'arroz', 'aceite'],
    });

    await ejecutarBien(escenario);

    for (const web of Object.values(escenario.webs)) {
      expect(web.pedidosDeRobots()).toHaveLength(1);
      expect(web.peticiones[0].ruta).toBe(RUTA_ROBOTS);
    }
  });

  test.each([404, 403])(
    '[D1c] /robots.txt responde %i → se asume que no hay reglas y el comercio se guarda normalmente',
    async (status) => {
      escenario = await prepararEscenario({
        comercios: [
          { clave: 'metro', catalogo: catalogo(['leche']), alPedirRobots: () => ({ status }) },
        ],
        busquedas: ['leche'],
      });

      const ejecucion = await ejecutarBien(escenario);

      expect(await publicacionesDe(METRO)).toHaveLength(1);
      expect(logsFinales(ejecucion.logs)).toEqual([
        expect.objectContaining({ comerciosOk: 1, comerciosFallidos: 0 }),
      ]);
    },
  );

  test.each([
    ['responde 500', () => ({ status: 500 })],
    ['responde 503', () => ({ status: 503 })],
    ['no responde dentro de SCRAPING_TIMEOUT_MS', () => ({ colgar: true })],
  ])(
    '[D1d] /robots.txt %s → todo prohibido: el comercio falla sin pedir ninguna búsqueda y va a la DLQ',
    async (_caso, alPedirRobots) => {
      escenario = await prepararEscenario({
        comercios: [{ clave: 'metro', catalogo: catalogo(['leche']), alPedirRobots }],
        busquedas: ['leche'],
        timeoutMs: 1000,
      });

      const ejecucion = await ejecutarBien(escenario);

      expect(escenario.webs[METRO].busquedas()).toEqual([]);
      expect(logsFinales(ejecucion.logs)).toEqual([
        expect.objectContaining({ comerciosOk: 0, comerciosFallidos: 1 }),
      ]);
      expect(escenario.dlq().filter((entrada) => entrada.comercio === METRO)).toHaveLength(1);
    },
  );

  test('[D2] limitePeticionesPorSegundo = 2 → la web nunca recibe más de 2 peticiones en una ventana de 1 s (contando robots.txt)', async () => {
    const terminos = ['leche', 'arroz', 'azúcar', 'atún', 'aceite'];
    escenario = await prepararEscenario({
      comercios: [{ clave: 'metro', catalogo: catalogo(terminos), limitePeticionesPorSegundo: 2 }],
      busquedas: terminos,
    });

    await ejecutarBien(escenario);

    const peticiones = escenario.webs[METRO].peticiones;
    expect(peticiones.length).toBeGreaterThanOrEqual(terminos.length + 1);
    expect(maximoEnUnaVentana(peticiones)).toBeLessThanOrEqual(2);
  });

  test('[D2 + decisión 24] los reintentos también respetan el límite', async () => {
    escenario = await prepararEscenario({
      comercios: [
        {
          clave: 'metro',
          catalogo: catalogo(['leche']),
          limitePeticionesPorSegundo: 2,
          alBuscar: () => ({ status: 500 }),
        },
      ],
      busquedas: ['leche'],
    });

    await ejecutarBien(escenario);

    const peticiones = escenario.webs[METRO].peticiones;
    expect(peticiones.length).toBe(4); // robots.txt + 3 intentos
    expect(maximoEnUnaVentana(peticiones)).toBeLessThanOrEqual(2);
  });

  test('[D3] toda petición lleva User-Agent = SCRAPING_USER_AGENT', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', catalogo: catalogo(['leche', 'arroz']) },
        { clave: 'metro', catalogo: catalogo(['leche', 'arroz']) },
      ],
      busquedas: ['leche', 'arroz'],
    });

    await ejecutarBien(escenario);

    const todas = Object.values(escenario.webs).flatMap((web) => web.peticiones);
    expect(todas.length).toBeGreaterThan(0);
    expect(todas.filter(({ userAgent }) => userAgent !== escenario.userAgent)).toEqual([]);
  });
});
