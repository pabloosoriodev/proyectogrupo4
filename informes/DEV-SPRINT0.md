# Informe DEV — Sprint 0 (EN CURSO, no es entrega)

**Estado:** trabajo en curso, commit `[DEV] wip: esqueleto Sprint 0 (en curso)`. Todavía no hay
`ENTREGA DEV`.

## Qué está escrito

- Monorepo con npm workspaces `api`, `scraper` (vacío), `shared`, `web`, más `infra/` y `db/`.
- `package.json` raíz con los scripts `dev`, `dev:api`, `dev:web`, `db:check`, `db:migrate`, `test`,
  `test:integration`, `lint`, `build` y las dependencias de desarrollo de la aclaración 17.
- `shared/`: configuración por variables de entorno (`config.js`), logger JSON (`logger.js`) y
  conexión PostgreSQL con SSL según `DB_SSL` (`db.js`).
- `api/`: handler `GET /v1/health` (`src/handlers/health.js`) y servidor de desarrollo
  (`src/devServer.js`) que lo invoca con un evento HTTP API 2.0.
- `infra/template.yaml` (SAM: solo la Lambda de salud y su HTTP API; empaquetado con esbuild) e
  `infra/local/dev.js` (lanza la API y la web juntas para `npm run dev`).
- `db/`: `check.js`, `migrate.js` (node-pg-migrate), migración base vacía y `setup-local.sql`.
- `web/`: SPA React + Vite con `/` (salud de la API) y `/buscar` (maquetado estático de HU-03, datos
  de ejemplo en `web/src/data/searchResultsSample.js`), con precios en soles (`Desde S/ <n.nn>`) y
  2–3 comercios por producto (aclaración 23).
- `eslint.config.js` (ESLint 9, flat config), `.prettierrc.json`, `.prettierignore`, `.gitignore`,
  `.env.example`. El `.env` local está creado y **no** se sube (`git check-ignore .env` lo confirma).

## Verificado hasta ahora

| # | Comando | Resultado |
|---|---|---|
| 1 | `npm install` | Código 0 (649 paquetes + `esbuild`). |
| 9 | `npm run lint` | Código 0: ESLint y Prettier en todo el repo, incluido `tests/**`; `dashboard/` excluido (aclaración 24). |
| 10 | `npm run build` | Código 0: `sam build --build-in-source` (esbuild) genera `.aws-sam/build/HealthFunction/health.js` y Vite compila `web/dist/`. |
| 10 | Paquete de la Lambda aislado | Copiado fuera del repo y sin `node_modules`, el handler con `DB_PORT=5999` responde 503 `{"status":"degraded","db":"error"}` con cabecera CORS y una línea de log JSON con `level`, `message` y `requestId`. |

## Qué falta

1. `npm run db:check` y `npm run db:migrate` contra `comparador_dev` (el humano ya creó la base;
   la migración espera su confirmación).
2. `npm run dev:api`: `GET /v1/health` con 200 y con `DB_PORT=5999` (503).
3. `npm run dev:web`: `/` (`API: ok`) y `/buscar`.
4. Revisión de valores fijos (criterio 12) y versión final de este informe.

## Decisiones internas para revisar

- Versiones fijadas por compatibilidad con CommonJS y `babel-jest`: `node-pg-migrate@7` (la v8+ es
  solo ESM), Babel 7 (no 8), `dotenv@17` en modo `quiet` (para que no imprima texto no JSON).
- Se agregó `@babel/core` (dependencia par obligatoria de `babel-jest` y los presets).
- Se agregó `esbuild` (aprobado por el humano): sin él, `sam build` dejaba la Lambda sin `shared/`,
  `pg` ni `dotenv` (enlace roto a la dependencia local `file:../shared`).
- `API_PORT` aceptada en el criterio 12 (aclaración 24).
- `.prettierignore` excluye documentación (`*.md`, `docs/`, `adrs/`, etc.) y `dashboard/`.
- `npm audit`: 2 vulnerabilidades altas en `glob`, que llega por Jest y node-pg-migrate (solo
  desarrollo; no entra en la Lambda ni en la web). La corrección forzada sube a
  `node-pg-migrate@9` (solo ESM, rompe la aclaración 13). Riesgo aceptado, pendiente de confirmar.

## Comando para el humano (aclaración 18, ya ejecutado)

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -p 5432 -v app_password=<DB_PASSWORD del .env> -f db/setup-local.sql
```
