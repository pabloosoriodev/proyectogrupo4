'use strict';

/**
 * Contrato HU-01, comportamiento A: ejecución diaria con `npm run scrape:local` (A1, A2, A4).
 * A3 (horario en la plantilla SAM) se verifica por revisión: ver `informes/TESTER-HU-01.md`.
 */

const { NIVEL_INFO, SLUGS } = require('../../fixtures/hu01/contratoHu01');
const { productoVtex } = require('../../fixtures/hu01/productosVtex');
const { prepararEscenario } = require('../../helpers/escenarioHu01');
const { publicacionesDe } = require('../../helpers/baseHu01');
const { describirEjecucion } = require('../../helpers/scrapeLocal');
const { exigirTablasHu01, partirDeBaseLimpia, logsFinales } = require('../../helpers/pruebaHu01');

jest.setTimeout(180000);

function catalogoDeUnProducto(sufijo) {
  return {
    leche: [
      productoVtex({
        nombre: `Leche ${sufijo}`,
        link: `/leche-${sufijo}/p`,
        listPrice: 5.9,
        price: 5.9,
      }),
    ],
  };
}

const fallaSiempre = () => ({ status: 500 });

describe('[HU-01 A] ejecución diaria', () => {
  let escenario;

  beforeAll(exigirTablasHu01);
  beforeEach(partirDeBaseLimpia);
  afterEach(async () => {
    if (escenario) await escenario.cerrar();
    escenario = undefined;
  });

  test('[A1] 3 comercios activos que responden bien: código 0, productos guardados y un único log final con comerciosOk = 3 y comerciosFallidos = 0', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', catalogo: catalogoDeUnProducto('wong') },
        { clave: 'plazaVea', catalogo: catalogoDeUnProducto('plaza-vea') },
        { clave: 'metro', catalogo: catalogoDeUnProducto('metro') },
      ],
      busquedas: ['leche'],
    });

    const ejecucion = await escenario.ejecutar();

    expect({ codigo: ejecucion.codigo, detalle: describirEjecucion(ejecucion) }).toMatchObject({
      codigo: 0,
    });
    for (const slug of SLUGS) {
      expect({ slug, filas: (await publicacionesDe(slug)).length }).toEqual({ slug, filas: 1 });
    }
    const finales = logsFinales(ejecucion.logs);
    expect(finales).toHaveLength(1);
    expect(finales[0]).toMatchObject({
      level: NIVEL_INFO,
      comerciosOk: 3,
      comerciosFallidos: 0,
    });
  });

  test('[A2] un comercio con activo: false no recibe ninguna petición; los 2 activos sí', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', activo: false, catalogo: catalogoDeUnProducto('wong') },
        { clave: 'plazaVea', catalogo: catalogoDeUnProducto('plaza-vea') },
        { clave: 'metro', catalogo: catalogoDeUnProducto('metro') },
      ],
      busquedas: ['leche'],
    });

    const ejecucion = await escenario.ejecutar();

    expect(ejecucion.codigo).toBe(0);
    expect(escenario.webs.wong.peticiones).toEqual([]);
    expect(escenario.webs['plaza-vea'].busquedas().length).toBeGreaterThan(0);
    expect(escenario.webs.metro.busquedas().length).toBeGreaterThan(0);
    expect(await publicacionesDe('wong')).toEqual([]);
  });

  test('[A4] 1 de 3 comercios falla siempre: código 0 y log final con comerciosOk = 2 y comerciosFallidos = 1', async () => {
    escenario = await prepararEscenario({
      comercios: [
        { clave: 'wong', catalogo: catalogoDeUnProducto('wong') },
        { clave: 'plazaVea', catalogo: catalogoDeUnProducto('plaza-vea') },
        { clave: 'metro', catalogo: catalogoDeUnProducto('metro'), alBuscar: fallaSiempre },
      ],
      busquedas: ['leche'],
    });

    const ejecucion = await escenario.ejecutar();

    expect({ codigo: ejecucion.codigo, detalle: describirEjecucion(ejecucion) }).toMatchObject({
      codigo: 0,
    });
    const finales = logsFinales(ejecucion.logs);
    expect(finales).toHaveLength(1);
    expect(finales[0]).toMatchObject({ comerciosOk: 2, comerciosFallidos: 1 });
  });
});
