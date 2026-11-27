# Deploy Plan — Comparador de precios entre comercios/supermercados

Fecha: 2026-11-26
Estado: DISEÑADO — plan aprobado por el humano el 2026-11-26

## Resumen del proyecto

- **Monorepo** con npm workspaces (`api`, `scraper`, `shared`, `web`) más `infra/` (AWS SAM) y
  `db/` (node-pg-migrate). Node.js 22 (`nodejs22.x`), CommonJS en el backend.
- **Web:** SPA React + Vite (`web/dist`). **API:** `GET /v1/health` en Lambda + HTTP API.
- **Scraping diario (HU-01):** EventBridge Scheduler → Lambda orquestadora → cola SQS → Lambda
  scraper → PostgreSQL, con una DLQ.
- **Base de datos:** PostgreSQL 16 en local; RDS PostgreSQL en AWS (ADR-0002).
- **Decidido por ADRs:** AWS serverless (0001), RDS público endurecido sin VPC (0003), S3 +
  CloudFront para la web (0008), SAM (0009) y Parameter Store (0010).
- **No existe todavía:** cuenta ni credenciales de AWS (no hay `~/.aws`), CI de ningún tipo,
  `samconfig.toml`, y en la plantilla ni RDS ni bucket ni CloudFront.
- **No hay paquetes publicados** (npm u otros): todo lo desplegable es un servicio propio.

Decisiones del humano (2026-11-26): **solo entorno `prod`**, **despliegue manual desde su
máquina**, región **`us-east-1`**, **sin dominio propio** (URL de CloudFront).

## Sistema de deployment propuesto

### Build

Desde un checkout limpio del commit de `main` que se va a desplegar, con **Node 22.23.4 / npm
10.9.9**:

1. `npm ci` instala exactamente lo que dice `package-lock.json`.
2. `npm run build` ejecuta:
   - `build:api` y `build:scraper` (esbuild): un archivo por Lambda, con `shared/`, `pg` y `dotenv`
     dentro;
   - `sam build` sobre `infra/template.yaml`;
   - `vite build` de la web, que genera `web/dist`.

**La URL de la API se mete en la web al compilar** (`VITE_API_URL`). Por eso el primer despliegue
es en dos pasos (ver "Estrategia de release").

**Determinismo:** lockfile fijo y versión de Node fija. Se propone añadir `.nvmrc` y `engines` en
`package.json` (ruta del DEV) para que no se pueda construir con otra versión. En el Sprint 0 eso
ya rompió el build.

### Artifact

Se despliegan tres cosas, todas ligadas a un commit:

| Artefacto | Qué es | Cómo se versiona |
|---|---|---|
| Paquetes de las Lambdas | `.aws-sam/build/*` (archivos `.js` empaquetados), subidos por `sam deploy` a un bucket de artefactos de SAM | Etiqueta del stack `commit=<SHA>` y etiqueta git `vX.Y.Z` en `main` |
| Infraestructura | Changeset de CloudFormation del stack `comparador-prod` | El mismo commit |
| Web | Contenido de `web/dist` en el bucket de la web | Un archivo `version.json` con el SHA junto a `index.html` |

Regla: **solo se despliega un commit de `main` con etiqueta `vX.Y.Z`**, nunca una rama de trabajo
ni un árbol con cambios sin commit.

### Config & Secrets

| Dato | Tipo | Dónde vive |
|---|---|---|
| Comercios, búsquedas y `maxResultadosPorBusqueda` | Config | Parameter Store `String` `/comparador/prod/comercios` (ADR-0010) |
| Credenciales de la base, **un usuario por componente** (API de solo lectura, scraper con escritura, migraciones) | **Secreto** | Parameter Store `SecureString` `/comparador/prod/db/<componente>`. Cada Lambda lee **solo la suya** al arrancar (**SEC-01**) |
| Contraseña maestra de RDS | **Secreto** | La genera RDS y la guarda en Secrets Manager (`ManageMasterUserPassword`). Solo se usa para crear los usuarios |
| Horario, intentos, timeouts, User-Agent, límites, `CORS_ALLOWED_ORIGIN` | Config | Parámetros de la plantilla, guardados en `samconfig.toml` (sin secretos) |
| `VITE_API_URL` | Config pública | Variable al compilar la web |

- **Ningún secreto** va en el repositorio, en `samconfig.toml`, en variables de entorno de las
  Lambdas ni en los logs.
- Tus claves personales de AWS solo viven en `~/.aws` de tu máquina (`aws configure`) y nunca pasan
  por el chat.

### Infraestructura

**AWS `us-east-1`, un solo stack SAM `comparador-prod`.** Ya está en la plantilla:
- HTTP API y Lambda de salud;
- Scheduler 06:00 en `America/Lima`;
- cola SQS, DLQ de 14 días;
- Lambdas orquestadora y scraper.

**Falta añadir** (lo hace el DEV, ver "Autorizaciones pendientes"):

- **RDS PostgreSQL 16**, clase del free tier (`db.t4g.micro`), 20 GB.
  - `PubliclyAccessible: true` con `rds.force_ssl = 1` (ADR-0003, aceptado).
  - Backups automáticos de 7 días y `DeletionProtection: true`.
  - `DeletionPolicy` y `UpdateReplacePolicy` en `Snapshot`.
- **Bucket S3 privado** para la web, más **CloudFront** con Origin Access Control.
  - Errores 403/404 redirigidos a `/index.html` (ADR-0008) y HTTPS obligatorio.
  - `CORS_ALLOWED_ORIGIN` = URL de CloudFront.
- **Límites de la API (SEC-02):**
  - throttling en la HTTP API (`DefaultRouteSettings`);
  - `ReservedConcurrentExecutions` en la Lambda de salud, con valores parametrizados y coherentes
    con `max_connections` de RDS.
  **Valores decididos por el LEAD (delegado por el humano el 2026-11-26):**

  | Parámetro | Valor inicial | Por qué |
  |---|---|---|
  | `ApiThrottlingRateLimit` (HTTP API, peticiones/s sostenidas) | 20 | Un MVP sin usuarios registrados está muy por debajo; corta los aluviones antes de que lleguen a Lambda |
  | `ApiThrottlingBurstLimit` (HTTP API, ráfaga) | 40 | El doble de la tasa, para picos legítimos breves (varias pestañas o recargas) |
  | `HealthReservedConcurrency` (Lambda de salud) | 10 | 1 conexión por instancia → máximo 10 conexiones de la API |
  | `ScraperReservedConcurrency` (Lambda scraper) | 3 | Un mensaje por comercio (Wong, Plaza Vea, Metro) → máximo 3 conexiones |
  | `OrquestadorReservedConcurrency` | 1 | Una ejecución diaria → 1 conexión |

  - **Total de conexiones de la aplicación: 14.** Quedan unas 60 de las ~80 de `db.t4g.micro` para
    migraciones, administración y las APIs futuras de HU-03 y HU-04 (NO VERIFICADO:
    `max_connections` real de la instancia).
  - **La salud no se cachea:** `openapi.yaml` y el criterio 5 del Sprint 0 dicen que ejecuta
    `SELECT 1`. El throttling basta para proteger la base.
  - Todos son **parámetros de la plantilla**, no valores fijos en el código (`CLAUDE.md`).
  - **Riesgo de cuenta nueva:** AWS exige dejar al menos 100 ejecuciones concurrentes sin reservar.
    Las cuentas nuevas a veces arrancan con una cuota total de 10, y entonces **no se puede reservar
    concurrencia**. Por eso cada `*ReservedConcurrency` admite `0` = sin reserva (condición en la
    plantilla). En ese caso la propia cuota de 10 limita las conexiones y el throttling de la API
    sigue activo. La cuota real se comprueba al crear la cuenta (NO VERIFICADO).
- **Lectura de secretos (SEC-01):** permisos `ssm:GetParameter` por función sobre su propio
  parámetro, sin `DB_PASSWORD` en `Environment`.
- **Presupuesto:** una alerta de AWS Budgets (por ejemplo 5 USD/mes) en la cuenta, creada a mano en
  la consola. Fue un pendiente del Sprint 0.

**Costo esperado:** Lambda, SQS, Scheduler, S3 y CloudFront entran en el free tier con este
volumen. La HTTP API es gratis los 12 primeros meses. RDS es gratis 12 meses (750 h/mes) y después
cuesta unos 15 USD/mes. Antes de que eso pase hay que decidir si se paga o se migra a Neon o
Supabase (TECH-DESIGN, riesgos).

### Entornos

| Entorno | Dónde | Base |
|---|---|---|
| Desarrollo | Tu máquina (`dev:api`, `dev:web`, `scrape:local`) | `comparador_dev` local |
| Pruebas | Tu máquina (`test`, `test:integration`) | `comparador_test` local |
| **prod** | AWS `us-east-1`, stack `comparador-prod` | RDS |

- Entre entornos **solo cambian la configuración y los secretos, no el código**.
- No hay staging: lo que en local está en verde (veredicto) es lo que se despliega.

### Estrategia de release

**Release directo con changeset revisado.** La elección se justifica así:
- es un MVP sin usuarios con sesión ni datos personales (PRD);
- hay un solo entorno;
- un corte breve de la web no tiene impacto grave.

Canary y blue/green no compensan su costo aquí.

1. `sam deploy --confirm-changeset`: muestra **qué recursos se crean, cambian o se borran** y
   **espera tu confirmación**. CloudFormation revierte solo si falla.
2. Web: se suben primero los archivos con hash (`assets/*`) y al final `index.html` y
   `version.json`. Después se invalida solo `/index.html` en CloudFront. Así nunca hay un
   `index.html` que apunte a archivos que todavía no existen.

**Primer despliegue en dos pasos:**
1. Desplegar el stack, que crea la API y CloudFront y da sus URLs.
2. Compilar la web con `VITE_API_URL` = URL de la API, poner `CORS_ALLOWED_ORIGIN` = URL de
   CloudFront y desplegar de nuevo.

### Data & Migrations

- Las migraciones (`npm run db:migrate`, node-pg-migrate 9) se ejecutan **desde tu máquina contra
  RDS**, con el usuario de migraciones y **antes** de desplegar el código que las necesita.
  Primero se amplía el esquema; las columnas viejas se quitan en un release posterior.
- Siguen las reglas de `CLAUDE.md`: no bloqueantes (`CONCURRENTLY`), revisadas, y cada ejecución
  contra RDS **con tu confirmación**.
- **Antes de cada migración, snapshot manual de RDS.**
- **Volver a la versión anterior del código no deshace los datos.** Si una migración sale mal, se
  restaura el snapshot o se escribe una migración correctiva; no basta con redesplegar el código
  anterior.
- **Primera puesta en marcha:**
  - crear los usuarios `comparador_api`, `comparador_scraper` y `comparador_migraciones` con el
    usuario maestro;
  - aplicar las 2 migraciones existentes;
  - cargar los comercios en Parameter Store.

### Deploy gates

Como el despliegue es **manual desde tu máquina**, ninguna plataforma impide desplegar si algo
falla. El control es un procedimiento con un script que se niega a seguir.

**Condiciones previas, de una sola vez. Bloquean el primer despliegue:**
1. SEC-01 resuelto: credenciales en `SecureString` y usuarios separados.
2. SEC-02 resuelto: throttling y concurrencia de la API.
3. La plantilla con RDS, S3 y CloudFront revisada con veredicto en verde.

**En cada despliegue**, un script `npm run deploy:prod` (lo genera el DEV) se detiene ante el
primer fallo:
1. Exige estar en `main`, sin cambios sin commit, en un commit con etiqueta `vX.Y.Z` y con
   **Node 22.23.4**.
2. Ejecuta `npm ci`, `npm run lint`, `npm run test`, `npm run test:integration` (contra
   `comparador_test` local), `npm audit --omit=dev` (0 altas y 0 críticas) y
   `sam validate --lint`.
3. Ejecuta `npm run build`.
4. Ejecuta `sam deploy --confirm-changeset` y espera tu "y".
5. Pregunta antes de subir la web.

**Limitación, dicha claramente:** cualquiera con tus credenciales puede ejecutar `sam deploy` a
mano y saltarse el script. Con despliegue manual, el control depende de la disciplina. Si más
adelante quieres un control que no se pueda saltar, hay que pasar a GitHub Actions con un entorno
protegido.

### Verify & Observe

**Justo después de cada despliegue** (smoke tests):
1. `GET <HttpApiUrl>/v1/health` → `200 {"status":"ok","db":"ok"}`, con
   `Access-Control-Allow-Origin` = URL de CloudFront.
2. Abrir la URL de CloudFront: la página `/` muestra **"API: ok"**, `/buscar` carga, y
   `version.json` tiene el SHA desplegado.
3. Comprobar que el stack tiene la etiqueta `commit=<SHA>` correcta.
4. **Solo en el primer despliegue**, y con tu autorización: invocar una vez la Lambda orquestadora
   a mano. Después: log `"Actualización diaria terminada"` con `comerciosOk` = 3, DLQ vacía y filas
   en `publicacion`.

**Observación continua** (ADR-0011, revisión manual):
- logs JSON en CloudWatch (`ejecucionId`, `comercio`);
- revisar cada día la DLQ y el log final de la ejecución de las 06:00;
- la alerta de Budgets.

**Decidido (humano, 2026-11-26): no se añade una alarma de CloudWatch sobre la DLQ.** ADR-0011 se
mantiene: la revisión de la DLQ y de los logs es manual.

### Recovery

| Si falla… | Qué se hace |
|---|---|
| `sam deploy` a mitad | CloudFormation revierte solo al estado anterior. Se revisa el error del changeset |
| El smoke test después de desplegar | Se redespliega la etiqueta anterior (`git checkout vX.Y.(Z-1)` + `npm run deploy:prod`), con tu autorización |
| La web | Se vuelve a subir `web/dist` de la etiqueta anterior y se invalida `/index.html` |
| Una migración | Se restaura el snapshot previo (que crea una instancia nueva, así que hay que actualizar `DbHost`) o se aplica una migración correctiva. Redesplegar el código **no** deshace datos |
| El scraping diario | Ya está aislado: reintentos, DLQ y precios conservados con su fecha (ADR-0011). Si hace falta detenerlo, se desactiva el Schedule |
| Pérdida o borrado de RDS | `DeletionProtection` + backups automáticos de 7 días (restauración a un punto en el tiempo) + snapshot al borrar |

**Incidente:** tú decides cada acción de recuperación. El plan solo las deja escritas.

## Autorizaciones pendientes

Ninguna acción está aprobada todavía; solo el plan. Cada acción se pedirá **en su momento y por
separado**.

**Antes de tocar AWS (preparación, sin infraestructura):**
1. ~~Que apruebes este plan~~ — **aprobado el 2026-11-26**.
2. **Tú:** crear la cuenta de AWS, MFA en root, el usuario IAM para desplegar (no root), la alerta
   de Budgets y `aws configure` en tu máquina (`us-east-1`). Las claves nunca pasan por el chat.
3. **Trabajo del DEV**, con contrato y veredicto como en HU-01, en ramas aparte:
   - SEC-01 (secretos y usuarios separados);
   - SEC-02 (throttling y concurrencia; los valores los fija antes el ARCH o tú);
   - recursos de RDS, S3 y CloudFront en la plantilla;
   - `samconfig.toml` sin secretos, `.nvmrc` y `engines`;
   - el script `deploy:prod` con sus controles.

   Esta parte del GENERATE **no la hago yo**: como LEAD no escribo código ni configuración.

**Ya en AWS, cada uno con tu autorización explícita y en este orden:**
4. Primer `sam deploy` (crea el stack, RDS, la cola, la DLQ, el Scheduler, el bucket y CloudFront).
5. Crear los usuarios de base de datos en RDS y guardar sus credenciales en Parameter Store.
6. Snapshot de RDS y aplicar las migraciones existentes en RDS.
7. Cargar `/comparador/prod/comercios` en Parameter Store.
8. Segundo `sam deploy` con la URL de CloudFront en CORS, y subida de la web.
9. Invocar a mano la Lambda orquestadora una vez, para verificar el scraping.

## Registro de ejecución y verificación

Sin ejecuciones todavía.
