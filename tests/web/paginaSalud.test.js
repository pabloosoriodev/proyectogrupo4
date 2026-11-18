'use strict';

/**
 * DoD Sprint 0 — criterio 7 (parte "prueba"): la página `/` muestra `API: ok` cuando la API
 * responde 200 y `API: no disponible` si no.
 *
 * Given: la API falsa responde 200 / 503 / no existe, y la web la encuentra en `VITE_API_URL`.
 * When:  se abre la página `/`.
 * Then:  el texto que la DoD dice que se ve.
 */

const {
  CUERPO_SALUD_OK,
  CUERPO_SALUD_DEGRADADA,
  TEXTO_API_OK,
  TEXTO_API_NO_DISPONIBLE,
} = require('../fixtures/contrato');
const { HOST_LOCAL, puertoCerrado } = require('../fixtures/red');
const {
  iniciarApiFalsa,
  abrirPagina,
  cerrarPagina,
  textoDe,
  esperarTexto,
} = require('../helpers/paginaWeb');

jest.setTimeout(30000);

describe('página / de la web', () => {
  const VITE_API_URL_ORIGINAL = process.env.VITE_API_URL;
  let apiFalsa;

  afterEach(async () => {
    cerrarPagina();
    if (apiFalsa) await apiFalsa.cerrar();
    apiFalsa = undefined;
  });

  afterAll(() => {
    if (VITE_API_URL_ORIGINAL === undefined) delete process.env.VITE_API_URL;
    else process.env.VITE_API_URL = VITE_API_URL_ORIGINAL;
  });

  test(`[DoD 7] muestra "${TEXTO_API_OK}" cuando GET /v1/health responde 200`, async () => {
    apiFalsa = await iniciarApiFalsa(200, CUERPO_SALUD_OK);
    process.env.VITE_API_URL = apiFalsa.url;

    abrirPagina('/');

    expect(await esperarTexto(TEXTO_API_OK)).toBe(true);
    expect(textoDe()).not.toContain(TEXTO_API_NO_DISPONIBLE);
    expect(apiFalsa.peticiones).toContainEqual({
      metodo: 'GET',
      ruta: expect.stringMatching(/^\/v1\/health(\?|$)/),
    });
  });

  test(`[DoD 7] muestra "${TEXTO_API_NO_DISPONIBLE}" cuando GET /v1/health responde 503`, async () => {
    apiFalsa = await iniciarApiFalsa(503, CUERPO_SALUD_DEGRADADA);
    process.env.VITE_API_URL = apiFalsa.url;

    abrirPagina('/');

    expect(await esperarTexto(TEXTO_API_NO_DISPONIBLE)).toBe(true);
    expect(textoDe()).not.toContain(TEXTO_API_OK);
  });

  test(`[DoD 7] muestra "${TEXTO_API_NO_DISPONIBLE}" cuando la API no responde`, async () => {
    process.env.VITE_API_URL = `http://${HOST_LOCAL}:${await puertoCerrado()}`;

    abrirPagina('/');

    expect(await esperarTexto(TEXTO_API_NO_DISPONIBLE)).toBe(true);
    expect(textoDe()).not.toContain(TEXTO_API_OK);
  });
});
