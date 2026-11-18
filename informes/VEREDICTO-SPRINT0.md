# Veredicto — Sprint 0

**Fecha:** 2026-11-17 · **LEAD** · **Rama:** `chore/sprint0` (base `4fef72e`, HEAD `a10631c`)
**Spec:** `SPRINT0.md` (DoD 1–20, aclaraciones 1–25) · **Mapa de rutas:** `CLAUDE.md`
**Entregas:**
- TESTER: `e343875`, `f0a5e68`, `aa102fd` — `informes/TESTER-SPRINT0.md`
- DEV: `4b1e15f`, `2c720ec`, `a10631c` — `informes/DEV-SPRINT0.md`

## Resultado

**🔴 No cumple todavía: 1 rojo (criterio 10), que se devuelve al DEV.** Los otros 18 criterios
vigentes están en verde; el 17 fue eliminado por el humano (aclaración 26). Quedan 4 puntos
NO VERIFICADO para que decida el humano. No se abre el PR hasta que el criterio 10 esté en verde.

## Cómo se verificó

- Se ejecutó todo en la carpeta del proyecto con **Node 22.23.4** (pregunta 5 de `SPRINT0.md`). La
  terminal tenía Node 26.9.0 por defecto, así que se forzó Node 22 en el `PATH`.
- El build se repitió en un **clon limpio de la rama, fuera de OneDrive** (`git clone` + `npm ci`),
  para descartar problemas del entorno.
- Salidas guardadas fuera del repo (`%TEMP%\ver\`).

| Comando (Node 22.23.4) | Resultado |
|---|---|
| `npm install` | código 0 |
| `npm run test` | código 0 — 3 suites, **16/16** en verde |
| `npm run test:integration` | código 0 — 2 suites, **17/17** en verde |
| `npm run lint` | código 0 — ESLint sin errores; Prettier: "All matched files use Prettier code style!" |
| `npm run db:check` | código 0 — "Base de datos disponible" (`comparador_dev`, localhost:5432) |
| `npm run db:migrate` | código 0 — "No migrations to run!" (migración base ya aplicada) |
| `npm run build` (clon limpio) | **código 1** — `Esbuild Failed: Cannot find esbuild` |
| `npm run build` (clon limpio, Node 26.9.0 / npm 12) | código 0 (solo como diagnóstico) |
| `npm run dev:web` | `http://localhost:5173/` → 200; `/buscar` → 200 |
| `npm audit --omit=dev` | 0 vulnerabilidades en dependencias de producción |

## Definition of Done

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 1 | Dependencias se instalan | 🟢 | `npm install` y `npm ci` → código 0 |
| 2 | Base local disponible | 🟢 | `npm run db:check` → código 0 |
| 3 | Migraciones se ejecutan | 🟢 | `npm run db:migrate` → código 0; migración vacía `db/migrations/1793155625595_base.js:4` |
| 4 | API arranca en :3000 | 🟢 | las pruebas de integración levantan `npm run dev:api` y la consultan; `.env.example:18` `API_PORT=3000` |
| 5 | 200 `{status:ok, db:ok}` | 🟢 | `salud.baseDisponible.test.js:42` en verde (la parte "ejecuta `SELECT 1`" es NO VERIFICADO, ver abajo) |
| 6 | 503 sin base, sin caerse | 🟢 | `salud.baseNoDisponible.test.js:70` y `:78` en verde |
| 7 | Web muestra la salud de la API | 🟢 | `paginaSalud.test.js:44/58/68` en verde; `npm run dev:web` sirve en :5173 (200) |
| 8 | Runner de pruebas | 🟢 | `npm run test` y `npm run test:integration` → código 0 |
| 9 | Lint pasa | 🟢 | `npm run lint` → código 0 (`dashboard/` excluido, aclaración 24) |
| 10 | Build funciona | 🔴 | clon limpio con Node 22: `npm run build` → código 1. El paso `NodejsNpmEsbuildBuilder:NpmUpdate` de `sam build --build-in-source` poda `node_modules` (433 → 47 paquetes) y se pierde `esbuild`. Con Node 26 / npm 12 pasa |
| 11 | Logs JSON | 🟢 | `salud.baseDisponible.test.js:64` y `salud.baseNoDisponible.test.js:102` en verde |
| 12 | Sin valores fijos | 🟢 | las 10 variables (incluida `API_PORT`, aclaración 24) están en `.env.example`. Búsqueda de URLs y credenciales literales en `api/`, `shared/`, `web/src/`, `infra/` y `db/`: solo `api/src/devServer.js:56` (arma la URL con la cabecera `Host`) e `infra/template.yaml:87` (salida `!Sub` de AWS); ninguna es configuración fija. `DbPassword` con `NoEcho` (`infra/template.yaml:22`) |
| 13 | Cumple el contrato | 🟢 | `salud.baseDisponible.test.js:49` y `salud.baseNoDisponible.test.js:87` validan contra `openapi.yaml` |
| 14 | SSL por configuración | 🟢 | `tests/unit/conexionSsl.test.js:79` en verde |
| 15 | Infraestructura acotada | 🟢 | `infra/template.yaml:43` (`HttpApi`) y `:46` (`HealthFunction`) son los únicos recursos; sin RDS, SQS, DLQ ni Scheduler; `scraper/` solo tiene `package.json` |
| 16 | ADRs transversales | 🟢 | workspaces `package.json:9-14` (ADR-0012); SAM `infra/template.yaml` (ADR-0009); React + Vite `web/package.json:13,18` (ADR-0008); `pg` `shared/package.json:12` (ADR-0002); `/v1/health` `infra/template.yaml:68` y `api/src/devServer.js:9` (ADR-0007) |
| 17 | Eliminado (aclaración 26) | — | El humano quitó el criterio de la DoD |
| 18 | Maquetado de `/buscar` | 🟢 | `maquetadoBuscar.test.js:172-189` en verde |
| 19 | Tarjetas con datos de HU-03 | 🟢 | `maquetadoBuscar.test.js:194-224` en verde (precio `S/`, N entre 1 y 3, tamaño `<número> <unidad>`) |
| 20 | Maquetado estático | 🟢 | `maquetadoBuscar.test.js:233` en verde; el único `fetch` es a `/v1/health` (`web/src/api/healthClient.js:9`); los datos de ejemplo están solo en `web/src/data/searchResultsSample.js` |

## Propiedad de rutas

Se revisó `git log 4fef72e..HEAD --name-only`: 22 commits.

- **TESTER** (4 commits, 26 archivos): todos en `tests/**`, `jest.config.js` o `informes/TESTER-*`. Sin hallazgos.
- **DEV** (3 commits, 36 archivos): todos en sus rutas, incluido `.gitattributes` (aclaración 25). Sin hallazgos. `.env` no está en ningún commit.
- **LEAD** (15 commits sin prefijo, en rutas de LEAD/humano): según `CLAUDE.md`, el prefijo solo se exige a TESTER y DEV. `dashboard/` (`6fb803d`) está fuera del proyecto (aclaración 24) y se subió por pedido del humano.

## Devoluciones

| Criterio | A quién | Vuelta | Por qué |
|---|---|---|---|
| 10 | **DEV** | 1 | La prueba es un comando de la DoD ("`npm run build` ejecuta `sam build` … sin errores") y la spec fija Node 22 (pregunta 5). El build falla con Node 22 / npm 10 en un clon limpio, porque `NpmUpdate` poda las dependencias del monorepo y se pierde `esbuild`. Debe pasar con Node 22 en un clon limpio, sin dejar `node_modules` podado. |

## Observaciones (no son rojos)

- **Entorno OneDrive:** en la carpeta del proyecto, `npm run build` falló además con
  `Acceso denegado` sobre `.aws-sam\build\HealthFunction`. Esa carpeta es un *reparse point* de solo
  lectura que dejó la sincronización. El humano ya desactivó la sincronización; habrá que borrar
  `.aws-sam/` (artefacto ignorado) antes del próximo build.
- **Versión de Node:** el informe del DEV no dice con qué versión ejecutó el build. La terminal por
  defecto usa Node 26, que no es la del proyecto.
- **Efecto secundario del build:** después de un build fallido con Node 22, las pruebas y el lint
  dejan de funcionar hasta repetir `npm install`, porque las dependencias quedan podadas.
- **`package-lock.json`:** `npm install` con npm 10 (Node 22) quita los campos `libc` que escribió
  npm 12. Se revirtió para no tocar un archivo del DEV, pero conviene regenerar el lock con la
  versión de npm del proyecto.

## Puntos que estaban NO VERIFICADO (verificados por el LEAD a pedido del humano)

| Punto | Resultado | Evidencia |
|---|---|---|
| DoD 5, "ejecuta `SELECT 1`" | 🟢 | Código: `api/src/handlers/health.js:5` (`HEALTH_QUERY = 'SELECT 1'`) y `:26` (`getPool().query(HEALTH_QUERY)`). En ejecución: con la API levantada, `pg_stat_activity` de `comparador_dev` muestra la conexión de la API con última consulta `SELECT 1` |
| DoD 19, nombre y marca por separado | 🟢 | `web/src/components/ProductCard.jsx:8-12`: el nombre va en un `h3` (`product-card__name`) y la marca en otro elemento (`product-card__brand`). Los 12 productos de `web/src/data/searchResultsSample.js` tienen nombre y marca no vacíos y distintos entre sí. La captura de `/buscar` en Chrome los muestra en líneas separadas |
| Web real contra API real en un navegador | 🟢 | `npm run dev:api` + `npm run dev:web` y Chrome headless (1280×900): `/` muestra "Estado del sistema — API: ok"; `/buscar` muestra "12 productos encontrados para «leche»", 12 tarjetas con "Desde S/ n.nn", "Disponible en N comercios" (N entre 2 y 3) y "Comparar precios". `GET /v1/health` con `Origin: http://localhost:5173` → 200 y `Access-Control-Allow-Origin: http://localhost:5173` |
| Paquete de la Lambda | 🟢 (local) | El `health.js` generado por `sam build` (199 KB, sin `node_modules`), copiado a una carpeta aislada e invocado con Node 22 y un evento HTTP API 2.0: con base → `200 {"status":"ok","db":"ok"}`; con `DB_PORT=5999` → `503 {"status":"degraded","db":"error"}`. El paquete se generó con Node 26, porque con Node 22 el build falla (criterio 10) |

**Sigue NO VERIFICADO:**
- **La Lambda desplegada en AWS:** el Sprint 0 no incluye despliegue y no hay cuenta de AWS configurada.
  Se verificó el paquete, no el servicio en la nube.

**Observación de CORS:** `OPTIONS /v1/health` responde 404 en el servidor local. No afecta al
Sprint 0: la web hace un `GET` sin cabeceras propias, que el navegador envía sin preflight, y la
aclaración 14 solo pide la cabecera en la respuesta. Hay que tenerlo en cuenta cuando una HU agregue
peticiones con cabeceras propias.

## Riesgos aceptados por el humano

- **`npm audit`:** 2 vulnerabilidades altas en `glob`, solo en dependencias de desarrollo (vía Jest y
  `node-pg-migrate`). Las de producción están limpias (`npm audit --omit=dev` → 0). Aceptado por
  ahora (2026-11-17).
