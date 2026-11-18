# Informe TESTER — Sprint 0 (entrega 2)

**Rama:** `chore/sprint0` · **Fecha:** 2026-11-17 · **Fuentes:** `SPRINT0.md` (Aprobado, con
aclaraciones 11–23 y criterios 18–20), `openapi.yaml` (0.1.0-sprint0),
`encargos/ENCARGO-TESTER-SPRINT0.md`

Pruebas de caja negra escritas contra la DoD, las aclaraciones y `openapi.yaml`, sin leer las rutas del
DEV. La API se ejercita con su comando observable (`npm run dev:api`) por HTTP; la web, cargando
`web/index.html`, navegando a la ruta y ejecutando su script de entrada, con una API falsa detrás de
`VITE_API_URL`.

**Cambios respecto a la entrega 1 (`3c32091`):**

- Aclaración 14: nuevas pruebas de CORS en 200 y 503.
- Aclaración 15: nuevas pruebas de `requestId` distinto por invocación, con base y sin base.
- Criterios 18–20: nuevo `tests/web/maquetadoBuscar.test.js`, con moneda `S/` y N entre 1 y 3
  (aclaración 23 / CAMBIO-01).
- Aclaración 22: `tests/**` y `jest.config.js` pasan ESLint y Prettier.
- Arnés: el lanzador de la API ya no dispara el aviso `DEP0190` de Node en Windows.

## Resultado de la ejecución (2026-11-17, Windows, Node 22.23.4, PostgreSQL 16 local)

| Comando | Resultado |
|---|---|
| `npm run test` (`unit` + `web`) | **código 0** — 3 suites, 15 pruebas, todas en verde |
| `npm run test:integration` | **código 0** — 2 suites, 17 pruebas, todas en verde (contra `comparador_dev`) |
| `npx eslint tests jest.config.js` | código 0 |
| `npx prettier --check tests jest.config.js` | código 0 |
| `npm run lint` (todo el repo) | primera corrida: código 1, por un único error en `dashboard/estado.js:1:1`, fuera de las rutas del TESTER (ver pregunta 1). **Tras excluir `dashboard/**` del lint: código 0** (ESLint sin errores y `prettier --check .` en verde) |

## Criterio de la DoD → prueba

| # | Criterio | Prueba | Proyecto | Estado |
|---|---|---|---|---|
| 5 | `GET /v1/health` → 200 y cuerpo exacto `{ "status": "ok", "db": "ok" }` | `tests/integration/salud.baseDisponible.test.js` — `[DoD 5]` | integration | VERDE |
| 6 | Sin base → 503 y `{ "status": "degraded", "db": "error" }` en < `DB_CONNECT_TIMEOUT_MS` + 1 s, sin caerse | `tests/integration/salud.baseNoDisponible.test.js` — `[DoD 6]` × 2 escenarios (puerto sin base / host que no responde), aclaraciones 11 y 20 | integration | VERDE |
| 7 | La página `/` muestra `API: ok` con 200 y `API: no disponible` si no | `tests/web/paginaSalud.test.js` — `[DoD 7]` (200, 503, API caída) | web | VERDE |
| 8 | `npm run test` y `npm run test:integration` terminan con código 0 | Por comando (aclaración 16) | — | VERDE (ver tabla de ejecución) |
| 11 | Cada invocación escribe una línea JSON con `level`, `message`, `requestId` | `[DoD 11]` en ambos archivos de integración | integration | VERDE |
| 11 + acl. 15 | `requestId` distinto en cada invocación | `[Aclaración 15]` en ambos archivos de integración | integration | VERDE |
| 12 (parte acl. 14) | `Access-Control-Allow-Origin` = `CORS_ALLOWED_ORIGIN` | `[Aclaración 14]` en ambos archivos de integración (con un origen propio de la prueba para demostrar que sale de la variable) | integration | VERDE |
| 13 | Respuestas 200 y 503 validan contra `openapi.yaml` | `[DoD 13]` en ambos archivos de integración (`HealthOk` / `HealthDegraded`, Ajv 2020) | integration | VERDE |
| 14 | `DB_SSL=true` pide SSL; `DB_SSL=false` no | `tests/unit/conexionSsl.test.js` — `[DoD 14]` (PostgreSQL falso que registra `SSLRequest` vs `StartupMessage`) | unit | VERDE |
| 18 | `/buscar`: campo con `leche`, botón `Buscar`, selectores rotulados `Marca` y `Categoría`, texto `12 productos encontrados para «leche»` | `tests/web/maquetadoBuscar.test.js` — `[DoD 18]` (5 pruebas; rótulos por nombre accesible: `<label>`, `aria-label` o `aria-labelledby`) | web | VERDE |
| 19 | ≥ 3 tarjetas con nombre, marca, tamaño, `Desde S/ <n.nn>`, `Disponible en <N> comercios` (N 1–3) y `Comparar precios` | `tests/web/maquetadoBuscar.test.js` — `[DoD 19]` (4 pruebas) | web | VERDE (nombre, marca y tamaño: ver NO VERIFICADO) |
| 20 | `/buscar` no pide `/v1/productos` ni otra ruta de la API distinta de `/v1/health` | `tests/web/maquetadoBuscar.test.js` — `[DoD 20]` (espía `fetch`/`XMLHttpRequest` + registro de la API falsa) | web | VERDE (parte prueba) |

Los demás criterios (1–4, 9, 10, 12, 15–17 y la parte "revisión" del 20) no están en mi encargo: se
verifican por comando o revisión.

## Archivos

- `jest.config.js`: proyectos `unit`, `web` (jsdom + `fetch`) e `integration`, con los nombres que fija
  la aclaración 16, y `maxWorkers: 1`.
- `tests/fixtures/contrato.js`: nombres y valores textuales de la DoD, las aclaraciones y `openapi.yaml`.
- `tests/fixtures/red.js`: puerto cerrado, host sin respuesta (RFC 5737) y credenciales ficticias.
- `tests/fixtures/entornoJsdomConFetch.js`, `estiloVacio.js` y `archivoVacio.js`: soporte del proyecto
  `web`.
- `tests/helpers/apiLocal.js`: levanta y detiene `npm run dev:api`, pide `GET /v1/health` (con
  `Origin`), y lee los logs y sus `requestId`.
- `tests/helpers/paginaWeb.js` (nuevo): abre una ruta de la web, monta la API falsa y espía la red.
- Pruebas:
  - `tests/unit/conexionSsl.test.js`
  - `tests/web/paginaSalud.test.js`
  - `tests/web/maquetadoBuscar.test.js` (nueva)
  - `tests/integration/salud.baseDisponible.test.js`
  - `tests/integration/salud.baseNoDisponible.test.js`

## Cómo se corren

Antes de correr: **ningún `npm run dev:api` levantado**, porque el arnés lo arranca y lo apaga solo y
falla si el puerto 3000 está ocupado. Para integración, además, PostgreSQL local arriba
(`npm run db:check` en verde).

```
npm run test               # DoD 7, 14, 18, 19, 20 (no necesita base)
npm run test:integration   # DoD 5, 6, 11, 13 + aclaraciones 14 y 15 (necesita la base local)
```

Variables opcionales del arnés (solo pruebas):

| Variable | Valor por defecto |
|---|---|
| `TEST_API_URL` | `servers[0].url` de `openapi.yaml` |
| `TEST_API_STARTUP_TIMEOUT_MS` | 60000 |
| `TEST_API_REQUEST_TIMEOUT_MS` | 15000 |
| `TEST_DB_HOST_SIN_RESPUESTA` | `192.0.2.1` |

## NO VERIFICADO

- **DoD 5, "ejecuta `SELECT 1`":** no es observable desde fuera de la API. La prueba verifica el 200 y
  el cuerpo exacto, no la consulta.
- **DoD 19, nombre, marca y tamaño por separado:** la DoD no fija sus valores ni su formato. La prueba
  solo exige que cada tarjeta tenga texto propio además del precio, la disponibilidad y el botón. No
  distingue si están los tres datos (ver pregunta 2).
- **DoD 20, peticiones a la API por otros medios:** solo se observan `fetch` y `XMLHttpRequest`, que es
  lo que usa una SPA. La parte "revisión" (los datos de ejemplo en un único archivo de `web/`) no es mía.
- **DoD 7, parte "comando"** (`npm run dev:web` sirve en `http://localhost:5173`) y la web real contra la
  API real en un navegador: fuera de mi encargo.
- **CORS en preflight (`OPTIONS`):** la aclaración 14 habla de la cabecera de la respuesta. Se verifica
  en el `GET` (que, sin cabeceras propias, el navegador manda sin preflight), no en `OPTIONS`.

## Preguntas para el LEAD (lo que `SPRINT0.md` no dice; no lo decidí)

1. **Resuelta (LEAD, 2026-11-17):** el humano excluyó `dashboard/**` del lint y esa ruta pasa al LEAD.
   `npm run lint` vuelve a correr con código 0. Pregunta original: **`npm run lint` (DoD 9) falla fuera
   de las rutas de TESTER y DEV.** El único error está en
   `dashboard/estado.js:1:1` (`'window' is not defined`, `no-undef`). `dashboard/**` no aparece en el
   mapa de rutas, así que no lo toqué. Además, como el script es `eslint . && prettier --check .`, el
   `prettier --check` de todo el repo no llega a correr mientras ESLint falle. ¿A quién se asigna
   `dashboard/**`, o se excluye del lint?
2. **Pendiente (el LEAD la llevó al humano; la prueba queda como está y el punto sigue NO
   VERIFICADO).** **DoD 19, nombre, marca y tamaño:** ¿hay un formato o valores que la prueba deba exigir (por ejemplo,
   que la marca de cada tarjeta sea una de las opciones del selector `Marca`, o un patrón de tamaño como
   `1 L` / `400 g`)? Sin eso, la prueba no puede distinguirlos.
