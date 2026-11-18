'use strict';

/**
 * DoD Sprint 0 — criterios 5, 11 y 13 (respuesta 200), con la base local disponible, más las
 * aclaraciones 14 (CORS) y 15 (requestId distinto por invocación).
 *
 * Given: PostgreSQL 16 local arriba con las variables de `.env` (`npm run db:check` en verde)
 *        y la API levantada con `npm run dev:api`.
 * When:  GET /v1/health.
 * Then:  lo que dicen la DoD, las aclaraciones y `openapi.yaml`.
 */

const {
  iniciarApi,
  pedirSalud,
  invocarYLeerLogs,
  requestIdsRepetidos,
} = require('../helpers/apiLocal');
const {
  CUERPO_SALUD_OK,
  STATUS_SALUD_OK,
  CAMPOS_LOG,
  ORIGEN_CORS_DE_PRUEBA,
  erroresContraContrato,
} = require('../fixtures/contrato');

jest.setTimeout(120000);

const CAMPOS_PRESENTES = Object.fromEntries(CAMPOS_LOG.map((campo) => [campo, expect.anything()]));

describe('GET /v1/health con la base de datos disponible', () => {
  let api;

  beforeAll(async () => {
    api = await iniciarApi({ CORS_ALLOWED_ORIGIN: ORIGEN_CORS_DE_PRUEBA });
  });

  afterAll(async () => {
    if (api) await api.detener();
  });

  test('[DoD 5] responde HTTP 200 con el cuerpo exacto { "status": "ok", "db": "ok" }', async () => {
    const respuesta = await pedirSalud();

    expect(respuesta.status).toBe(STATUS_SALUD_OK);
    expect(respuesta.cuerpo).toStrictEqual(CUERPO_SALUD_OK);
  });

  test('[DoD 13] la respuesta 200 es application/json y valida contra HealthOk de openapi.yaml', async () => {
    const respuesta = await pedirSalud();

    expect(respuesta.status).toBe(STATUS_SALUD_OK);
    expect(respuesta.contentType).toMatch(/^application\/json\b/);
    expect(erroresContraContrato(STATUS_SALUD_OK, respuesta.cuerpo)).toEqual([]);
  });

  test('[Aclaración 14] la respuesta 200 lleva Access-Control-Allow-Origin igual a CORS_ALLOWED_ORIGIN', async () => {
    const respuesta = await pedirSalud({ origen: ORIGEN_CORS_DE_PRUEBA });

    expect(respuesta.status).toBe(STATUS_SALUD_OK);
    expect(respuesta.origenPermitido).toBe(ORIGEN_CORS_DE_PRUEBA);
  });

  test(`[DoD 11] cada invocación escribe una línea JSON con ${CAMPOS_LOG.join(', ')}`, async () => {
    const invocaciones = await invocarYLeerLogs(api, 3);

    for (const { registros } of invocaciones) {
      // Si falla, Jest muestra todos los registros JSON que sí se escribieron en esa invocación.
      expect(registros).toContainEqual(expect.objectContaining(CAMPOS_PRESENTES));
    }
  });

  test('[Aclaración 15] el requestId es distinto en cada invocación', async () => {
    const invocaciones = await invocarYLeerLogs(api, 3);

    for (const { requestIds } of invocaciones) {
      expect(requestIds.length).toBeGreaterThanOrEqual(1);
    }
    expect(requestIdsRepetidos(invocaciones)).toEqual([]);
  });
});
