# Informe TESTER — HU-01 Actualizar precios diariamente mediante scraping

**Rama:** `feature/hu-01-scraping` · **Fecha:** 2026-11-24 · **Spec:** `contratos/CONTRATO-HU-01.md`
**v6** (Aprobado 2026-11-24, decisiones 1–30) · **Encargo:** `encargos/ENCARGO-TESTER-HU-01.md`

Pruebas de caja negra escritas contra el contrato, sin leer las rutas del DEV. Se observa por las
vías del contrato:

- el comando `npm run scrape:local`, con su código de salida y sus logs JSON;
- las tablas `comercio` y `publicacion` de la base de pruebas `comparador_test` (decisión 29);
- las peticiones que reciben las webs VTEX falsas, que nunca son las webs reales;
- el archivo de la DLQ local (`SCRAPING_DLQ_LOCAL_PATH`).

**Historia:** escritas con la v4; las preguntas 1–5 del TESTER las respondió la v5
(decisiones 24–29), y la v6 (decisión 30: tope `maxResultadosPorBusqueda`) reescribió F4 y agregó
F6, F7 y casos de E2.

## Resultado de la ejecución (2026-11-24, Windows, Node 22.23.4, PostgreSQL 16 local)

| Comando | Resultado |
|---|---|
| `npm run test` (`unit` + `web`) | **código 0**: 4 suites, 22 pruebas en verde (Sprint 0 + servidor VTEX falso) |
| `npm run test:integration` | **código 1**: 29 en verde (17 del Sprint 0 + 12 de E2) y 56 `NO EJECUTADAS` |
| `npm run lint` | **código 0** |

Las 56 `NO EJECUTADAS` fallan todas con el mismo mensaje, comprobado: `NO EJECUTADA: no se pudo usar
la base de pruebas comparador_test (no existe la base de datos «comparador_test»)`. La base la crea
y la migra el humano (decisión 29). Mientras no exista, esas pruebas no ejecutan el caso: cortan
en el `beforeAll`. El TESTER no crea bases ni tablas.

Las 12 de E2 no necesitan base y ya corren contra el `npm run scrape:local` que hay en el árbol de
trabajo: es un resultado provisional hasta la ENTREGA DEV.

## Caso del contrato → prueba

Archivos en `tests/integration/hu01/`. Estado: **E** = ejecutada en verde, **NE** = NO EJECUTADA
(falta `comparador_test`), **R** = por revisión.

| Caso | Prueba | Estado |
|---|---|---|
| A1 Ejecución completa | `ejecucionDiaria.test.js` — `[A1]` | NE |
| A2 Un mensaje por comercio activo | `ejecucionDiaria.test.js` — `[A2]` (la web del inactivo no recibe ni `robots.txt`) | NE |
| A3 Horario | Revisión de `infra/template.yaml` (ver abajo) | R |
| A4 Ejecución con fallos | `ejecucionDiaria.test.js` — `[A4]` | NE |
| B1 Producto con oferta + correspondencia | `capturaProductos.test.js` — `[B1]` (todas las columnas, `grupo_id` nulo por la decisión 11, `fecha_captura` dentro de la ejecución) y `brand` vacío → `marca` nula | NE |
| B2 Sin oferta | `capturaProductos.test.js` — `[B2]` | NE |
| B3 Producto ya existente | `capturaProductos.test.js` — `[B3]` (misma `id`, precios y `fecha_captura` nuevos) | NE |
| B4 Producto que ya no aparece | `capturaProductos.test.js` — `[B4]` | NE |
| B5 Oferta no menor | `capturaProductos.test.js` — `[B5]` (Price > ListPrice; el caso igual está en B2) | NE |
| B6 Moneda | `capturaProductos.test.js` — `[B6]` × 2 (`12.50` / `9.00`; columnas `numeric(10,2)`, sin columna de moneda) | NE |
| B7 Comercio en la tabla | `capturaProductos.test.js` — `[B7]` (los 3, con uno inactivo) | NE |
| B8 Varios SKU o vendedores | `capturaProductos.test.js` — `[B8]` | NE |
| B9 No disponible | `capturaProductos.test.js` — `[B9]` × 2 (no se guarda; si existía, se conserva) | NE |
| B10 Promociones con tarjeta | `capturaProductos.test.js` — `[B10]` | NE |
| B11 Producto mal formado | `capturaProductos.test.js` — `[B11]` × 4 (sin `items`, sin `ListPrice`, sin `sellerDefault`; todos mal formados → F5) | NE |
| C1 Reintentos | `fallosReintentosDlq.test.js` — `[C1]` con 3 términos y `SCRAPING_MAX_INTENTOS` 3 y 2; los reintentos repiten la misma petición (decisión 24) | NE |
| C2 Recupera en un reintento | `fallosReintentosDlq.test.js` — `[C2]` | NE |
| C3 DLQ | `fallosReintentosDlq.test.js` — `[C3]` (una entrada, `comercio`, `url` base, `motivo`) | NE |
| C, qué es un fallo | `fallosReintentosDlq.test.js` — timeout, respuesta no JSON, JSON que no es lista, 429 | NE |
| C4 Aislamiento | `fallosReintentosDlq.test.js` — `[C4]` | NE |
| C5 Conservación | `fallosReintentosDlq.test.js` — `[C5]` | NE |
| C6 Fallo a mitad | `fallosReintentosDlq.test.js` — `[C6]` (`leche` bien, `arroz` caído en la 2.ª ejecución) | NE |
| C7 Configuración en AWS | Revisión de `infra/template.yaml` (ver abajo) | R |
| D1 robots.txt | `scrapingResponsable.test.js` — `[D1]` × 2 (grupo `*` y grupo del token) | NE |
| D1b Cuándo se lee robots.txt | `scrapingResponsable.test.js` — `[D1b]` × 2 (una vez por comercio, antes de buscar; grupo del token por encima de `*`) | NE |
| D1c robots.txt 4xx | `scrapingResponsable.test.js` — `[D1c]` × 2 (404, 403) | NE |
| D1d robots.txt con error | `scrapingResponsable.test.js` — `[D1d]` × 3 (500, 503, timeout) | NE |
| D2 Límite de peticiones | `scrapingResponsable.test.js` — `[D2]` (5 términos con límite 2; ventana deslizante de 1 s) y reintentos dentro del límite | NE |
| D3 Identificación | `scrapingResponsable.test.js` — `[D3]` | NE |
| E1 Sin valores fijos | Revisión de `scraper/` y `shared/` (ver abajo) | R |
| E2 Falta configuración | `configuracionYLogs.test.js` — `[E2]` × 12: `SCRAPING_MAX_INTENTOS` sin definir o vacía; `COMERCIOS_CONFIG_PATH` sin definir, vacía o a un archivo inexistente; `maxResultadosPorBusqueda` ausente, `""`, `null`, `0`, negativo, `2.5` o `"cien"` | **E** (provisional) |
| E3 Logs | `configuracionYLogs.test.js` — `[E3]` | NE |
| F1 Solo los términos configurados | `productosLeidos.test.js` — `[F1]` | NE |
| F2 Sin filtro de categoría | `productosLeidos.test.js` — `[F2]` | NE |
| F3 Producto en dos búsquedas | `productosLeidos.test.js` — `[F3]` | NE |
| F4 Paginación | `productosLeidos.test.js` — `[F4]` (tope 100, 80 resultados → `_from` 0 y 50, 80 filas) y formato `ft`/`_from`/`_to` de 50 en 50 con parada al recibir menos de 50 (decisión 26) | NE |
| F5 Cero productos | `productosLeidos.test.js` — `[F5]` × 2 (sin resultados; solo no disponibles) | NE |
| F6 Tope por término | `productosLeidos.test.js` — `[F6]` × 3 (1596 resultados → `_from` 0 y 50 y 100 filas; el tope es por término; cuenta posiciones, no filas) | NE |
| F7 Tope no múltiplo de 50 | `productosLeidos.test.js` — `[F7]` (tope 120 → `0–49`, `50–99`, `100–149` y exactamente las posiciones 0–119) | NE |

## Revisión sugerida para el veredicto (casos R)

- **A3:** `infra/template.yaml` tiene un `AWS::Scheduler::Schedule` con `ScheduleExpression`
  `cron(0 6 * * ? *)` y `ScheduleExpressionTimezone` `America/Lima`, los dos tomados de
  `Parameters` (`!Ref`), no escritos en el recurso ni en el código.
- **C7:** hay una sola cola SQS liviana con `RedrivePolicy` hacia una única DLQ, `maxReceiveCount`
  igual a `!Ref` de un parámetro con valor por defecto 3, y la DLQ con `MessageRetentionPeriod:
  1209600`. El rol del scraper tiene `sqs:SendMessage` sobre la DLQ. No hay cola ni Lambda
  `browser`.
- **E1:** buscar en `scraper/` y `shared/` URLs (`https?://`, `wong`, `plazavea`, `metro.pe`), cron,
  números de intentos, límites, `maxResultadosPorBusqueda` y credenciales escritos en el código.
  Todos deben llegar por configuración.

## Archivos

- `tests/fixtures/hu01/contratoHu01.js`: nombres que no se negocian (slugs, variables, endpoint,
  campos de DLQ y de log, mensaje final, `maxResultadosPorBusqueda`, `comparador_test`).
- `tests/fixtures/hu01/productosVtex.js`: productos con el formato VTEX del contrato.
- `tests/helpers/servidorVtexFalso.js`: web VTEX falsa. Pagina con `_from`/`_to` inclusivos, sirve
  `robots.txt`, registra cada petición con su User-Agent e instante, y fuerza fallos (estados,
  cuelgues y cuerpos no interpretables).
- `tests/helpers/scrapeLocal.js`: lanza `npm run scrape:local` y separa los logs JSON de las líneas
  de npm.
- `tests/helpers/escenarioHu01.js`: arma las webs, el JSON de `COMERCIOS_CONFIG_PATH` (formato v6),
  la DLQ temporal y el entorno, con `DB_NAME=comparador_test`.
- `tests/helpers/baseHu01.js` y `tests/helpers/pruebaHu01.js`: leen `comercio` y `publicacion`
  siempre en `comparador_test`. El borrado se niega si la conexión no apunta a esa base, así que
  nunca se toca `comparador_dev`.
- `tests/helpers/apiLocal.js`: ahora exporta `leerDotEnv` y `registrosJson` (sin cambios de
  comportamiento).
- `tests/unit/servidorVtexFalso.test.js`: prueba del propio servidor falso (6 pruebas).
- Las 6 suites de `tests/integration/hu01/`.

## Cómo se corren

Requisitos: PostgreSQL local con la base `comparador_test` creada y migrada por el humano, y ningún
`npm run dev:api` levantado (lo exigen las pruebas del Sprint 0). Las pruebas de HU-01 no usan
internet.

```
npm run test               # unit + web (incluye el servidor VTEX falso)
npm run test:integration   # Sprint 0 + HU-01
```

Variable opcional del arnés: `TEST_SCRAPE_TIMEOUT_MS` (por defecto 120000), tiempo máximo por cada
`npm run scrape:local`.

## NO EJECUTADO / NO VERIFICADO

- **NO EJECUTADAS (56 pruebas):** todas las que necesitan `comercio`/`publicacion`, hasta que
  exista `comparador_test` con la migración de HU-01.
- **E2 en verde es provisional:** corrió contra el código del DEV que hay en el árbol de trabajo,
  todavía sin ENTREGA DEV.
- **D1d por error de red:** no se reproduce aparte. Se cubren 5xx y timeout de `robots.txt`.
- **E2 "nombra lo que falta"** con un archivo inexistente: se acepta que el log nombre la variable
  `COMERCIOS_CONFIG_PATH` o la ruta del archivo.
- **E3:** no se puede saber desde fuera qué línea "se refiere a un comercio". La prueba exige que
  todo `comercio` presente sea un slug configurado y que cada comercio aparezca en algún log.
- **D2:** se mide la llegada de las peticiones a la web falsa con una ventana deslizante estricta de
  1 s.
- **Despliegue en AWS:** NO VERIFICADO (decisión 13).

## Preguntas para el LEAD

Ninguna abierta. Las preguntas 1–5 quedaron resueltas por la v5 (decisiones 24–29).
