# Informe TESTER — Sprint 0

**Rama:** `chore/sprint0` · **Fecha:** 2026-10-27 · **Fuentes:** `SPRINT0.md` (Aprobado 2026-10-27),
`openapi.yaml` (0.1.0-sprint0), `encargos/ENCARGO-TESTER-SPRINT0.md`

Pruebas de caja negra escritas contra la DoD y `openapi.yaml`, sin leer las rutas del DEV. La API se
ejercita con su comando observable (`npm run dev:api`) por HTTP; la web, cargando `web/index.html` y
su script de entrada, con una API falsa detrás de `VITE_API_URL`.

**Estado de ejecución: `NO EJECUTADAS`.** Al entregar no existen `package.json` ni `node_modules`
(Jest no instalado). Lo único verificado es la sintaxis (`node --check` de todos los archivos) y que el
arnés falla con un mensaje claro cuando `npm run dev:api` no arranca.

## Criterio de la DoD → prueba

| # | Criterio | Prueba | Proyecto Jest | Estado |
|---|---|---|---|---|
| 5 | `GET /v1/health` → 200 y cuerpo exacto `{ "status": "ok", "db": "ok" }` | `tests/integration/salud.baseDisponible.test.js` — `[DoD 5]` | integration | NO EJECUTADA |
| 6 | Sin base → 503 y `{ "status": "degraded", "db": "error" }` en < `DB_CONNECT_TIMEOUT_MS` + 1 s, sin caerse | `tests/integration/salud.baseNoDisponible.test.js` — `[DoD 6]` × 2 escenarios (base que rechaza / base que no responde) | integration | NO EJECUTADA |
| 7 | La página `/` muestra `API: ok` con 200 y `API: no disponible` si no | `tests/web/paginaSalud.test.js` — `[DoD 7]` (200, 503, API caída) | web | NO EJECUTADA |
| 8 | `npm run test` y `npm run test:integration` terminan con código 0 | Verificable por comando (ver abajo) | — | NO EJECUTADO |
| 11 | Cada invocación de `GET /v1/health` escribe una línea JSON con `level`, `message`, `requestId` | `[DoD 11]` en ambos archivos de integración (con base y sin base) | integration | NO EJECUTADA |
| 13 | Respuestas 200 y 503 validan contra el esquema de `openapi.yaml` | `[DoD 13]` en ambos archivos de integración (`HealthOk` / `HealthDegraded`, con Ajv 2020) | integration | NO EJECUTADA |
| 14 | `DB_SSL=true` pide SSL al cliente PostgreSQL; `DB_SSL=false` no | `tests/unit/conexionSsl.test.js` — `[DoD 14]` (servidor PostgreSQL falso que registra `SSLRequest` vs `StartupMessage`) | unit | NO EJECUTADA |

Los demás criterios (1–4, 9, 10, 12, 15–17) no están en mi encargo: se verifican por comando o revisión.

## Archivos entregados

- `jest.config.js` — proyectos `unit`, `web` (jsdom + `fetch`), `integration`; `maxWorkers: 1`.
- `tests/fixtures/contrato.js` — nombres y valores textuales de la DoD y `openapi.yaml`.
- `tests/fixtures/red.js` — puerto cerrado, host sin respuesta (RFC 5737) y credenciales ficticias.
- `tests/fixtures/entornoJsdomConFetch.js`, `estiloVacio.js`, `archivoVacio.js` — soporte del proyecto `web`.
- `tests/helpers/apiLocal.js` — levanta/detiene `npm run dev:api`, pide `GET /v1/health`, lee los logs.
- `tests/unit/conexionSsl.test.js`, `tests/web/paginaSalud.test.js`,
  `tests/integration/salud.baseDisponible.test.js`, `tests/integration/salud.baseNoDisponible.test.js`.

## Cómo se corren

Requisitos del DEV (no instalados por mí, no son mis rutas):

- devDependencies: `jest`, `jest-environment-jsdom`, `babel-jest`, `@babel/preset-env`,
  `@babel/preset-react`, `babel-plugin-transform-vite-meta-env`, `yaml`, `ajv`.
- scripts sugeridos en el `package.json` raíz:
  - `"test": "jest --selectProjects unit web"`
  - `"test:integration": "jest --selectProjects integration"`

Antes de correr: **ningún `npm run dev:api` levantado** (el arnés lo arranca y lo apaga solo y falla
si el puerto 3000 está ocupado). Para integración, además, PostgreSQL local arriba y `npm run db:check`
en verde.

```
npm run test               # DoD 7 y 14 (no necesita base)
npm run test:integration   # DoD 5, 6, 11 y 13 (necesita la base local)
```

DoD 8 se verifica con esos dos comandos terminando con código 0.

Variables opcionales del arnés (solo pruebas): `TEST_API_URL` (por defecto `servers[0].url` de
`openapi.yaml`), `TEST_API_STARTUP_TIMEOUT_MS` (60000), `TEST_API_REQUEST_TIMEOUT_MS` (15000),
`TEST_DB_HOST_SIN_RESPUESTA` (`192.0.2.1`).

## NO VERIFICADO

- **DoD 5 — "ejecuta `SELECT 1`":** no es observable desde fuera de la API; la prueba verifica el 200 y
  el cuerpo exacto, no la consulta.
- **DoD 6 — "base detenida" literal:** no se detiene el servicio `postgresql-x64-16` (requiere admin).
  Se reproduce apuntando la API a una base que rechaza la conexión y a una que no responde. Si el LEAD
  quiere la verificación literal, es por comando: detener el servicio y pedir `GET /v1/health`.
- **DoD 7 — parte "comando" (`npm run dev:web` sirve en `http://localhost:5173`)** y la web real
  contra la API real en un navegador: fuera de mi encargo (ver pregunta 4).

## Preguntas para el LEAD (lo que `SPRINT0.md` no dice — no lo decidí)

Ninguna bloquea la escritura de las pruebas; sí pueden hacer que fallen por motivos ajenos al contrato.

1. **Precedencia de la configuración:** las pruebas pasan `DB_HOST`, `DB_PORT`, `DB_SSL`,
   `DB_CONNECT_TIMEOUT_MS`, etc. como variables de entorno del proceso de `npm run dev:api`. Asumen que
   esas variables **tienen precedencia sobre `.env`** (lo que hace `dotenv` por defecto). Si la API
   pisa el entorno con `.env`, los criterios 6 y 14 no se pueden probar así. ¿Se confirma esa
   precedencia como parte del contrato (ADR-0010)?
2. **Entrada de la web:** la prueba del criterio 7 carga `web/index.html` y ejecuta su
   `<script type="module" src>`. Asume `web/index.html` (convención de Vite), JavaScript/JSX (no
   TypeScript) y que la URL de la API llega por `import.meta.env.VITE_API_URL`. ¿Confirmado?
3. **Formato del `package.json` raíz:** `jest.config.js` está en CommonJS (`module.exports`). Si el
   `package.json` raíz declara `"type": "module"`, Jest no lo va a poder cargar. ¿El raíz es CommonJS?
4. **CORS:** en local la web (`:5173`) llama a la API (`:3000`), otro origen. La DoD no dice si la API
   responde con cabeceras CORS o si Vite hace de proxy. Sin una de las dos, el criterio 7 falla en el
   navegador real aunque la prueba pase. ¿Cuál es el contrato?
5. **`requestId` en los logs (DoD 11):** la prueba exige que exista y no esté vacío. ¿Tiene que ser
   distinto por invocación, o coincidir con el `requestId` del evento de API Gateway? La DoD no lo dice
   y no lo verifiqué.
6. **Scripts `test` / `test:integration`:** el reparto entre proyectos de Jest depende de que el DEV
   use `--selectProjects` como se sugiere arriba. ¿Se lo pasás al DEV o lo fija el LEAD?
