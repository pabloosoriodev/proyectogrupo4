# Informe DEV — HU-01 Actualizar precios diariamente mediante scraping

**Rama:** `feature/hu-01-scraping` · **Spec:** `contratos/CONTRATO-HU-01.md` **v6** (commit `d5c0045`) · Sin push ·
**Entorno:** Node **22.23.4** / npm **10.9.9** (tomado de `nvm\installs\v22.23.4` en el PATH de cada
comando; la terminal arranca con Node 26).

> **v6 (decisión 30):** tope `maxResultadosPorBusqueda` por término, pedido por el DEV y decidido
> por el humano después de ver que Plaza Vea responde 500 en `_from=1000`. Implementado y verificado
> con las webs reales (ver abajo).

## Qué se construyó

- **`shared/`**
  - `config.js`: `getScrapingConfig()` (`SCRAPING_MAX_INTENTOS`, `SCRAPING_TIMEOUT_MS`,
    `SCRAPING_USER_AGENT`), `getScrapingLocalConfig()` (`COMERCIOS_CONFIG_PATH`,
    `SCRAPING_DLQ_LOCAL_PATH`) y los de AWS (`COMERCIOS_PARAMETER_NAME`, `SCRAPING_QUEUE_URL`,
    `SCRAPING_DLQ_URL`). Una variable vacía cuenta como que falta (decisión 28).
  - `logger.js`: `logger.child(campos)` fija `ejecucionId` y `comercio` en cada línea (E3).
  - `db.js`: `createPool(dbConfig, { maxConnections })`; en Lambda sigue siendo 1 conexión.
- **`db/migrations/1794977884792_comercio-publicacion.js`**: tablas `comercio` y `publicacion` con
  los nombres exactos del contrato; índices únicos `comercio (slug)` y
  `publicacion (comercio_id, url)` con `CREATE UNIQUE INDEX CONCURRENTLY`. Usa `noTransaction()`
  (CONCURRENTLY no admite transacción) e `IF NOT EXISTS` para poder repetirla. `grupo_id` sin clave
  foránea hasta HU-02 (decisión 11). Restricciones `CHECK`: precios ≥ 0 y oferta < regular.
- **`scraper/src/`**
  - `config/comercios.js`: valida el JSON de la sección "Formato del JSON" (v6), incluido
    `maxResultadosPorBusqueda` (obligatorio, entero > 0); archivo inexistente → error que nombra la
    ruta y `COMERCIOS_CONFIG_PATH`.
  - `http/limitePeticiones.js`: ventana deslizante de 1 s por comercio (D2), contando `robots.txt`.
  - `http/clienteHttp.js`: `User-Agent` (D3) y `SCRAPING_TIMEOUT_MS` por petición.
  - `robots/robots.js`: RFC 9309; una vez por comercio y ejecución (D1b); 4xx = sin reglas (D1c);
    5xx, timeout o red = todo prohibido (D1d); token del User-Agent o grupo `*`.
  - `adaptadores/vtex.js` (modo `json`): `ft`, `_from`, `_to` de 50 en 50; nunca pide `_from` ≥
    `maxResultadosPorBusqueda`, usa solo las posiciones hasta el tope y para antes con una página de
    menos de 50 (F4, F6, F7; decisión 30); 200/206 éxito. Cada petición de búsqueda tiene hasta
    `SCRAPING_MAX_INTENTOS` intentos seguidos (decisión 24); si se agotan, el comercio falla ahí.
    Correspondencia de campos, `items[0]` + `sellerDefault` (B8), oferta solo si es menor (B5),
    no disponibles fuera (B9), `Teasers` ignorados (B10), mal formados omitidos con `warn` (B11).
  - `procesarMensaje.js`: un comercio, todo o nada (decisión 9): lee todo, deduplica por `url`
    (F3), cero productos = fallo (F5), guarda en una transacción; si falla, una entrada en la DLQ
    con `comercio`, `url`, `motivo` (C3).
  - `repositorio.js`: upsert de `comercio` (B7) y de `publicacion` por (`comercio_id`, `url`) (B3);
    lo que no aparece no se borra (B4).
  - `orquestar.js`: registra todos los comercios y envía un mensaje por cada activo (A2).
  - `local.js` → **`npm run scrape:local`**: simula Scheduler + SQS; comercios en paralelo (C4);
    log final `"Actualización diaria terminada"` con `comerciosOk` / `comerciosFallidos`; código 0
    aunque fallen comercios (A4) y ≠ 0 si falta configuración (E2), sin pedir ninguna web.
  - `handlers/orquestador.js` y `handlers/scraper.js`: Lambdas (Parameter Store
    `/comparador/{entorno}/comercios`, SQS con `ReportBatchItemFailures`, DLQ por SQS).
  - `dlq/dlqLocal.js` (JSON Lines) y `aws/sqs.js`, `aws/parametros.js` (AWS SDK v3 cargado al usarse).
- **`infra/`**
  - `template.yaml`: `ScrapingSchedule` (`AWS::Scheduler::Schedule`, parámetros
    `ScrapingScheduleExpression` = `cron(0 6 * * ? *)` y `ScrapingScheduleTimezone` = `America/Lima`),
    `ScrapingQueue` con `RedrivePolicy` a la única `ScrapingDlq` (`maxReceiveCount` del parámetro
    `ScrapingQueueMaxReceiveCount` = 3; retención `ScrapingDlqRetentionSeconds` = 1209600),
    `OrquestadorFunction` (lee Parameter Store, envía a la cola, DLQ asíncrona) y `ScraperFunction`
    (evento SQS, `BatchSize` 1, permiso `SQSSendMessagePolicy` sobre la DLQ). Sin cola ni Lambda
    `browser`. **Sin desplegar** (decisión 13).
  - `scripts/bundle-scraper.js` → `npm run build:scraper` (esbuild a `infra/dist/scraper`; el AWS SDK
    queda `external` porque lo trae el runtime `nodejs22.x`). `npm run build` lo incluye.
- **`package.json`**: scripts `scrape:local` y `build:scraper`. Sin dependencias nuevas.
- **`.env.example`**: variables `COMERCIOS_CONFIG_PATH`, `SCRAPING_*` y el formato del JSON.

## Comandos ejecutados y resultado

| Comando | Resultado |
|---|---|
| `npm run lint` | ESLint → 0. Prettier: 2 archivos míos sin formato (corregidos con `prettier --write`); avisa además de archivos de `tests/**`, que son del TESTER y no abrí |
| `npx eslint scraper shared db infra` + `prettier --check` de mis rutas | 0 |
| `npm run build:scraper` | 0; genera `orquestador.js` y `scraper.js` |
| `npm run build` (build:api + build:scraper + `sam build` + Vite) | 0; `Build Succeeded` con `HealthFunction`, `OrquestadorFunction` y `ScraperFunction`; `node_modules` 433 entradas antes y después |
| `sam validate --lint --template-file infra/template.yaml` | 0; "is a valid SAM Template" |
| `npm run db:migrate` en `comparador_dev` (confirmado por el humano) | 0; aplica `1794977884792_comercio-publicacion`. Columnas, tipos, nulos e índices revisados en `information_schema` / `pg_indexes` |
| `DB_NAME=comparador_test npm run db:migrate` (confirmado por el humano) | 1: la base `comparador_test` **no existe** todavía (decisión 29: la crea el humano) |
| `npm run scrape:local` sin `maxResultadosPorBusqueda` en el JSON | 1; log `error` "… falta maxResultadosPorBusqueda (entero mayor que 0)"; ninguna petición (E2) |
| `npm run scrape:local` con `SCRAPING_MAX_INTENTOS=` vacío | 1; log `error` "Falta la variable de entorno SCRAPING_MAX_INTENTOS" (E2, decisión 28) |
| `npm run scrape:local` contra las webs reales, con v5 y con v6 (autorizado por el humano) | 0 en ambas; ver abajo |

## Verificación con las webs reales (manual, autorizada por el humano)

Configuración en el scratchpad, fuera del repo: los 3 comercios con `limitePeticionesPorSegundo` 1,
los 5 términos del contrato, `SCRAPING_MAX_INTENTOS=3`, `SCRAPING_TIMEOUT_MS=15000`,
`SCRAPING_USER_AGENT=ComparadorPreciosBot/0.1`.

**Corrida con v6** (`maxResultadosPorBusqueda` = 100): código 0; log final `comerciosOk` 3,
`comerciosFallidos` 0; Metro 482, Plaza Vea 459 y Wong 481 productos (≤ 5 términos × 100); DLQ vacía;
0 respuestas 429; 0 productos omitidos.

**Corrida anterior con v5** (sin tope, paraba en `_from` 2500), en `comparador_dev`:

| Comercio | Resultado |
|---|---|
| Metro | OK: 970 filas, 221 con oferta |
| Wong | OK: 1214 filas, 242 con oferta |
| Plaza Vea | Fallido: `ft=leche&_from=1000&_to=1049` → HTTP 500 en los 3 intentos; 1 entrada en la DLQ |

- Log final: `comerciosOk` 2, `comerciosFallidos` 1; misma `ejecucionId` en todas las líneas.
- 0 respuestas 429, 0 productos omitidos, 0 filas con oferta ≥ regular; los 3 comercios en `comercio`.
- **Hallazgo:** Plaza Vea no responde más allá de la posición 999. Con la parada de v5 (`_from` hasta
  2500), Plaza Vea fallaría todos los días. La URL `/search/?_query=` que propuso el humano no trae
  productos en el HTML (los carga JavaScript): necesitaría el modo `browser` (decisión 16).
  **Resuelto en v6** (decisión 30) con el tope de 100 resultados por término; la corrida con v6 lo
  confirma. Las filas de la corrida v5 que quedaron fuera del tope se conservan (B4, decisión 6).

## NO VERIFICADO

- Las pruebas del TESTER (no las leo ni las ejecuto).
- Las pruebas de integración sobre `comparador_test`: la base no existe.
- Los casos que las webs reales no pueden provocar: D1d (`robots.txt` 5xx), B11, C2, C6, F7 y D2
  medido en el servidor. Los cubren las pruebas del TESTER con servidores falsos. C1 y C3 sí se
  vieron con la web real (Plaza Vea con v5: 3 peticiones a la misma página y 1 entrada en la DLQ).
- Despliegue en AWS y comportamiento de las Lambdas (decisión 13). La plantilla sí pasa
  `sam validate --lint` y `sam build` (ver comandos).
- Que `ListPrice` sea el precio tachado que muestra la web (NO VERIFICADO en el contrato).

## Puede afectar al arnés de pruebas

- `npm run scrape:local` lee `.env` (dotenv sin `override`): las variables del proceso tienen
  prioridad, como en el Sprint 0.
- En local, cada comercio activo usa su propia conexión a PostgreSQL (`maxConnections`).
