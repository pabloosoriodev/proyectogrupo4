'use strict';

/**
 * Contrato HU-01, comportamiento E: configuración y logs (E2, E3). E1 (sin valores fijos en
 * `scraper/` y `shared/`) se verifica por revisión: ver `informes/TESTER-HU-01.md`.
 */

const path = require('path');
const {
  VARIABLES,
  NIVEL_ERROR,
  CAMPOS_LOG_SIEMPRE,
  CAMPO_LOG_COMERCIO,
  CAMPO_MAX_RESULTADOS,
} = require('../../fixtures/hu01/contratoHu01');
const { productoVtex } = require('../../fixtures/hu01/productosVtex');
const { prepararEscenario, OMITIR } = require('../../helpers/escenarioHu01');
const { describirEjecucion } = require('../../helpers/scrapeLocal');
const { exigirTablasHu01, partirDeBaseLimpia } = require('../../helpers/pruebaHu01');

jest.setTimeout(180000);

function catalogo(sufijo) {
  return {
    leche: [
      productoVtex({
        nombre: `Leche ${sufijo}`,
        link: `/leche-${sufijo}/p`,
        listPrice: 5,
        price: 4,
      }),
    ],
  };
}

function tieneValor(valor) {
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

describe('[HU-01 E] configuración y logs', () => {
  let escenario;

  afterEach(async () => {
    if (escenario) await escenario.cerrar();
    escenario = undefined;
  });

  describe('[E2] falta configuración: código ≠ 0, log error que nombra lo que falta y ninguna petición a las webs', () => {
    function verificarFalta(ejecucion, nombres) {
      expect({
        codigo: ejecucion.codigo,
        detalle: describirEjecucion(ejecucion),
      }).not.toMatchObject({
        codigo: 0,
      });
      const nombranLoQueFalta = ejecucion.logs
        .filter((log) => log.level === NIVEL_ERROR)
        .filter((log) =>
          nombres.some((nombre) =>
            JSON.stringify(log).includes(JSON.stringify(nombre).slice(1, -1)),
          ),
        );
      expect({
        hayErrorQueLoNombra: nombranLoQueFalta.length > 0,
        detalle: describirEjecucion(ejecucion),
      }).toMatchObject({ hayErrorQueLoNombra: true });
      for (const web of Object.values(escenario.webs)) expect(web.peticiones).toEqual([]);
    }

    beforeEach(async () => {
      escenario = await prepararEscenario({
        comercios: [
          { clave: 'wong', catalogo: catalogo('e2') },
          { clave: 'metro', catalogo: catalogo('e2') },
        ],
        busquedas: ['leche'],
      });
    });

    test.each([
      ['sin definir', { quitar: [VARIABLES.maxIntentos] }],
      ['vacía (decisión 28)', { entorno: { [VARIABLES.maxIntentos]: '' } }],
    ])(`${VARIABLES.maxIntentos} %s`, async (_caso, opciones) => {
      verificarFalta(await escenario.ejecutar(opciones), [VARIABLES.maxIntentos]);
    });

    test.each([
      ['sin definir', { quitar: [VARIABLES.config] }],
      ['vacía (decisión 28)', { entorno: { [VARIABLES.config]: '' } }],
    ])(`${VARIABLES.config} %s`, async (_caso, opciones) => {
      verificarFalta(await escenario.ejecutar(opciones), [VARIABLES.config]);
    });

    test(`${VARIABLES.config} apunta a un archivo que no existe (decisión 28)`, async () => {
      const inexistente = path.join(path.dirname(escenario.rutaConfig), 'no-existe.json');

      const ejecucion = await escenario.ejecutar({ entorno: { [VARIABLES.config]: inexistente } });

      // "Nombra lo que falta": vale la variable o la ruta del archivo que no existe.
      verificarFalta(ejecucion, [VARIABLES.config, inexistente]);
    });

    test.each([
      ['falta', OMITIR],
      ['está vacío', ''],
      ['es null', null],
      ['es 0', 0],
      ['es negativo', -50],
      ['no es entero', 2.5],
      ['no es un número', 'cien'],
    ])(`${CAMPO_MAX_RESULTADOS} %s en el JSON (v6, decisión 30)`, async (_caso, valor) => {
      await escenario.cerrar();
      escenario = await prepararEscenario({
        comercios: [
          { clave: 'wong', catalogo: catalogo('e2') },
          { clave: 'metro', catalogo: catalogo('e2') },
        ],
        busquedas: ['leche'],
        maxResultadosPorBusqueda: valor,
      });

      verificarFalta(await escenario.ejecutar(), [CAMPO_MAX_RESULTADOS]);
    });
  });

  describe('[E3] logs', () => {
    beforeAll(exigirTablasHu01);
    beforeEach(partirDeBaseLimpia);

    test('cada línea de log es JSON con level, message y un mismo ejecucionId; las que nombran un comercio usan su slug', async () => {
      escenario = await prepararEscenario({
        comercios: [
          { clave: 'wong', catalogo: catalogo('e3') },
          { clave: 'metro', catalogo: catalogo('e3'), alBuscar: () => ({ status: 500 }) },
        ],
        busquedas: ['leche'],
      });

      const ejecucion = await escenario.ejecutar();

      expect(ejecucion.lineasNoJson).toEqual([]);
      expect(ejecucion.logs.length).toBeGreaterThan(0);
      const incompletos = ejecucion.logs.filter(
        (log) => !CAMPOS_LOG_SIEMPRE.every((campo) => tieneValor(log[campo])),
      );
      expect(incompletos).toEqual([]);
      expect([...new Set(ejecucion.logs.map((log) => String(log.ejecucionId)))]).toHaveLength(1);

      const slugsConfigurados = escenario.configurados.map(({ slug }) => slug);
      const comerciosEnLogs = ejecucion.logs
        .filter((log) => CAMPO_LOG_COMERCIO in log)
        .map((log) => log[CAMPO_LOG_COMERCIO]);
      expect(comerciosEnLogs.filter((slug) => !slugsConfigurados.includes(slug))).toEqual([]);
      for (const slug of slugsConfigurados) expect(comerciosEnLogs).toContain(slug);
    });
  });
});
