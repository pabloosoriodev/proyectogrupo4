# SPRINT 0 — Comparador de precios entre comercios/supermercados

**Estado:** Aprobado (2026-10-27, humano)
**Fuentes:** `TECH-DESIGN.md`, `adrs/` (0001–0012), `CLAUDE.md`

Objetivo: un esqueleto que funcione de punta a punta en local, sin lógica de negocio:
**web (React) → API (`GET /v1/health`) → PostgreSQL**, con pruebas, lint y build funcionando.

---

## 1. ADRs que aplican (transversales)

| ADR | Decisión | Por qué aplica ahora |
|---|---|---|
| ADR-0002 | PostgreSQL en Amazon RDS | La API necesita conectarse a PostgreSQL para existir; en local se usa un PostgreSQL equivalente (ver pregunta 2). |
| ADR-0008 | Frontend SPA React + Vite | Es la cara del esqueleto: debe compilar, arrancar y llamar a la API. |
| ADR-0009 | Infraestructura como código con AWS SAM | `npm run build` se apoya en `sam build`; el desarrollo local usa un servidor Node (enmienda sin Docker). |
| ADR-0012 | Monorepo con npm workspaces | Define la estructura de carpetas y el mapa de propiedad de rutas. |

## 2. ADRs que NO aplican todavía (de historia)

| ADR | Decisión | Aplica cuando llegue |
|---|---|---|
| ADR-0004 | Scraping híbrido con adaptador por comercio | HU-01 (KAN-1) |
| ADR-0005 | Agrupación con claves duras + `pg_trgm` | HU-02 (KAN-2) |
| ADR-0006 | Búsqueda con `unaccent` + `pg_trgm` | HU-03 (KAN-3) |

## 3. A discutir (mixtos)

| ADR | Qué parte aplica ahora | Qué parte espera a su HU | Pregunta |
|---|---|---|---|
| ADR-0001 | Componentes web, API y base de datos, y la carpeta `scraper/` vacía como workspace | Scheduler, orquestador, colas SQS, DLQ y Lambdas scraper | ¿El pipeline se difiere entero a HU-01? (pregunta 4) |
| ADR-0003 | La conexión a la base acepta SSL por configuración (`DB_SSL`) | Usuarios separados por componente, acceso público endurecido de RDS | ¿Correcto que la red/RDS en AWS no se toca en el Sprint 0? |
| ADR-0007 | Prefijo `/v1` y el endpoint de salud `GET /v1/health` en `openapi.yaml` | `/v1/productos`, `/v1/productos/{id}/precios`, `/v1/categorias` | ¿Quién escribe `openapi.yaml`? (pregunta 6) |
| ADR-0010 | Toda la configuración entra por variables de entorno leídas en un único módulo; `.env.example` las documenta | Lectura desde Parameter Store en AWS; parámetros de negocio (umbrales, comercios) | Ninguna, salvo confirmar que en el Sprint 0 no hay despliegue. |
| ADR-0011 | Logs JSON y `try/catch` en el handler de salud | Reintentos SQS, DLQ y retención de 14 días | Depende de la pregunta 4. |

## 4. Propiedad de rutas

| Rol | Rutas |
|---|---|
| TESTER | `tests/**` (unitarias e integración), `tests/fixtures/**`, `jest.config.js` (raíz), `informes/TESTER-*.md` |
| DEV | `api/**`, `scraper/**`, `shared/**`, `web/**`, `infra/**`, `db/**`, `package.json`, `package-lock.json`, `.eslintrc*`, `.prettierrc*`, `.env.example`, `.gitignore`, `informes/DEV-*.md` |
| Solo LEAD / humano | `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.agents/**`, `skills-lock.json`, `SPRINT0.md`, `openapi.yaml`, `PRD.md`, `TECH-DESIGN.md`, `adrs/**`, `historias-usuario/**`, `docs/**`, `encargos/**`, `informes/VEREDICTO-*.md` |

> Esta tabla también se copia en `CLAUDE.md` → `## Propiedad de rutas` (no existe `AGENTS.md`).
> Las pruebas viven en `tests/` en la raíz (opción permitida por `CLAUDE.md`) para que TESTER y DEV
> no compartan carpetas. `jest` se instala como dependencia en `package.json` (DEV); su configuración
> es del TESTER (pregunta 7).

## 5. Definition of Done — esqueleto

| # | Criterio | Cómo se verifica |
|---|---|---|
| 1 | Las dependencias de todos los workspaces se instalan | comando: `npm install` en la raíz termina sin errores |
| 2 | La base de datos local está disponible | comando: `npm run db:check` se conecta al PostgreSQL 16 local (servicio Windows `postgresql-x64-16`) con las variables de `.env` y termina con código 0 |
| 3 | Las migraciones se ejecutan | comando: `npm run db:migrate` corre sin errores con una migración base vacía (sin tablas de negocio) |
| 4 | La API arranca en local | comando: `npm run dev:api` deja la API escuchando en `http://localhost:3000` (servidor Node de desarrollo que invoca el handler de la Lambda; sin Docker) |
| 5 | Responde en `GET /v1/health` con la base disponible | prueba de integración: HTTP 200 y cuerpo exacto `{ "status": "ok", "db": "ok" }` (ejecuta `SELECT 1`) |
| 6 | Falla de forma segura sin base | prueba de integración: con la base detenida, `GET /v1/health` responde HTTP 503 y `{ "status": "degraded", "db": "error" }` en menos de `DB_CONNECT_TIMEOUT_MS` + 1 s, sin caerse |
| 7 | La web arranca y muestra la salud de la API | comando: `npm run dev:web` sirve en `http://localhost:5173`; prueba: la página `/` muestra el texto `API: ok` cuando la API responde 200, y `API: no disponible` si no |
| 8 | El runner de pruebas se ejecuta | comandos: `npm run test` (unitarias) y `npm run test:integration` (integración con la base local) terminan con código 0 |
| 9 | Lint pasa | comando: `npm run lint` (ESLint + Prettier) termina con código 0 |
| 10 | El build funciona | comando: `npm run build` ejecuta `sam build` sobre `infra/template.yaml` y compila la web sin errores |
| 11 | Logs estructurados | prueba: cada invocación de `GET /v1/health` escribe una línea JSON con `level`, `message` y `requestId` |
| 12 | Sin valores fijos en el código | revisión: conexión, puertos y URL de la API se leen de variables de entorno (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_CONNECT_TIMEOUT_MS`, `CORS_ALLOWED_ORIGIN`, `VITE_API_URL`) documentadas en `.env.example`; búsqueda de credenciales/URLs literales en `api/`, `shared/`, `web/`, `infra/` sin resultados |
| 13 | Cumple el contrato de la API (ADR-0007, parte Sprint 0) | prueba: las respuestas 200 y 503 de `GET /v1/health` validan contra el esquema de `openapi.yaml` |
| 14 | La conexión acepta SSL por configuración (ADR-0003, parte Sprint 0) | prueba unitaria: con `DB_SSL=true` el módulo de conexión pide SSL al cliente PostgreSQL; con `DB_SSL=false` no |
| 15 | La infraestructura se limita al esqueleto (ADR-0001, parte Sprint 0) | revisión: `infra/template.yaml` declara solo la Lambda de salud y su HTTP API; no hay RDS, SQS, DLQ ni Scheduler; `scraper/` existe como workspace vacío |
| 16 | Respeta los ADRs transversales | revisión: monorepo con workspaces `api`, `scraper`, `shared`, `web` (ADR-0012); `infra/template.yaml` en SAM (ADR-0009); web en React + Vite (ADR-0008); cliente PostgreSQL (ADR-0002); ruta bajo `/v1` (ADR-0007) — citando archivo:línea |
| 17 | Cero lógica de negocio | revisión humana: no hay tablas, endpoints, adaptadores ni pantallas de productos, precios, comercios o categorías, **salvo** el maquetado estático de los criterios 18–20 |
| 18 | Existe el maquetado estático de "Buscar productos" (HU-03, estado con resultados) | prueba: la ruta `/buscar` de la web muestra un campo de búsqueda con el valor inicial `leche`, un botón con el texto `Buscar`, un selector rotulado `Marca` y otro rotulado `Categoría`, y el texto `12 productos encontrados para «leche»` |
| 19 | Las tarjetas de resultado muestran los datos de HU-03 | prueba: en `/buscar` hay al menos 3 tarjetas; cada una muestra nombre del producto, marca, tamaño, un precio con el formato `Desde $<número con 2 decimales>`, el texto `Disponible en <N> comercios` y un botón `Comparar precios` |
| 20 | El maquetado es estático | prueba: cargar `/buscar` no hace ninguna petición a `/v1/productos` ni a otra ruta de la API distinta de `/v1/health`; revisión: los datos de ejemplo viven en un único archivo de datos de ejemplo dentro de `web/` |

## 6. Plan

### DEV crea
- Monorepo con npm workspaces `api/`, `scraper/` (vacío), `shared/`, `web/`, más `infra/` y `db/`.
- Scripts en el `package.json` raíz: `dev:api`, `dev:web`, `dev`, `db:check`, `db:migrate`,
  `test`, `test:integration`, `lint`, `build`.
- `.env.example` con todas las variables (la base local es el PostgreSQL 16 instalado en Windows).
- Migraciones con `node-pg-migrate` y cliente `pg`; Node.js 22 (`nodejs22.x` en `template.yaml`).
- `shared/`: módulo de configuración (lee variables de entorno) y logger JSON.
- `api/`: un archivo con el handler de `GET /v1/health` (con `try/catch` y timeout de conexión) y
  un servidor HTTP de desarrollo para `npm run dev:api` que invoca ese mismo handler.
- `infra/template.yaml` (SAM) con la Lambda de salud y su ruta en una HTTP API. Sin RDS, SQS ni
  Scheduler.
- `db/migrations/`: herramienta de migraciones configurada y una migración base vacía.
- `web/`: SPA React + Vite con una página `/` que muestra la salud de la API.
- `web/`: maquetado estático de la página `/buscar` (HU-03, solo estado con resultados) con datos
  de ejemplo fijos, según los criterios 18–20. Referencia visual: pantalla de Stitch
  "HU-03: Buscar productos - Resultados («leche») (Alcance alineado)" del proyecto
  "Comparador de precios — Vistas por HU". Sin login, moneda `$`, sin filtros de país/distancia,
  sin historial, stock, promociones ni carrito. Los filtros y el botón `Comparar precios` son solo
  visuales (no filtran ni navegan).
- Configuración de ESLint + Prettier.

### TESTER crea
- `jest.config.js` en la raíz (proyectos unit/integración, entorno jsdom para la web).
- Pruebas para los criterios 5, 6, 7, 8, 11, 13, 14, 18, 19 y 20 de la sección 5, escritas contra la DoD y
  `openapi.yaml`, no contra el código del DEV.

### NO se crea
- Nada de los ADRs de la sección 2: adaptadores de scraping, agrupación, extensiones `pg_trgm` /
  `unaccent`, búsqueda.
- Ninguna funcionalidad de las HUs: ni tablas de negocio, ni endpoints de productos, precios o
  categorías, ni pantalla de comparación (HU-04). De la búsqueda (HU-03) solo existe el maquetado
  estático de los criterios 18–20: sin búsqueda real, sin estados "sin resultados" ni
  "validación", sin llamada a la API.
- Pipeline de scraping (Scheduler, orquestador, SQS, DLQ), salvo que la pregunta 4 diga lo contrario.
- Ningún despliegue a AWS (ni `sam deploy`, ni RDS, ni Parameter Store real).

## 7. Preguntas abiertas para el humano

Resueltas (2026-10-27, humano):

1. **Repositorio Git:** repositorio existente `https://github.com/pabloosoriodev/proyectogrupo4`;
   el trabajo va en la rama `chore/sprint0` y el PR se abre contra `main`.
2. **Base de datos local:** PostgreSQL 16 instalado en Windows (servicio `postgresql-x64-16`,
   puerto por defecto 5432), sin Docker para la base. Ya instalado (16.15).
3. **Migraciones y cliente SQL:** `node-pg-migrate` + `pg`.
4. **Pipeline de scraping:** se difiere entero a HU-01.
5. **Node.js:** 22 LTS (runtime `nodejs22.x` en Lambda).
6. **`openapi.yaml`:** lo escribe el LEAD con solo `GET /v1/health` antes de invocar a TESTER y DEV.
7. **`jest.config.js`:** lo crea el TESTER; el DEV solo instala `jest` en `package.json`.
8. **Prerrequisitos locales:** sin Docker. Instalados: Node.js 22.23.4 (por defecto con nvm),
   AWS CLI 2.38.6, AWS SAM CLI 1.170.0, GitHub CLI 2.103.3 y PostgreSQL 16.15. Pendiente del humano:
   `gh auth login` y la cuenta/usuario IAM de AWS (no se usa en el Sprint 0, no hay despliegue).
9. **Coordinación:** TESTER y DEV trabajan en sesiones separadas de Claude Code abiertas por el
   humano; el LEAD redacta cada encargo y el humano trae de vuelta las `ENTREGA TESTER` / `ENTREGA DEV`.
10. **API local sin Docker:** `npm run dev:api` arranca un servidor HTTP de Node para desarrollo
    que traduce cada petición a un evento de API Gateway (HTTP API, payload 2.0) y llama al mismo
    handler de la Lambda. `sam local` no se usa; SAM queda para `sam build` y el despliegue.
    Enmienda registrada en ADR-0009.

Aclaraciones durante el ciclo (2026-10-27, humano) — valen igual para TESTER y DEV:

11. **Variables de entorno:** las variables del proceso tienen prioridad sobre `.env` (comportamiento
    por defecto de `dotenv`, sin `override`).
12. **Web:** entrada `web/index.html`, código en JS/JSX (sin TypeScript) y URL de la API leída de
    `import.meta.env.VITE_API_URL`.
13. **Módulos:** el `package.json` raíz y los workspaces `api/`, `shared/` y `scraper/` son CommonJS
    (sin `"type": "module"`); la web usa ES Modules dentro de Vite.
14. **CORS:** la API responde con la cabecera `Access-Control-Allow-Origin` igual al valor de la
    variable `CORS_ALLOWED_ORIGIN` (en local `http://localhost:5173`); no se usa proxy de Vite.
15. **`requestId`:** distinto en cada invocación de la API.
16. **Scripts de pruebas (fijados por el LEAD):** `npm run test` ejecuta
    `jest --selectProjects unit web` y `npm run test:integration` ejecuta
    `jest --selectProjects integration`. Los nombres de proyecto `unit`, `web` e `integration` son
    parte del contrato.
17. **Dependencias de desarrollo para pruebas (las instala el DEV):** `jest`,
    `jest-environment-jsdom`, `babel-jest`, `@babel/preset-env`, `@babel/preset-react`,
    `babel-plugin-transform-vite-meta-env`, `ajv` y `yaml`.
18. **Base local — creación:** el DEV deja `db/setup-local.sql`, que crea la base `comparador_dev`
    y el usuario `comparador_app` (dueño de esa base). La contraseña de ese usuario **no** va escrita
    en el script: se recibe como variable de `psql` (`-v app_password=...`). El humano lo ejecuta
    con `psql` como superusuario `postgres` (solo él conoce esa contraseña).
19. **`.env` local:** lo crea el DEV a partir de `.env.example` con `DB_NAME=comparador_dev`,
    `DB_USER=comparador_app` y una contraseña de desarrollo solo local, que el humano usa al
    ejecutar el script de la aclaración 18. `.env` está en `.gitignore` y **nunca** se sube;
    `.env.example` no lleva secretos.
20. **Uso de la base local:** el DEV puede conectarse, migrar y correr la API contra el PostgreSQL 16
    local para verificar su trabajo. Nadie detiene el servicio `postgresql-x64-16`: el caso "base no
    disponible" (criterio 6) se reproduce con variables de entorno que apuntan a un puerto sin base
    (por ejemplo `DB_PORT=5999`), que tienen prioridad sobre `.env` (aclaración 11).

## 8. Cambios durante el ciclo

| Fecha | Cambio | Aprobado por |
|---|---|---|
| 2026-10-27 | Preguntas 1–6 y 9 resueltas; base local pasa de Docker a PostgreSQL 16 en Windows (DoD 2 y plan ajustados); sin `docker-compose.yml` | Humano |
| 2026-10-27 | Preguntas 7, 8 y 10 resueltas: Jest lo configura el TESTER; sin Docker, API local con servidor Node (DoD 4 ajustado, enmienda ADR-0009); herramientas instaladas | Humano |
| 2026-10-27 | DoD ampliada con criterios 13–15 (contrato, SSL, alcance de infraestructura) | Humano |
| 2026-10-27 | `SPRINT0.md` aprobado; rutas de informes (`informes/`) y encargos (`encargos/`) añadidas al mapa | Humano |
| 2026-10-27 | Aclaraciones 11–17 (entorno, web, módulos, CORS, `requestId`, scripts y dependencias de pruebas) a partir de las dudas del TESTER | Humano |
| 2026-10-27 | Alcance ampliado: maquetado estático de "Buscar productos" (HU-03, solo estado con resultados) en `/buscar`; DoD 17 con excepción y nuevos criterios 18–20; TESTER debe cubrirlos | Humano |
| 2026-10-27 | Aclaraciones 18–20 (creación de la base local, `.env` local y uso de la base) a partir de las dudas del DEV | Humano |
