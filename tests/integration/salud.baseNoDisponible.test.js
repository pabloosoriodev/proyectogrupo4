'use strict';

/**
 * DoD Sprint 0 — criterios 6, 11 y 13 (respuesta 503), con la base no disponible.
 *
 * "Base detenida" se reproduce sin tocar el servicio de Windows, apuntando la API a una base que
 * no está, en sus dos formas observables:
 *  - rechazo inmediato: puerto local sin nadie escuchando;
 *  - sin respuesta:    host que no contesta, para forzar `DB_CONNECT_TIMEOUT_MS`.
 *
 * Given: la API levantada con `npm run dev:api` y `DB_HOST`/`DB_PORT` apuntando a esa base.
 * When:  GET /v1/health.
 * Then:  503 + { "status": "degraded", "db": "error" } en < DB_CONNECT_TIMEOUT_MS + 1 s, y la API
 *        sigue viva.
 */

const { iniciarApi, pedirSalud, esperarLogsDesde, tieneCamposDeLog } = require('../helpers/apiLocal');
const {
  CUERPO_SALUD_DEGRADADA,
  STATUS_SALUD_DEGRADADA,
  MARGEN_FALLO_SEGURO_MS,
  CAMPOS_LOG,
  erroresContraContrato,
} = require('../fixtures/contrato');
const { HOST_LOCAL, HOST_SIN_RESPUESTA, puertoCerrado, CREDENCIALES_FICTICIAS } = require('../fixtures/red');

jest.setTimeout(120000);

const DB_CONNECT_TIMEOUT_MS = 2000;
const LIMITE_RESPUESTA_MS = DB_CONNECT_TIMEOUT_MS + MARGEN_FALLO_SEGURO_MS;
const CAMPOS_PRESENTES = Object.fromEntries(CAMPOS_LOG.map((campo) => [campo, expect.anything()]));

const ESCENARIOS = [
  ['la base rechaza la conexión', async () => ({ DB_HOST: HOST_LOCAL, DB_PORT: String(await puertoCerrado()) })],
  ['la base no responde', async () => ({ DB_HOST: HOST_SIN_RESPUESTA, DB_PORT: '5432' })],
];

describe.each(ESCENARIOS)('GET /v1/health cuando %s', (_escenario, destinoBase) => {
  let api;

  beforeAll(async () => {
    api = await iniciarApi({
      ...CREDENCIALES_FICTICIAS,
      ...(await destinoBase()),
      DB_SSL: 'false',
      DB_CONNECT_TIMEOUT_MS: String(DB_CONNECT_TIMEOUT_MS),
    });
  });

  afterAll(async () => {
    if (api) await api.detener();
  });

  test(`[DoD 6] responde HTTP 503 con { "status": "degraded", "db": "error" } en menos de ${LIMITE_RESPUESTA_MS} ms`, async () => {
    const respuesta = await pedirSalud();

    expect(respuesta.status).toBe(STATUS_SALUD_DEGRADADA);
    expect(respuesta.cuerpo).toStrictEqual(CUERPO_SALUD_DEGRADADA);
    expect(respuesta.duracionMs).toBeLessThan(LIMITE_RESPUESTA_MS);
  });

  test('[DoD 6] no se cae: después del fallo la API sigue viva y vuelve a responder 503', async () => {
    await pedirSalud();
    const segunda = await pedirSalud();

    expect(api.estaVivo()).toBe(true);
    expect(segunda.status).toBe(STATUS_SALUD_DEGRADADA);
    expect(segunda.cuerpo).toStrictEqual(CUERPO_SALUD_DEGRADADA);
  });

  test('[DoD 13] la respuesta 503 es application/json y valida contra HealthDegraded de openapi.yaml', async () => {
    const respuesta = await pedirSalud();

    expect(respuesta.status).toBe(STATUS_SALUD_DEGRADADA);
    expect(respuesta.contentType).toMatch(/^application\/json\b/);
    expect(erroresContraContrato(STATUS_SALUD_DEGRADADA, respuesta.cuerpo)).toEqual([]);
  });

  test(`[DoD 11] también en fallo, cada invocación escribe una línea JSON con ${CAMPOS_LOG.join(', ')}`, async () => {
    for (let invocacion = 1; invocacion <= 2; invocacion += 1) {
      const desde = api.salida.length;
      await pedirSalud();
      const registros = await esperarLogsDesde(api, desde);

      expect(registros).toContainEqual(expect.objectContaining(CAMPOS_PRESENTES));
      expect(registros.filter(tieneCamposDeLog).length).toBeGreaterThanOrEqual(1);
    }
  });
});
