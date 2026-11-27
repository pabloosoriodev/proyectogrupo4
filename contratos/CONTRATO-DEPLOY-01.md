# CONTRATO — DEPLOY-01 Preparación del despliegue

**Tipo:** Feature
**Versión:** v2
**Estado:** Aprobado (2026-11-26, humano). Se construye en **dos entregas** (ver "Entregas").
**Origen:** [`DEPLOY-PLAN.md`](../DEPLOY-PLAN.md) (aprobado por el humano el 2026-11-26, con los
valores de SEC-02 decididos por el LEAD) y [`SECURITY-REPORT.md`](../SECURITY-REPORT.md) SEC-01 y
SEC-02, que bloquean el primer despliegue.

**Alcance:** todo lo que hace falta para poder desplegar, **sin desplegar**. Nada de esta unidad
toca AWS: no hay cuenta, y cada acción real se autoriza aparte según `DEPLOY-PLAN.md`.

---

## Entregas (v2, decisión 12)

| Entrega | Secciones | Qué cierra |
|---|---|---|
| **1 — Seguridad y base** | **A, B, C, E, F** | SEC-01 y SEC-02 en el código y la plantilla actuales; `samconfig.toml` con los parámetros que existen hoy; Node 22 obligatorio |
| **2 — Infraestructura y scripts** | **D, G, H** | RDS, S3 y CloudFront en la plantilla (incluido D4, que reemplaza `DbHost`/`DbPort` por `!GetAtt`); `samconfig.toml` ampliado con los parámetros nuevos; `deploy:prod` y `deploy:web` |

- Cada entrega tiene su propio veredicto. La entrega 2 empieza cuando la 1 está en verde.
- Los nombres de la sección "Nombres que no se negocian" valen para las dos entregas.

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| `DEPLOY-PLAN.md`: Build, Artifact, Config & Secrets, Infraestructura, Estrategia de release, Deploy gates, Recovery | Diseño aprobado que este contrato vuelve observable |
| `SECURITY-REPORT.md` SEC-01 | Contraseña en variables de entorno y un solo usuario con escritura |
| `SECURITY-REPORT.md` SEC-02 | Sin throttling ni concurrencia reservada |
| ADR-0002 | RDS PostgreSQL en la clase del free tier; una conexión por Lambda |
| ADR-0003 | RDS público endurecido, SSL obligatorio, usuarios por componente (la API solo lee) |
| ADR-0008 | Web estática en S3 + CloudFront; rutas desconocidas a `index.html` |
| ADR-0009 | SAM como infraestructura como código |
| ADR-0010 | Secretos `SecureString` en Parameter Store, leídos por la Lambda al arrancar |
| `CONTRATO-HU-01.md` v6, decisión 17 | El scraper usa `comparador_app` "hasta el despliegue". **Este contrato la reemplaza** (decisión 1) |
| `openapi.yaml` y DoD 5 del Sprint 0 | La salud ejecuta `SELECT 1` en cada petición; por eso no se cachea |
| `CLAUDE.md` | Rutas de cada rol, sin valores fijos, confirmación humana para migraciones y despliegue |

## Interfaz observable

Sin AWS, esta unidad se observa por:

1. **`infra/template.yaml`**: recursos, propiedades y parámetros, verificables leyendo el YAML
   (con las etiquetas de CloudFormation) y con `sam validate --lint`.
2. **`infra/samconfig.toml`**: valores de despliegue sin secretos.
3. **La base local**: qué puede hacer cada usuario en `comparador_dev` y `comparador_test`.
4. **Los comandos** `npm run deploy:prod` y `npm run deploy:web`: códigos de salida, mensajes y qué
   comandos externos (`git`, `sam`, `aws`) invocan y en qué orden. En las pruebas, `sam` y `aws`
   son **falsos** en el `PATH`; nunca se llama a AWS real.
5. **`.nvmrc`, `.npmrc` y `package.json`**: la versión de Node y su obligatoriedad.

## Comportamiento

### A. Usuarios de base de datos separados (SEC-01, ADR-0003)

`db/setup-local.sql` crea, además de `comparador_app` (dueño de la base y usuario de migraciones,
decisión 2), estos usuarios con contraseñas recibidas como variables de `psql` (nunca escritas en el
archivo):

| Usuario | Permisos sobre `comercio` y `publicacion` |
|---|---|
| `comparador_api` | Solo `SELECT` |
| `comparador_scraper` | `SELECT`, `INSERT` y `UPDATE` (no `DELETE`) |

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| A1 API solo lee | Conectado como `comparador_api`: `SELECT`, y luego `INSERT`, `UPDATE` y `DELETE` en `publicacion` | `SELECT` funciona; `INSERT`, `UPDATE` y `DELETE` fallan por permisos (código SQL `42501`) | SEC-01; ADR-0003 |
| A2 Scraper escribe precios | Conectado como `comparador_scraper`: `SELECT`, `INSERT` y `UPDATE` en `comercio` y `publicacion`, y `DELETE` en `publicacion` | Los tres primeros funcionan; `DELETE` falla con `42501` (decisión 6 de HU-01: no se borra) | ADR-0003; HU-01 |
| A3 Nadie más cambia el esquema | Como `comparador_api` o `comparador_scraper`: `CREATE TABLE x (id int)` | Falla con `42501` | ADR-0003 |
| A4 Cada proceso usa su usuario | `npm run dev:api` y `npm run scrape:local` | La API se conecta con `DB_API_USER`/`DB_API_PASSWORD` y el scraper con `DB_SCRAPER_USER`/`DB_SCRAPER_PASSWORD`. `db:migrate` y `db:check` siguen con `DB_USER`/`DB_PASSWORD` | Decisión 3 |
| A5 Todo lo anterior sigue en verde | Las 85 pruebas de integración y las 22 unitarias, adaptadas a A4 | Código 0 | Sprint 0 y HU-01 |
| A6 Idempotente | `setup-local.sql` ejecutado dos veces | Sin errores; solo actualiza contraseñas y permisos | Patrón de la aclaración 18 |

### B. Secretos fuera de las variables de entorno (SEC-01, ADR-0010)

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| B1 Sin contraseñas en la plantilla | Revisión de `infra/template.yaml` | Ninguna función tiene `DB_PASSWORD`, `DB_API_PASSWORD` ni `DB_SCRAPER_PASSWORD` en `Environment`; no existe el parámetro `DbPassword` | SEC-01 |
| B2 Una credencial por función | Revisión de la plantilla | Cada función que usa la base recibe solo el **nombre** de su parámetro en `DB_CREDENTIALS_PARAMETER`: `/comparador/prod/db/api` (salud), `/comparador/prod/db/scraper` (scraper y orquestador) | Decisión 4 |
| B3 Permiso mínimo | Revisión de la plantilla | Cada función tiene `ssm:GetParameter` **solo** sobre su propio parámetro | SEC-01; ADR-0010 |
| B4 Formato del secreto | Documentación en `.env.example` | El `SecureString` es un JSON `{ "user": "...", "password": "..." }` | Decisión 4 |
| B5 Local no cambia | Sin `DB_CREDENTIALS_PARAMETER` | Se usan las variables de A4; nunca se llama a AWS en local | Decisión 4 |

### C. Límites de la API y concurrencia (SEC-02)

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| C1 Throttling | Revisión de la plantilla | `HttpApi` con `DefaultRouteSettings.ThrottlingRateLimit` = `!Ref ApiThrottlingRateLimit` (por defecto 20) y `ThrottlingBurstLimit` = `!Ref ApiThrottlingBurstLimit` (por defecto 40) | DEPLOY-PLAN (SEC-02) |
| C2 Concurrencia reservada | Revisión de la plantilla | Parámetros `HealthReservedConcurrency` (10), `ScraperReservedConcurrency` (3) y `OrquestadorReservedConcurrency` (1) aplicados a `ReservedConcurrentExecutions` de cada función | DEPLOY-PLAN (SEC-02) |
| C3 Cero = sin reserva | Un `*ReservedConcurrency` = `0` | Esa función **no** tiene `ReservedConcurrentExecutions` (condición de CloudFormation con `AWS::NoValue`) | DEPLOY-PLAN (cuentas nuevas con cuota de 10) |
| C4 Sin caché | Revisión de la plantilla y del handler | La salud sigue ejecutando `SELECT 1` en cada petición | `openapi.yaml`; DoD 5 |

### D. RDS, S3 y CloudFront en la plantilla (ADR-0002, 0003, 0008)

| Caso | Recurso | Propiedades exigidas | Origen |
|---|---|---|---|
| D1 Base | `AWS::RDS::DBInstance` | `Engine: postgres`, `EngineVersion` desde un parámetro (16.x); `DBInstanceClass` desde un parámetro (por defecto `db.t4g.micro`); `AllocatedStorage: 20`; `PubliclyAccessible: true`; `StorageEncrypted: true`; `BackupRetentionPeriod: 7`; `DeletionProtection: true`; `ManageMasterUserPassword: true`; `DeletionPolicy: Snapshot` y `UpdateReplacePolicy: Snapshot` | DEPLOY-PLAN; ADR-0002, 0003 |
| D2 SSL obligatorio | Grupo de parámetros de la base | `rds.force_ssl` = `1`; las funciones reciben `DB_SSL=true` | ADR-0003 |
| D3 Red | Grupo de seguridad de la base | Solo el puerto 5432 abierto (las Lambdas no tienen IP fija, ADR-0003) | ADR-0003 |
| D4 Host desde el stack | Funciones | `DB_HOST` y `DB_PORT` salen de `!GetAtt` del `DBInstance`, no de parámetros | Decisión 5 |
| D5 Bucket de la web | `AWS::S3::Bucket` | `PublicAccessBlockConfiguration` con los cuatro valores en `true`; cifrado por defecto; política del bucket que solo permite `s3:GetObject` a CloudFront (`aws:SourceArn` de la distribución) | ADR-0008; DEPLOY-PLAN |
| D6 CDN | `AWS::CloudFront::Distribution` + `OriginAccessControl` | Origen S3 con OAC; `ViewerProtocolPolicy: redirect-to-https`; `DefaultRootObject: index.html`; errores 403 y 404 → `/index.html` con respuesta 200; `PriceClass_100` | ADR-0008 |
| D7 CORS | Función de salud | `CORS_ALLOWED_ORIGIN` desde el parámetro `CorsAllowedOrigin` (en el primer despliegue la URL aún no existe; ver "Estrategia de release" del plan) | DEPLOY-PLAN |
| D8 Salidas | `Outputs` | `HttpApiUrl`, `WebUrl` (URL de CloudFront), `WebBucketName`, `WebDistributionId`, `DbEndpoint` | Decisión 7 |
| D9 Válida | `sam validate --lint --template-file infra/template.yaml` | Código 0 | ADR-0009 |

### E. Valores de despliegue sin secretos

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| E1 `samconfig.toml` | `infra/samconfig.toml`, entorno `prod` | `stack_name = "comparador-prod"`, `region = "us-east-1"`, `confirm_changeset = true`, `capabilities = "CAPABILITY_IAM"`, `resolve_s3 = true` y `parameter_overrides` con todos los parámetros que no son secretos | DEPLOY-PLAN |
| E2 Sin secretos | Búsqueda en `infra/samconfig.toml` | Ninguna contraseña, clave ni token | SEC-01; `CLAUDE.md` |

### F. Versión de Node obligatoria

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| F1 `.nvmrc` | Archivo en la raíz | Contenido `22.23.4` | DEPLOY-PLAN (Build) |
| F2 `engines` | `package.json` | `"engines": { "node": "22.x", "npm": "10.x" }` | DEPLOY-PLAN (Build) |
| F3 Obligatoria | `npm ci` con Node 26 / npm 12 | Falla (código ≠ 0, `EBADENGINE`), por `engine-strict=true` en `.npmrc` | Decisión 8; lección del Sprint 0 (criterio 10) |

### G. `npm run deploy:prod` (gates y despliegue del stack)

Cada bloqueo termina con **código 1** y una línea en la salida de error que empieza con
**`DEPLOY BLOQUEADO: `** seguida del motivo. **En ningún bloqueo se invoca `sam deploy`.**

| Caso | Situación | Salida esperada | Origen |
|---|---|---|---|
| G1 Rama | No es `main` | Bloqueo con un motivo que nombra la rama | DEPLOY-PLAN (gates) |
| G2 Cambios sin commit | `git status --porcelain` no vacío | Bloqueo | DEPLOY-PLAN |
| G3 Sin etiqueta | `HEAD` sin una etiqueta `vX.Y.Z` | Bloqueo | DEPLOY-PLAN (Artifact) |
| G4 Node | `node -v` distinto de `v22.23.4` | Bloqueo que muestra la versión encontrada | DEPLOY-PLAN (Build) |
| G5 Checks en orden | Todo lo anterior bien | Ejecuta en este orden y se detiene en el primero que falle: `npm ci`, `npm run lint`, `npm run test`, `npm run test:integration`, `npm audit --omit=dev --audit-level=high`, `sam validate --lint --template-file infra/template.yaml`, `npm run build` | DEPLOY-PLAN (gates) |
| G6 Un check falla | Cualquiera de G5 termina con código ≠ 0 | Bloqueo que nombra el check; no se ejecutan los siguientes | DEPLOY-PLAN |
| G7 Despliegue | Todos los checks en verde | Invoca exactamente `sam deploy --config-file infra/samconfig.toml --config-env prod --tags commit=<SHA de HEAD> version=<etiqueta>`; `confirm_changeset` hace que `sam` pida confirmación | DEPLOY-PLAN (Release) |
| G8 Resultado | `sam deploy` termina | El comando termina con el mismo código de salida que `sam` | — |

### H. `npm run deploy:web` (subida de la web)

| Caso | Situación | Salida esperada | Origen |
|---|---|---|---|
| H1 Mismos bloqueos | Gates G1–G4 | Iguales que en G (`DEPLOY BLOQUEADO: …`), sin llamar a `aws` | DEPLOY-PLAN |
| H2 Destino desde el stack | Todo bien | Lee `WebBucketName`, `WebDistributionId` y `HttpApiUrl` con `aws cloudformation describe-stacks --stack-name comparador-prod --region us-east-1` | Decisión 7 |
| H3 Build de la web | — | Compila la web con `VITE_API_URL` = `HttpApiUrl` y escribe `web/dist/version.json` con `{ "commit": "<SHA>", "version": "<etiqueta>" }` | DEPLOY-PLAN (Artifact) |
| H4 Confirmación | — | Pregunta `¿Subir la web <etiqueta> a <bucket>? (s/N)`. Con cualquier respuesta distinta de `s` termina con código 0 sin subir nada | DEPLOY-PLAN; regla de autorización |
| H5 Orden de subida | Respuesta `s` | En este orden: (1) `aws s3 sync web/dist s3://<bucket> --delete --exclude index.html --exclude version.json`; (2) `aws s3 cp web/dist/index.html s3://<bucket>/index.html --cache-control no-cache`; (3) `aws s3 cp web/dist/version.json s3://<bucket>/version.json --cache-control no-cache`; (4) `aws cloudfront create-invalidation --distribution-id <id> --paths /index.html /version.json` | DEPLOY-PLAN (Release) |
| H6 Fallo a mitad | Un comando de H5 falla | Se detiene, código 1, y no ejecuta los siguientes | DEPLOY-PLAN (Recovery) |

## Nombres que no se negocian

| Tipo | Valor exacto |
|---|---|
| Usuarios de base | `comparador_api`, `comparador_scraper` (y `comparador_app` como dueño y migraciones) |
| Variables locales | `DB_API_USER`, `DB_API_PASSWORD`, `DB_SCRAPER_USER`, `DB_SCRAPER_PASSWORD` (más las `DB_*` existentes) |
| Variable en AWS | `DB_CREDENTIALS_PARAMETER` |
| Parámetros de Parameter Store | `/comparador/prod/db/api`, `/comparador/prod/db/scraper`, `/comparador/prod/comercios` |
| Parámetros de la plantilla | `ApiThrottlingRateLimit`, `ApiThrottlingBurstLimit`, `HealthReservedConcurrency`, `ScraperReservedConcurrency`, `OrquestadorReservedConcurrency`, `DbInstanceClass`, `DbEngineVersion`, `CorsAllowedOrigin` |
| Salidas del stack | `HttpApiUrl`, `WebUrl`, `WebBucketName`, `WebDistributionId`, `DbEndpoint` |
| Stack y región | `comparador-prod`, `us-east-1` |
| Archivos | `infra/samconfig.toml`, `.nvmrc`, `.npmrc`, `web/dist/version.json` |
| Comandos | `npm run deploy:prod`, `npm run deploy:web` |
| Prefijo de bloqueo | `DEPLOY BLOQUEADO: ` |
| Etiquetas | git `vX.Y.Z`; del stack, `commit` y `version` |

## Rutas de cada rol

| Rol | Rutas | Origen |
|---|---|---|
| TESTER | `tests/**` (incluidos los `sam` y `aws` falsos y los repositorios git temporales para G y H), `jest.config.js`, `informes/TESTER-*.md` | `CLAUDE.md` |
| DEV | `infra/**` (plantilla, `samconfig.toml`, scripts), `db/**`, `shared/**`, `api/**`, `scraper/**`, `web/**`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore`, configuración de lint, `informes/DEV-*.md` | `CLAUDE.md` |
| DEV | `.nvmrc`, `.npmrc` | Decisión 9 (no están en el mapa) |
| LEAD / humano | `contratos/**`, `DEPLOY-PLAN.md`, `SECURITY-REPORT.md` | Decisión 9 |

## Avisos de contexto

- **Acción del humano:** tras el cambio de `setup-local.sql`, el humano lo vuelve a ejecutar como
  `postgres` en `comparador_dev` y `comparador_test` (patrón de la aclaración 18), y completa las
  variables nuevas en `.env`. Sin eso, A1–A4 quedan NO EJECUTADAS.
- **Sin despliegue:** D, B y C se verifican por revisión, por las pruebas sobre el YAML y con
  `sam validate`. La plantilla real en AWS queda NO VERIFICADA hasta el primer despliegue.
- **Cambio para HU-01:** la decisión 17 del contrato HU-01 (el scraper usa `comparador_app`) queda
  reemplazada. Las pruebas de HU-01 deben conectarse con los usuarios nuevos según A4.

## Decisiones

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | Reemplaza la decisión 17 de HU-01: cada componente usa su propio usuario de base | SEC-01; ADR-0003 | Aprobada (humano, 2026-11-26) |
| 2 | `comparador_app` sigue siendo dueño de la base y usuario de migraciones | Ya es dueño de las tablas; evita traspasar la propiedad | Aprobada (humano, 2026-11-26) |
| 3 | Variables locales por componente (`DB_API_*`, `DB_SCRAPER_*`); `db:migrate` y `db:check` siguen con `DB_USER` | Para separar usuarios también en local y poder probarlo | Aprobada (humano, 2026-11-26) |
| 4 | En AWS, cada función recibe el **nombre** de su `SecureString` (`DB_CREDENTIALS_PARAMETER`, JSON `{user, password}`) y lo lee al arrancar; en local nunca se llama a AWS | ADR-0010 dice que se leen al arrancar, no el formato | Aprobada (humano, 2026-11-26) |
| 5 | `DB_HOST` y `DB_PORT` desde `!GetAtt` del `DBInstance` | La base pasa a estar en el mismo stack | Aprobada (humano, 2026-11-26) |
| 6 | Grupo de seguridad de RDS abierto en 5432 a todo internet | ADR-0003: las Lambdas fuera de VPC no tienen IP fija; la protección es SSL, contraseñas fuertes y usuarios mínimos | Aprobada (humano, 2026-11-26; riesgo ya aceptado en ADR-0003) |
| 7 | Salidas del stack con los nombres de la tabla; `deploy:web` las lee con `aws cloudformation describe-stacks` | Para no escribir a mano el bucket ni la distribución | Aprobada (humano, 2026-11-26) |
| 8 | `.npmrc` con `engine-strict=true` | Que `npm ci` se niegue con otra versión de Node, no solo que avise | Aprobada (humano, 2026-11-26) |
| 9 | `.nvmrc` y `.npmrc` son ruta del DEV; `DEPLOY-PLAN.md` y `SECURITY-REPORT.md` del LEAD/humano | No estaban en el mapa | Aprobada (humano, 2026-11-26) |
| 10 | Prefijo `DEPLOY BLOQUEADO: `, código 1 y orden exacto de checks y comandos | El TESTER necesita algo textual que verificar | Aprobada (humano, 2026-11-26) |
| 11 | La web se sube con un comando aparte (`deploy:web`) | El primer despliegue va en dos pasos (la web necesita `HttpApiUrl`) | Aprobada (humano, 2026-11-26) |
| 12 | Dos entregas: 1 = A, B, C, E, F; 2 = D, G, H | Unidad grande; cada veredicto más manejable | Aprobada (humano, 2026-11-26) |
| 13 | Tras la entrega 1, el humano vuelve a ejecutar `setup-local.sql` como `postgres` en `comparador_dev` y `comparador_test` | Solo el humano conoce la contraseña de `postgres` | Aprobada (humano, 2026-11-26) |

## Fuera del contrato (decide el DEV)

- Cómo se escriben los scripts (en Node, para que funcionen en Windows), cómo se cargan los
  secretos y su caché por contenedor, la estructura de la plantilla, los nombres lógicos de los
  recursos no listados y los grupos de parámetros internos, respetando los ADRs y este contrato.

## Preguntas abiertas para el humano

Ninguna. Las dudas nuevas del TESTER o del DEV se escalan al humano y generan una nueva versión.

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-11-26 | Versión inicial | `DEPLOY-PLAN.md` aprobado; SEC-01 y SEC-02 bloquean el primer despliegue | — |
| v2 | 2026-11-26 | Dos entregas (sección "Entregas"); decisiones 1–13 aprobadas | Respuestas del humano a las preguntas 1–3 de v1 | Humano |
