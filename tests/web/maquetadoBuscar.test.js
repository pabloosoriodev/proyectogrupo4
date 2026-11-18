'use strict';

/**
 * DoD Sprint 0 — criterios 18, 19 y 20: maquetado estático de "Buscar productos" (HU-03, estado con
 * resultados) en la ruta `/buscar`, con moneda en soles (aclaración 23).
 *
 * Caja negra: se abre `/buscar` desde `web/index.html` y se busca lo que la DoD dice que se ve,
 * por texto y por rótulo accesible, sin depender de clases ni de nombres de componentes.
 *
 * Given: la web con una API falsa en `VITE_API_URL` que solo conoce GET /v1/health.
 * When:  se abre `/buscar`.
 * Then:  los textos, controles y tarjetas de los criterios 18 y 19, y ninguna llamada a la API
 *        fuera de /v1/health (criterio 20).
 */

const {
  CUERPO_SALUD_OK,
  RUTA_SALUD,
  RUTA_BUSCAR,
  BUSQUEDA_INICIAL,
  TEXTO_BOTON_BUSCAR,
  ROTULO_SELECTOR_MARCA,
  ROTULO_SELECTOR_CATEGORIA,
  TEXTO_RESULTADOS,
  MINIMO_TARJETAS,
  FORMATO_PRECIO,
  FORMATO_DISPONIBILIDAD,
  COMERCIOS_MIN,
  COMERCIOS_MAX,
  TEXTO_BOTON_COMPARAR,
  PREFIJO_RUTAS_API,
  RUTA_PRODUCTOS,
} = require('../fixtures/contrato');
const {
  iniciarApiFalsa,
  espiarRed,
  abrirPagina,
  cerrarPagina,
  normalizar,
  textoDe,
  esperarCondicion,
  esperar,
} = require('../helpers/paginaWeb');

jest.setTimeout(30000);

// Tiempo extra tras el render para que cualquier efecto que llame a la red llegue a hacerlo.
const ESPERA_PETICIONES_MS = 1000;

const SELECTOR_BOTONES = 'button, [role="button"], input[type="button"], input[type="submit"]';
const SELECTOR_SELECTORES = 'select, [role="combobox"], [role="listbox"]';
const TIPOS_CAMPO_TEXTO = ['', 'text', 'search'];

function textoDeBoton(boton) {
  return normalizar(boton.tagName === 'INPUT' ? boton.value : boton.textContent);
}

function botonesConTexto(texto, raiz = document) {
  return [...raiz.querySelectorAll(SELECTOR_BOTONES)].filter(
    (boton) => textoDeBoton(boton) === texto,
  );
}

/** Texto de un <label> sin el texto de los controles que tenga adentro (p. ej. las <option>). */
function textoDeRotulo(rotulo) {
  const copia = rotulo.cloneNode(true);
  copia.querySelectorAll('select, input, textarea, button').forEach((control) => control.remove());
  return normalizar(copia.textContent);
}

/** Nombre accesible de un control: aria-labelledby, aria-label o sus <label>. */
function nombreAccesible(control) {
  const idsRotulo = control.getAttribute('aria-labelledby');
  if (idsRotulo) {
    return normalizar(
      idsRotulo
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((nodo) => nodo.textContent)
        .join(' '),
    );
  }
  if (control.getAttribute('aria-label')) return normalizar(control.getAttribute('aria-label'));
  return normalizar([...(control.labels || [])].map(textoDeRotulo).join(' '));
}

function selectorRotulado(rotulo) {
  return [...document.querySelectorAll(SELECTOR_SELECTORES)].find(
    (control) => nombreAccesible(control) === rotulo,
  );
}

function campoDeBusquedaConValor(valor) {
  const campos = [...document.querySelectorAll('input, [role="searchbox"]')].filter(
    (campo) =>
      campo.getAttribute('role') === 'searchbox' || TIPOS_CAMPO_TEXTO.includes(campo.type || ''),
  );
  return campos.find((campo) => campo.value === valor);
}

/**
 * Una tarjeta es el contenedor más grande alrededor de un botón `Comparar precios` que no contiene
 * el botón de otra tarjeta.
 */
function tarjetasDeResultado() {
  return botonesConTexto(TEXTO_BOTON_COMPARAR).map((boton) => {
    let tarjeta = boton;
    while (
      tarjeta.parentElement &&
      tarjeta.parentElement !== document.body &&
      botonesConTexto(TEXTO_BOTON_COMPARAR, tarjeta.parentElement).length === 1
    ) {
      tarjeta = tarjeta.parentElement;
    }
    return tarjeta;
  });
}

/** Lo que verifica el criterio 19 sobre una tarjeta, en un objeto fácil de leer si falla. */
function revisarTarjeta(tarjeta) {
  const texto = textoDe(tarjeta);
  const precio = texto.match(FORMATO_PRECIO);
  const disponibilidad = texto.match(FORMATO_DISPONIBILIDAD);
  const comercios = disponibilidad ? Number(disponibilidad[1]) : null;
  const textoRestante = normalizar(
    texto
      .replace(FORMATO_PRECIO, ' ')
      .replace(FORMATO_DISPONIBILIDAD, ' ')
      .split(TEXTO_BOTON_COMPARAR)
      .join(' '),
  );
  return {
    texto,
    tienePrecioEnSoles: Boolean(precio),
    tieneDisponibilidad: Boolean(disponibilidad),
    comerciosEnRango:
      comercios !== null && comercios >= COMERCIOS_MIN && comercios <= COMERCIOS_MAX,
    botonesComparar: botonesConTexto(TEXTO_BOTON_COMPARAR, tarjeta).length,
    tieneTextoDeProducto: textoRestante.length > 0,
  };
}

describe('maquetado estático de /buscar', () => {
  const VITE_API_URL_ORIGINAL = process.env.VITE_API_URL;
  let apiFalsa;
  let red;

  beforeEach(async () => {
    apiFalsa = await iniciarApiFalsa(200, CUERPO_SALUD_OK);
    process.env.VITE_API_URL = apiFalsa.url;
    red = espiarRed();
    abrirPagina(RUTA_BUSCAR);
    await esperarCondicion(() => textoDe().includes(TEXTO_RESULTADOS));
  });

  afterEach(async () => {
    red.restaurar();
    cerrarPagina();
    await apiFalsa.cerrar();
  });

  afterAll(() => {
    if (VITE_API_URL_ORIGINAL === undefined) delete process.env.VITE_API_URL;
    else process.env.VITE_API_URL = VITE_API_URL_ORIGINAL;
  });

  describe('[DoD 18] controles de búsqueda y resumen de resultados', () => {
    test(`hay un campo de búsqueda con el valor inicial "${BUSQUEDA_INICIAL}"`, () => {
      expect(campoDeBusquedaConValor(BUSQUEDA_INICIAL)).toBeDefined();
    });

    test(`hay un botón con el texto "${TEXTO_BOTON_BUSCAR}"`, () => {
      expect(botonesConTexto(TEXTO_BOTON_BUSCAR).length).toBeGreaterThanOrEqual(1);
    });

    test(`hay un selector rotulado "${ROTULO_SELECTOR_MARCA}"`, () => {
      expect(selectorRotulado(ROTULO_SELECTOR_MARCA)).toBeDefined();
    });

    test(`hay un selector rotulado "${ROTULO_SELECTOR_CATEGORIA}"`, () => {
      expect(selectorRotulado(ROTULO_SELECTOR_CATEGORIA)).toBeDefined();
    });

    test(`muestra el texto "${TEXTO_RESULTADOS}"`, () => {
      expect(textoDe()).toContain(TEXTO_RESULTADOS);
    });
  });

  describe('[DoD 19] tarjetas de resultado', () => {
    test(`hay al menos ${MINIMO_TARJETAS} tarjetas, cada una con un botón "${TEXTO_BOTON_COMPARAR}"`, () => {
      const tarjetas = tarjetasDeResultado();

      expect(tarjetas.length).toBeGreaterThanOrEqual(MINIMO_TARJETAS);
      expect(new Set(tarjetas).size).toBe(tarjetas.length);
    });

    test('cada tarjeta muestra un precio "Desde S/ <n.nn>" (soles, aclaración 23)', () => {
      const revisiones = tarjetasDeResultado().map(revisarTarjeta);

      expect(revisiones.length).toBeGreaterThanOrEqual(MINIMO_TARJETAS);
      expect(revisiones.filter((revision) => !revision.tienePrecioEnSoles)).toEqual([]);
    });

    test(`cada tarjeta muestra "Disponible en <N> comercios" con N entre ${COMERCIOS_MIN} y ${COMERCIOS_MAX}`, () => {
      const revisiones = tarjetasDeResultado().map(revisarTarjeta);

      expect(revisiones.length).toBeGreaterThanOrEqual(MINIMO_TARJETAS);
      expect(revisiones.filter((revision) => !revision.tieneDisponibilidad)).toEqual([]);
      expect(revisiones.filter((revision) => !revision.comerciosEnRango)).toEqual([]);
    });

    test('cada tarjeta tiene texto propio además de precio, disponibilidad y botón (nombre, marca, tamaño)', () => {
      const revisiones = tarjetasDeResultado().map(revisarTarjeta);

      expect(revisiones.length).toBeGreaterThanOrEqual(MINIMO_TARJETAS);
      expect(revisiones.filter((revision) => !revision.tieneTextoDeProducto)).toEqual([]);
    });
  });

  describe('[DoD 20] el maquetado es estático', () => {
    test(`cargar ${RUTA_BUSCAR} no pide ${RUTA_PRODUCTOS} ni otra ruta de la API distinta de ${RUTA_SALUD}`, async () => {
      await esperar(ESPERA_PETICIONES_MS);

      const rutasPedidas = [
        ...red.rutas(),
        ...apiFalsa.peticiones.map(({ ruta }) => new URL(ruta, 'http://api').pathname),
      ];
      const rutasDeApiNoPermitidas = rutasPedidas.filter(
        (ruta) => ruta.startsWith(PREFIJO_RUTAS_API) && ruta !== RUTA_SALUD,
      );

      expect(rutasPedidas.filter((ruta) => ruta.startsWith(RUTA_PRODUCTOS))).toEqual([]);
      expect(rutasDeApiNoPermitidas).toEqual([]);
    });
  });
});
