# Veredicto — HU-01 Actualizar precios diariamente mediante scraping

**Fecha:** 2026-11-24 · **LEAD** · **Rama:** `feature/hu-01-scraping` (base `main` `5a65842`, HEAD `905c44e`)
**Spec:** `contratos/CONTRATO-HU-01.md` **v6** (aprobado por el humano el 2026-11-24)
**Entregas:**
- TESTER `09aa18c` — `informes/TESTER-HU-01.md`
- DEV `905c44e` — `informes/DEV-HU-01.md`

## Resultado

**🟢 Cumple (vuelta 1).** Todos los casos del contrato v6 están en verde: 34 cubiertos por pruebas
y 3 por revisión (A3, C7, E1). No hubo devoluciones.

Queda NO VERIFICADO lo que depende de AWS desplegado (decisión 13) y de las webs reales (ver
abajo). El Security Pass del mismo día (`SECURITY-REPORT.md`) no encontró nada que incumpla el
contrato; sus hallazgos están en "Observaciones".

## Cómo se verificó

- Todo se ejecutó con **Node 22.23.4 / npm 10.9.9**, la versión del proyecto.
- Build, lint y pruebas unitarias se repitieron en un **clon limpio de la rama, fuera de OneDrive**
  (`git clone` + `npm ci`).
- Las pruebas de integración se ejecutaron en la carpeta del proyecto contra **`comparador_test`**
  (decisión 29). El humano creó esa base y el LEAD le aplicó la migración con confirmación del
  humano.

| Comando | Resultado |
|---|---|
| `npm ci` (clon limpio) | código 0 — 435 paquetes |
| `npm run build` (clon limpio) | código 0 — "Build Succeeded" (SAM) y Vite; `node_modules` sigue con 435; genera `HealthFunction`, `OrquestadorFunction` y `ScraperFunction` |
| `npm run lint` (clon limpio) | código 0 |
| `npm run test` (clon limpio) | código 0 — 4 suites, **22/22** |
| `npm run db:migrate` con `DB_NAME=comparador_test` | código 0 — `1793155625595_base` y `1794977884792_comercio-publicacion`; tablas `comercio`, `publicacion` y `pgmigrations` |
| `npm run test:integration` (proyecto, `comparador_test`) | código 0 — 8 suites, **85/85** (17 del Sprint 0 y 68 de HU-01), 75 s |
| `sam validate --lint` | "is a valid SAM Template" |
| `npm audit --omit=dev` | 0 vulnerabilidades en producción |

## Matriz de trazabilidad (contrato v6 → evidencia)

| Caso | Resultado | Evidencia |
|---|---|---|
| A1 Ejecución completa | 🟢 | `tests/integration/hu01/ejecucionDiaria.test.js` [A1] |
| A2 Un mensaje por comercio activo | 🟢 | `ejecucionDiaria.test.js` [A2] |
| A3 Horario `cron(0 6 * * ? *)` `America/Lima` | 🟢 revisión | `infra/template.yaml:46-53` (parámetros con esos valores por defecto) y `:217-228` (`AWS::Scheduler::Schedule` con `ScheduleExpression` y `ScheduleExpressionTimezone`); no está fijo en el código |
| A4 Ejecución con fallos (código 0) | 🟢 | `ejecucionDiaria.test.js` [A4] |
| B1–B11 Captura de productos | 🟢 | `capturaProductos.test.js` (14 pruebas: B1–B8, B9 ×3, B10, B11; B6 ×2) |
| C1–C6 Fallos, reintentos, DLQ, aislamiento, conservación, todo o nada | 🟢 | `fallosReintentosDlq.test.js` (6 pruebas) |
| C7 Cola, RedrivePolicy, DLQ única de 14 días, sin `browser` | 🟢 revisión | `infra/template.yaml:117-129`: `ScrapingDlq` con retención 1209600, `ScrapingQueue` con `RedrivePolicy` y `maxReceiveCount` parametrizado (inicial 3); `:183-184`: permiso del scraper para enviar a la DLQ. No hay cola ni Lambda `browser` |
| D1, D1b, D1c, D1d `robots.txt` | 🟢 | `scrapingResponsable.test.js` (7 pruebas) |
| D2 Límite de peticiones (incluidos reintentos) | 🟢 | `scrapingResponsable.test.js` [D2], [D2 + decisión 24] |
| D3 User-Agent | 🟢 | `scrapingResponsable.test.js` [D3] |
| E1 Sin valores fijos | 🟢 revisión | Búsqueda en `scraper/src` y `shared/src` de URLs, hosts de comercios, `cron`, `America/Lima`, intentos, límites y credenciales: sin resultados fuera de comentarios. Toda la configuración se lee en `shared/src/config.js:38-88`. Ninguna configuración con URLs reales en el repositorio |
| E2 Falta configuración (incluido `maxResultadosPorBusqueda`) | 🟢 | `configuracionYLogs.test.js` [E2] (12 variantes) |
| E3 Logs JSON con `ejecucionId` y `comercio` | 🟢 | `configuracionYLogs.test.js` [E3] |
| F1–F7 Productos que se leen, sin filtro de categoría, tope de 100 | 🟢 | `productosLeidos.test.js` (11 pruebas: F1–F4, F5 ×2, F6 ×2, F7) |
| Decisiones 1–30 | 🟢 | Reflejadas en los casos anteriores; las de infraestructura (13, 15, 16) en A3/C7 |

## Propiedad de rutas

Se revisó `git log main..HEAD --name-only`.

| Commit | Rol | Archivos | Hallazgo |
|---|---|---|---|
| `bfb1219` | LEAD | `contratos/`, `encargos/`, `CLAUDE.md`, `.agents/skills/`, `skills-lock.json` | — |
| `d5c0045` | LEAD | `contratos/CONTRATO-HU-01.md` | — |
| `09aa18c` | TESTER | solo `tests/**` e `informes/TESTER-HU-01.md` | — |
| `905c44e` | DEV | solo rutas del DEV (`scraper/`, `shared/`, `db/`, `infra/`, `package*.json`, `.env.example`, `informes/DEV-HU-01.md`, …) | — |

`.env` no está en ningún commit, y ningún commit lleva credenciales.

## Devoluciones

Ninguna.

## NO VERIFICADO (decisión del humano)

1. **La parte de AWS desplegada** (Scheduler real, colas, DLQ, permisos IAM y Parameter Store): no
   hay cuenta ni despliegue (decisión 13). Se verificó por revisión de la plantilla y con
   `sam validate --lint`.
2. **Las webs reales.** Las pruebas usan solo webs VTEX falsas (RN-6). El informe del DEV describe
   una verificación manual autorizada por el humano el 2026-11-24, con los tres comercios OK
   (Metro 482, Plaza Vea 459, Wong 481), sin 429 y con la DLQ vacía. **El LEAD no la repitió**,
   para no volver a consultar las webs reales.
3. **Que `ListPrice` sea el precio tachado que muestra cada web:** sigue NO VERIFICADO desde el
   contrato v2. Solo se comparó el JSON.

## Observaciones (no son rojos del contrato)

- **Security Pass (`SECURITY-REPORT.md`):** sin hallazgos críticos ni altos.
  - **SEC-01 (MEDIUM):** la contraseña de la base va como variable de entorno en la plantilla, con
    un solo usuario para la API y el scraper.
  - **SEC-02 (MEDIUM):** la API pública no tiene throttling.
  - Las dos bloquean el **primer despliegue**, no este veredicto.
  - SEC-03 y SEC-04 (LOW) proponen una nueva versión del contrato.
- **`comparador_dev`** tiene 2643 publicaciones de la verificación manual del DEV contra las webs
  reales.
- **`skills-lock.json`** quedó modificado en la carpeta del proyecto por la instalación de
  `security-pass` (cambio del LEAD, fuera de este veredicto).
