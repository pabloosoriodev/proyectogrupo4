'use strict';

/**
 * Prueba del propio servidor VTEX falso de HU-01 (arnés del TESTER): que acepte el formato de
 * petición de la sección "Paginación de la búsqueda" del contrato v5 y responda como VTEX. No toca
 * código del DEV.
 */

const { RUTA_BUSQUEDA_VTEX, RUTA_ROBOTS } = require('../fixtures/hu01/contratoHu01');
const { productosEnSerie } = require('../fixtures/hu01/productosVtex');
const { iniciarWebVtex, ROBOTS_PERMITE_TODO } = require('../helpers/servidorVtexFalso');

function buscar(web, termino, desde, hasta, cabeceras = {}) {
  const rango = desde === undefined ? '' : `&_from=${desde}&_to=${hasta}`;
  return fetch(`${web.url}${RUTA_BUSQUEDA_VTEX}?ft=${encodeURIComponent(termino)}${rango}`, {
    headers: cabeceras,
  });
}

describe('servidor VTEX falso (arnés)', () => {
  let web;

  afterEach(async () => {
    if (web) await web.cerrar();
    web = undefined;
  });

  test('pagina con _from/_to inclusivos de 50 en 50, con 206 y la cabecera resources', async () => {
    web = await iniciarWebVtex({ catalogo: { azúcar: productosEnSerie('azucar', 120) } });

    const tamanos = [];
    for (const desde of [0, 50, 100]) {
      const respuesta = await buscar(web, 'azúcar', desde, desde + 49);
      expect(respuesta.status).toBe(206);
      expect(respuesta.headers.get('resources')).toBe(`${desde}-${desde + 49}/120`);
      tamanos.push((await respuesta.json()).length);
    }

    expect(tamanos).toEqual([50, 50, 20]);
  });

  test('sin _from/_to devuelve 0–9; un rango de más de 50 responde 400; un término desconocido, lista vacía', async () => {
    web = await iniciarWebVtex({ catalogo: { leche: productosEnSerie('leche', 60) } });

    expect((await (await buscar(web, 'leche')).json()).length).toBe(10);
    expect((await buscar(web, 'leche', 0, 50)).status).toBe(400);
    expect(await (await buscar(web, 'mascotas', 0, 49)).json()).toEqual([]);
  });

  test('resuelve los links relativos contra su propia URL base', async () => {
    web = await iniciarWebVtex({ catalogo: { leche: productosEnSerie('leche', 1) } });

    const [producto] = await (await buscar(web, 'leche', 0, 49)).json();

    expect(producto.link).toBe(`${web.url}/leche-1/p`);
  });

  test('sirve robots.txt y registra cada petición con su ruta, query y User-Agent', async () => {
    web = await iniciarWebVtex();

    const robots = await fetch(`${web.url}${RUTA_ROBOTS}`, {
      headers: { 'User-Agent': 'Prueba/1' },
    });
    await buscar(web, 'arroz', 0, 49, { 'User-Agent': 'Prueba/1' });

    expect(await robots.text()).toBe(ROBOTS_PERMITE_TODO);
    expect(web.peticiones.map(({ ruta, userAgent }) => ({ ruta, userAgent }))).toEqual([
      { ruta: RUTA_ROBOTS, userAgent: 'Prueba/1' },
      { ruta: RUTA_BUSQUEDA_VTEX, userAgent: 'Prueba/1' },
    ]);
    expect(web.busquedas()[0].query).toEqual({ ft: 'arroz', _from: '0', _to: '49' });
  });

  test('alBuscar y alPedirRobots fuerzan estados; numero cuenta las búsquedas', async () => {
    const numeros = [];
    web = await iniciarWebVtex({
      catalogo: { leche: productosEnSerie('leche', 1) },
      alBuscar: ({ numero }) => {
        numeros.push(numero);
        return numero === 1 ? { status: 500 } : null;
      },
      alPedirRobots: () => ({ status: 503 }),
    });

    expect((await buscar(web, 'leche', 0, 49)).status).toBe(500);
    expect((await buscar(web, 'leche', 0, 49)).status).toBe(206);
    expect((await fetch(`${web.url}${RUTA_ROBOTS}`)).status).toBe(503);
    expect(numeros).toEqual([1, 2]);
  });

  test('cambiarCatalogo y reiniciarRegistro preparan la ejecución siguiente', async () => {
    web = await iniciarWebVtex({ catalogo: { leche: productosEnSerie('a', 2) } });
    await buscar(web, 'leche', 0, 49);

    web.cambiarCatalogo({ leche: productosEnSerie('b', 3) });
    web.reiniciarRegistro();

    expect((await (await buscar(web, 'leche', 0, 49)).json()).length).toBe(3);
    expect(web.peticiones).toHaveLength(1);
  });
});
