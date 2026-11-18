# Informe DEV — Sprint 0

**Rama:** `chore/sprint0` · **Commits:** `4b1e15f` (wip), `2c720ec` (`.gitattributes`), `a10631c`
(informe), `35a0e89` (arreglo del build, vuelta 1) y el commit de esta versión del informe ·
**Documento:** `SPRINT0.md` con aclaraciones 1–26 · Sin push.

**Entorno de verificación:** Node **22.23.4** / npm **10.9.9** (pregunta 5), tomado de
`nvm\installs\v22.23.4` en el PATH de cada comando. La terminal por defecto de la sesión había quedado
en Node 26.9.0 / npm 12, que ocultaba el fallo del criterio 10 en la entrega anterior.

## Vuelta 1 — criterio 10 devuelto por el LEAD

- **Causa:** `sam build --build-in-source` con `BuildMethod: esbuild` ejecutaba `npm update` sobre el
  monorepo; con npm 10 podaba `node_modules` (433 → 47) y se perdía `esbuild`.
- **Arreglo (`35a0e89`):** `npm run build:api` (`infra/scripts/bundle-api.js`) empaqueta la Lambda con
  la API de esbuild en `infra/dist/api/health.js` más un `package.json` sin dependencias;
  `infra/template.yaml` usa `CodeUri: dist/api` y `Handler: health.handler`, sin `Metadata` de
  esbuild ni `--build-in-source`. `sam build` solo copia ese paquete: no ejecuta npm sobre el
  monorepo. `infra/dist/` queda ignorado en git, ESLint y Prettier.
- **`package-lock.json`** regenerado con npm 10.9.9 (solo desaparecen los campos `libc` de npm 12).
- **Verificación en clon limpio** (`git clone` de `chore/sprint0` en `35a0e89`, fuera de OneDrive,
  Node 22.23.4): `npm ci` → 0 (433 entradas en `node_modules`); `npm run build` → 0; `node_modules`
  después del build → 433 (intacto, `esbuild` 0.28.2 y `jest` 30.5.2 siguen instalados);
  `npm run lint` → 0; `git status` limpio. El `health.js` generado, aislado, responde 503 con
  `DB_PORT=5999`.

## Qué se construyó

- **Monorepo** con npm workspaces `api`, `scraper` (vacío), `shared`, `web`, más `infra/` y `db/`
  (ADR-0012). CommonJS en raíz/api/shared/scraper; ES Modules en la web (aclaración 13).
- **Scripts** del `package.json` raíz: `dev`, `dev:api`, `dev:web`, `db:check`, `db:migrate`,
  `test` (`jest --selectProjects unit web`), `test:integration`
  (`jest --selectProjects integration`), `lint`, `build`.
- **`shared/`**: `config.js` (único punto de lectura de variables de entorno, carga `.env` con
  dotenv sin `override`), `logger.js` (una línea JSON por evento), `db.js` (cliente `pg`, SSL según
  `DB_SSL`, timeouts de conexión y consulta, una conexión por instancia, listener de errores del pool).
- **`api/`**: `src/handlers/health.js` (Lambda de `GET /v1/health`: `SELECT 1`, `try/catch`,
  200/503, CORS, log con `requestId`, inyección de dependencias) y `src/devServer.js` (servidor HTTP
  que traduce cada petición a un evento HTTP API 2.0 y llama al mismo handler; 404 para otras rutas).
- **`infra/template.yaml`** (SAM): solo la Lambda de salud (`nodejs22.x`, código en `dist/api`
  generado por `infra/scripts/bundle-api.js`) y su HTTP API; configuración por parámetros
  (`DbPassword` con `NoEcho`). `infra/local/dev.js` lanza API y web juntas para `npm run dev`.
- **`db/`**: `check.js`, `migrate.js` (node-pg-migrate), `migrations/1793155625595_base.js` (vacía) y
  `setup-local.sql` (base `comparador_dev` y usuario `comparador_app`; contraseña por `-v`).
- **`web/`**: React + Vite. `/` muestra la salud de la API; `/buscar` es el maquetado estático de
  HU-03 con datos en `web/src/data/searchResultsSample.js` (soles, 2–3 comercios, aclaración 23).
- **Calidad y repo:** `eslint.config.js` (ESLint 9, flat), `.prettierrc.json`, `.prettierignore`,
  `.gitignore`, `.gitattributes` (LF, aclaración 25), `.env.example`.

## Cómo se arranca

1. `npm install`
2. Copiar `.env.example` a `.env` y poner una `DB_PASSWORD` de desarrollo.
3. Una sola vez, como `postgres` (aclaración 18):
   `& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -p 5432 -v app_password=<DB_PASSWORD del .env> -f db/setup-local.sql`
4. `npm run db:check` y `npm run db:migrate`
5. `npm run dev` (o `npm run dev:api` y `npm run dev:web` por separado):
   API en `http://localhost:3000`, web en `http://localhost:5173`.

**Variables de entorno** (todas en `.env.example`): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_SSL`, `DB_CONNECT_TIMEOUT_MS`, `API_PORT` (aceptada en la aclaración 24),
`CORS_ALLOWED_ORIGIN`, `VITE_API_URL`.

## Definition of Done — comandos ejecutados y resultado

No leí ni ejecuté las pruebas del TESTER. Lo marcado "manual" lo comprobé yo con `curl` o con un
render en jsdom fuera del repo; la prueba formal es del TESTER.

| # | Resultado | Evidencia |
|---|---|---|
| 1 | OK | `npm install` → código 0. |
| 2 | OK | `npm run db:check` → código 0, `{"database":"comparador_dev","message":"Base de datos disponible",...}`. |
| 3 | OK | `npm run db:migrate` → código 0, aplica `1793155625595_base`; al repetirlo: `No migrations to run!`. |
| 4 | OK | `npm run dev:api` → `{"port":3000,"message":"API de desarrollo escuchando"}`. |
| 5 | OK (manual) | `curl /v1/health` → `200`, cuerpo `{"status":"ok","db":"ok"}`, `Access-Control-Allow-Origin: http://localhost:5173`. |
| 6 | OK (manual) | Con `DB_PORT=5999`: `503`, `{"status":"degraded","db":"error"}` en 18 ms y 2 ms; el servidor sigue vivo tras dos llamadas. |
| 7 | OK (manual) | `npm run dev:web` sirve `/` y `/buscar` (200) en 5173; en jsdom `/` muestra `API: ok` con la API arriba y `API: no disponible` con la API caída. |
| 8 | NO VERIFICADO | Los scripts `test` y `test:integration` existen según la aclaración 16 y `jest` está instalado; no ejecuto las pruebas del TESTER. |
| 9 | OK | `npm run lint` → código 0 (ESLint + Prettier en todo el repo, incluido `tests/**`; `dashboard/` excluido por la aclaración 24). |
| 10 | OK (vuelta 1) | Clon limpio con Node 22.23.4 / npm 10.9.9: `npm ci && npm run build` → código 0 (`build:api` + `sam build` + Vite) y `node_modules` intacto (433 antes y después); `npm run lint` sigue en 0. El paquete de la Lambda, aislado y sin `node_modules`, responde 503 con `DB_PORT=5999`. |
| 11 | OK (manual) | Cada llamada escribe una línea JSON con `level`, `message` y `requestId`; tres llamadas → tres `requestId` distintos. |
| 12 | OK | Búsqueda de URLs, `localhost`, puertos y credenciales en `api/`, `shared/`, `web/`, `infra/`: solo `api/src/devServer.js:56` (URL armada con el `Host` de la propia petición) e `infra/template.yaml:76` (salida con pseudoparámetros de AWS). El código lee exactamente las 10 variables de `.env.example`. |
| 13 | NO VERIFICADO (formal) | Los cuerpos 200 y 503 coinciden byte a byte con los ejemplos de `openapi.yaml` y no tienen propiedades extra; la validación con `ajv` es prueba del TESTER. |
| 14 | NO VERIFICADO (formal) | `shared/src/db.js:16` → `ssl: dbConfig.ssl ? true : false` (cliente `pg`); la prueba unitaria es del TESTER. |
| 15 | OK | `infra/template.yaml` declara solo `HttpApi` (`:43`) y `HealthFunction` (`:46`); sin RDS, SQS, DLQ ni Scheduler. `scraper/` contiene solo `package.json`. |
| 16 | OK | ADR-0012: `package.json:9` (workspaces). ADR-0009: `infra/template.yaml:2` (Transform SAM), `:52` (`nodejs22.x`). ADR-0008: `web/vite.config.js:3` y `:6` (plugin React). ADR-0002: `shared/src/db.js:2` (`pg`). ADR-0007: `infra/template.yaml:70` y `api/src/devServer.js:9` (`/v1/health`). |
| 17 | — | Eliminado de la DoD (aclaración 26). El alcance "NO se crea" se respeta: migración vacía, sin endpoints ni adaptadores de negocio; la única pantalla de producto es el maquetado estático de `/buscar`. |
| 18 | OK (manual) | jsdom en `/buscar`: campo con `leche`, botón `Buscar`, selectores rotulados `Marca` y `Categoría`, texto `12 productos encontrados para «leche»`. |
| 19 | OK (manual) | 12 tarjetas; las 12 cumplen nombre, marca, tamaño `<n> <g\|kg\|ml\|L>`, `Desde S/ <n.nn>`, `Disponible en <1–3> comercios` y botón `Comparar precios`. |
| 20 | OK (manual) | Cargar `/buscar` en jsdom no hace ninguna petición `fetch`; los datos viven solo en `web/src/data/searchResultsSample.js`. |

## Decisiones internas para revisar

- **Versiones fijadas** por compatibilidad con CommonJS y `babel-jest`: `node-pg-migrate@7` (la v8+ es
  solo ESM), Babel 7 (no 8) y `dotenv@17` en modo `quiet` (para que no imprima texto que no sea JSON).
- **`@babel/core`** agregado: dependencia par obligatoria de `babel-jest` y los presets.
- **`esbuild`** agregado (aprobado por el humano): sin él, `sam build` dejaba la Lambda sin `shared/`,
  `pg` ni `dotenv` (enlace roto a la dependencia local `file:../shared`). Desde la vuelta 1 se
  invoca desde `infra/scripts/bundle-api.js`, no desde SAM.
- **`.prettierignore`** excluye documentación (`*.md`, `docs/`, `adrs/`, etc.) y `dashboard/`.
- **`npm audit`**: 2 vulnerabilidades altas en `glob`, que llega por Jest y node-pg-migrate. Solo
  afectan a herramientas de desarrollo; no entran en la Lambda ni en la web. La corrección forzada
  sube a `node-pg-migrate@9` (solo ESM, rompe la aclaración 13). Propongo aceptarlo como riesgo.
- **Rutas desconocidas en la web** muestran la página de salud (`/`); no hay página 404 porque el
  Sprint 0 no la pide.

## Puede afectar al arnés de pruebas

- El handler se puede importar desde `api/src/handlers/health.js` (`handler` y
  `createHealthHandler`); `api/src/devServer.js` exporta `createDevServer`.
- `App` (`web/src/App.jsx`) elige la página por `window.location.pathname` (o la prop `pathname`).
- La web no importa CSS desde `App.jsx`: solo `web/src/main.jsx` importa `styles.css`.
