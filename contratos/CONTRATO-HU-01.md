# CONTRATO — HU-01 Actualizar precios diariamente mediante scraping

**Tipo:** Feature
**Versión:** v5
**Estado:** Aprobado (2026-11-18, humano)
**Origen:** [`hus/HU-01-actualizar-precios-scraping.md`](../hus/HU-01-actualizar-precios-scraping.md)
(PRD v1.2, CAMBIO-01) · Jira [KAN-1](https://grupo4aifirst.atlassian.net/browse/KAN-1)

---

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| HU-01, criterios 1–8 y escenarios Gherkin | Historia y criterios de aceptación |
| PRD v1.2, RN-1 a RN-6 | Perú y soles, los tres comercios, slugs, precio regular y de oferta, 06:00 hora del Perú, riesgo legal aceptado |
| PRD, "Fuente de los datos" y "Requisitos no funcionales" | Conservación de precios, resiliencia, configuración y scraping responsable |
| TECH-DESIGN, "Actualización diaria de precios (HU-01)" | Criterios técnicos de esta HU |
| TECH-DESIGN, "Modelo de datos" (`comercio`, `publicacion`) y "Valores de configuración iniciales" | Tablas que escribe el pipeline y valores iniciales |
| ADR-0001 | Scheduler → orquestador → un mensaje por comercio → cola → Lambda scraper → PostgreSQL |
| ADR-0004 | Un adaptador por comercio; modos `json`/`html`/`browser`; salida con `precioRegular` y `precioOferta` |
| ADR-0010 | Configuración en Parameter Store (`/comparador/{entorno}/...`) |
| ADR-0011 | Intentos en total (3), una DLQ con comercio, URL y motivo; sin borrado; logs JSON |
| ADR-0003 | El scraper escribe en PostgreSQL |
| `SPRINT0.md`, pregunta 10 (y ADR-0009) | Precedente: en local, un servidor Node simula el servicio de AWS, sin Docker |
| `CLAUDE.md` | Rutas de cada rol; migraciones no bloqueantes y con confirmación; sin valores fijos; retries y DLQ |
| Investigación del LEAD (2026-11-17) | Formato público de las tres webs (sección siguiente) |

No entran (no tocan HU-01): ADR-0005, porque la agrupación es HU-02; ADR-0006 y ADR-0007, porque
la búsqueda y la API son HU-03 y HU-04; y ADR-0008, porque HU-01 no tiene pantalla.

## Formato de las webs (investigado por el LEAD, 2026-11-17)

Se hicieron pocas peticiones de solo lectura: `robots.txt` y una búsqueda de "leche" de 2
productos por web.

- **Las tres webs usan la plataforma VTEX** y exponen el mismo catálogo JSON público:
  `GET https://<dominio>/api/catalog_system/pub/products/search?...`. Responden
  `206 application/json` con una lista de productos. Por eso el modo de adaptador es **`json`**
  para las tres (ADR-0004) y **no hace falta el modo `browser`**.
- **Dominios:** `https://www.wong.pe`, `https://www.plazavea.com.pe`, `https://www.metro.pe`. Van en
  la configuración, no en el código.
- **`robots.txt`:** ninguno de los tres prohíbe `/api/`. Wong prohíbe, entre otras, `/busca/*` y
  Metro `/buscapagina/*`; el adaptador debe evaluarlos igual (caso D1).
- **Correspondencia de campos** (la fijan el TESTER en sus servidores falsos y el DEV en el adaptador):

| Columna de `publicacion` | Campo VTEX |
|---|---|
| `nombre_original` | `productName` |
| `marca` | `brand` (nulo si viene vacío) |
| `categoria_origen` | `categories[0]` (ruta tal cual, por ejemplo `/Abarrotes/Chocolatería/Chocolates de Leche/`) |
| `url` | `link` |
| `precio_regular` | `items[0].sellers[vendedor por defecto].commertialOffer.ListPrice` |
| `precio_oferta` | `...commertialOffer.Price` si es **menor** que `ListPrice`; si no, nulo |

  Ejemplos reales: Plaza Vea, `Price` 27.90 y `ListPrice` 43.10 → regular 43.10 y oferta 27.90.
  Metro, `Price` 14.90 y `ListPrice` 14.90 → regular 14.90 y oferta nula.
  El "vendedor por defecto" es el que tiene `sellerDefault: true`.
- **Búsqueda por texto con ruido** (búsqueda `ft=leche`, 50 resultados por web): el total es 518 en
  Wong, 1596 en Plaza Vea y 393 en Metro. Entre los 50 primeros, solo 6, 24 y 8 están en una
  categoría de leche; el resto son chocolatería, repostería, comida para mascotas e incluso
  electrohogar. El humano decidió **guardar todo lo que devuelva cada búsqueda, sin filtrar por
  categoría** (decisión 20).
- **Límite real de las webs:** al pedir el árbol de categorías, las tres respondieron
  `429 Too Many Requests`. Un 429 cuenta como fallo (estado ≥ 400) y se reintenta según el caso C1.
- **NO VERIFICADO:** que `ListPrice` sea siempre el precio regular que la web muestra tachado (solo
  se comparó en el JSON, no en la página visible.

### Paginación de la búsqueda (v5, decisión 26)

Formato de petición que usa el scraper y que debe aceptar la web falsa:

```text
GET <url del comercio>/api/catalog_system/pub/products/search?ft=<término>&_from=<N>&_to=<N+49>
```

- `<término>` va codificado con `encodeURIComponent` (por ejemplo `az%C3%BAcar`).
- Las páginas son de 50 resultados (`_from` y `_to` inclusivos): `0–49`, `50–99`, …
- El scraper deja de pedir páginas de un término cuando una página trae **menos de 50** productos
  o cuando `_from` superaría **2500** (tope de VTEX).
- Los estados `200` y `206` son éxito. Cualquier otro comportamiento de la web falsa lo decide el
  TESTER, siempre que sea compatible con esto.

### Formato del JSON de `COMERCIOS_CONFIG_PATH` (v5, decisión 26)

```json
{
  "comercios": [
    { "slug": "wong", "nombre": "Wong", "activo": true, "url": "https://www.wong.pe",
      "tipo": "json", "limitePeticionesPorSegundo": 2 }
  ],
  "busquedas": ["leche", "arroz", "azúcar", "atún", "aceite"]
}
```

- `url` es la URL base de la web (sin `/` final); el scraper le agrega la ruta del endpoint.
- Un comercio con `tipo` distinto de `"json"` falla (va a la DLQ como cualquier fallo).
- En AWS el orquestador lee esta misma estructura de Parameter Store
  (`/comparador/{entorno}/comercios`) y manda cada comercio dentro de su mensaje de la cola.

## Interfaz observable

HU-01 no tiene pantalla ni endpoint. Se observa desde afuera por cinco vías:

1. **Un comando local que ejecuta la actualización diaria completa**: `npm run scrape:local`
   (ver comportamiento A).
2. **Las tablas `comercio` y `publicacion`** de PostgreSQL.
3. **Las peticiones que recibe cada web de comercio.** En las pruebas son servidores falsos con el
   formato VTEX descrito arriba; las pruebas no usan las webs reales.
4. **La DLQ.** En local es un archivo JSON Lines; en AWS, la cola SQS.
5. **Los logs JSON** por la salida estándar.

Y en AWS, por la **plantilla `infra/template.yaml`**, verificada por revisión: no hay despliegue
(decisión 13).

## Comportamiento

### A. Ejecución diaria

**Entrada**

```text
npm run scrape:local
```

El comando simula en local lo que en AWS hacen EventBridge Scheduler y SQS: ejecuta el
orquestador una vez y entrega cada mensaje al scraper, con el número de intentos configurado. Es
el mismo patrón que `npm run dev:api` en el Sprint 0.

**Casos**

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| A1 Ejecución completa | 3 comercios activos y sus webs responden bien | Código de salida 0. Por cada comercio se guardan sus productos (caso B1). Exactamente un log `info` con `message` = `"Actualización diaria terminada"` y los campos `comerciosOk` = 3 y `comerciosFallidos` = 0 | HU-01 crit. 1 y 2; TDD HU-01 viñeta 2 |
| A2 Un mensaje por comercio activo | 3 comercios configurados, 1 con `activo: false` | Solo se piden las webs de los 2 activos; la web del inactivo no recibe ninguna petición | TDD HU-01 viñeta 2 |
| A3 Horario | Plantilla SAM | Un `AWS::Scheduler::Schedule` con expresión `cron(0 6 * * ? *)` y zona `America/Lima`, leídos de parámetros de la plantilla, no fijos en el código | HU-01 crit. 1; RN-5; TDD viñeta 1 |
| A4 Ejecución con fallos | 1 de 3 comercios falla siempre | Código de salida 0 (el fallo de un comercio no es un fallo del proceso). Log final con `comerciosOk` = 2 y `comerciosFallidos` = 1 | HU-01 crit. 5 |

### B. Captura de productos de un comercio

| Caso | Entrada (web del comercio) | Salida esperada en `publicacion` | Origen |
|---|---|---|---|
| B1 Producto con oferta | En "Plaza Vea" (`plaza-vea`), un producto con `ListPrice` 5.90 y `Price` 4.90 | Una fila con `precio_regular` = 5.90, `precio_oferta` = 4.90, `nombre_original`, `marca`, `categoria_origen`, `url` (según la tabla de correspondencia), `comercio_id` de `plaza-vea` y `fecha_captura` = momento de la captura | Gherkin esc. 1; crit. 2; RN-4 |
| B2 Producto sin oferta | En "Wong" (`wong`), un producto con `ListPrice` 5.90 y `Price` 5.90 | `precio_regular` = 5.90 y `precio_oferta` = nulo | Gherkin esc. 2; RN-4 |
| B3 Producto ya existente | Misma `url` del mismo comercio en una ejecución posterior, con otro precio | Se actualiza la misma fila (no se duplica): precios y `fecha_captura` nuevos | TDD modelo: único por (`comercio_id`, `url`) |
| B4 Producto que ya no aparece | Un producto guardado ayer que hoy no publica la web | Su fila se conserva sin cambios, con su `fecha_captura` original | Decisión 6 |
| B5 Oferta no menor que el regular | `Price` mayor o igual a `ListPrice` | `precio_oferta` = nulo y `precio_regular` = `ListPrice` | Decisión 7 |
| B6 Moneda | Cualquier precio | Se guarda el número en soles, con 2 decimales, sin símbolo ni campo de moneda | RN-1; ADR-0004 |
| B7 Comercio en la tabla | Comercio configurado que todavía no está en `comercio` | Existe una fila con su `slug` y su `nombre` (por ejemplo `plaza-vea` / `Plaza Vea`) y `activo` según la configuración | RN-2, RN-3; decisión 5 |
| B8 Varios SKU o vendedores | Un producto con varios `items` o varios `sellers` | Se usa `items[0]` y su vendedor por defecto (`sellerDefault: true`); una sola fila por `link` | Decisión 14 |
| B9 Producto no disponible | `IsAvailable: false` en el vendedor por defecto | No se guarda (si ya existía, se conserva sin cambios, como B4) | Decisión 21 |
| B10 Promociones con tarjeta | El producto trae `Teasers` o `PromotionTeasers` | Se ignoran: solo cuentan `ListPrice` y `Price` | Decisión 22 |
| B11 Producto mal formado | Respuesta JSON válida (una lista), pero un producto sin `items`, sin `ListPrice` o sin ningún vendedor con `sellerDefault: true` | Ese producto no se guarda y se emite un log `warn` con `comercio`; el resto del comercio se guarda normalmente y el comercio **no** falla. Si al final no queda ningún producto, aplica F5 | Decisión 27 |

### F. Productos que se leen

La configuración de búsquedas es una lista `busquedas` de términos, común a los tres comercios.
Valores iniciales: `leche`, `arroz`, `azúcar`, `atún`, `aceite` (decisión 19).

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| F1 Solo los términos configurados | Una web con productos de leche y de otros rubros | Solo se piden búsquedas (`ft=`) de los términos configurados | Decisión 19 |
| F2 Sin filtro de categoría | La búsqueda de `leche` devuelve "Chocolate con Leche" (`/Abarrotes/Chocolatería/…`) y "Leche Gloria" (`/Lácteos/Leches/`) | Se guardan los dos (salvo los no disponibles, B9) | Decisión 20 |
| F3 Producto en dos búsquedas | El mismo `link` aparece en dos términos | Una sola fila | B3; único (`comercio_id`, `url`) |
| F4 Paginación | Una búsqueda con más resultados de los que caben en una página | Se guardan todos los resultados, no solo la primera página | HU-01 crit. 2 |
| F5 Cero productos en total | Ninguna búsqueda del comercio devuelve productos disponibles | Fallo del comercio (decisión 8) | Decisión 8 |

### C. Fallos, reintentos y DLQ

**Qué es un fallo de comercio:** que su web responda con estado HTTP ≥ 400, que no responda dentro
del tiempo configurado, un error de red, una respuesta que el adaptador no puede interpretar, o
**cero productos** (decisión 8). Una respuesta que no es JSON o que no es una lista es "no
interpretable"; un producto suelto mal formado no lo es (caso B11).

**Qué es un intento (v5, decisión 24):** cada **petición de búsqueda** (cada término y cada página)
tiene hasta `SCRAPING_MAX_INTENTOS` intentos en total. Si la misma petición falla todas las veces,
la web se da por caída: el comercio falla **en ese momento**, no se piden los términos ni las páginas
que faltan, y va a la DLQ (C3). Los reintentos salen enseguida, sin espera, pero siempre respetando
el límite de peticiones por segundo (D2).

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| C1 Reintentos | `robots.txt` responde bien y la búsqueda responde 500 siempre; `SCRAPING_MAX_INTENTOS` = 3 | El endpoint de búsqueda de ese comercio recibe **exactamente 3 peticiones** (1 + 2 reintentos de la misma petición), aunque `busquedas` tenga varios términos, y luego el comercio se da por fallido | HU-01 crit. 3; ADR-0011; decisión 24 |
| C2 Recupera en un reintento | Una petición de búsqueda responde 500 la primera vez y bien la segunda | El comercio se guarda (como B1) y no hay entrada en la DLQ | HU-01 crit. 3; decisión 24 |
| C3 DLQ | Se agotaron los intentos | **Exactamente una** entrada en la DLQ para ese comercio en esa ejecución, con los campos `comercio` (slug), `url` (la URL base de la web) y `motivo` (texto del error). La publica el propio scraper al agotar los intentos | HU-01 crit. 4; ADR-0011; decisión 15 |
| C4 Aislamiento | 1 de 3 comercios falla siempre | Los otros 2 se guardan completos en la misma ejecución | HU-01 crit. 5; TDD viñeta 5 |
| C5 Conservación | Un comercio con filas guardadas falla | Ninguna de sus filas de `publicacion` cambia: mismos precios y misma `fecha_captura` | HU-01 crit. 6; ADR-0011 |
| C6 Fallo a mitad | Un comercio falla después de leer parte de sus productos | Ninguna de sus filas cambia (todo o nada por comercio) | HU-01 crit. 6; decisión 9 |
| C7 Configuración en AWS | Plantilla SAM | Una cola SQS liviana con `RedrivePolicy` hacia una única DLQ, `maxReceiveCount` desde un parámetro (valor inicial 3), retención de la DLQ de 1209600 s (14 días), y permiso del scraper para enviar mensajes a la DLQ. Sin cola ni Lambda `browser` | ADR-0011; ADR-0001; decisiones 15 y 16 |

### D. Scraping responsable

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| D1 robots.txt | El `robots.txt` de la web prohíbe una ruta para el agente configurado | El scraper nunca pide esa ruta | HU-01 crit. 7; TDD viñeta 7 |
| D1b Cuándo se lee robots.txt | Cualquier comercio | `/robots.txt` se pide **una vez por comercio y ejecución**, antes de la primera búsqueda, y cuenta para el límite de D2. Se usa el grupo del token de producto de `SCRAPING_USER_AGENT` (lo anterior a `/` o al primer espacio) y, si no hay grupo para ese token, el grupo `*` | Decisión 25 |
| D1c robots.txt no disponible | `/robots.txt` responde 4xx | Se asume que no hay reglas y se sigue normalmente | RFC 9309; decisión 25 |
| D1d robots.txt con error | `/robots.txt` responde 5xx, no responde dentro de `SCRAPING_TIMEOUT_MS` o hay un error de red | Se asume que todo está prohibido: el comercio **falla sin pedir ninguna búsqueda** y va a la DLQ (C3) | RFC 9309; decisión 25 |
| D2 Límite de peticiones | `limitePeticionesPorSegundo` = 2 para un comercio | Esa web nunca recibe más de 2 peticiones en una ventana de 1 s (contando también `robots.txt`) | HU-01 crit. 7; decisión 4 |
| D3 Identificación | Cualquier petición | Lleva la cabecera `User-Agent` con el valor de `SCRAPING_USER_AGENT` | Decisión 10 |

### E. Configuración y logs

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| E1 Sin valores fijos | Revisión del código de `scraper/` y `shared/` | Ninguna URL de comercio, horario, número de intentos, límite ni credencial escrita en el código; todos llegan por configuración | HU-01 crit. 8; TDD viñeta 8 |
| E2 Falta configuración | Falta `SCRAPING_MAX_INTENTOS` o el archivo de comercios. **Una variable vacía cuenta como que falta**, y una `COMERCIOS_CONFIG_PATH` que apunta a un archivo inexistente también | El comando termina con código ≠ 0 y un log `error` que nombra lo que falta, sin pedir ninguna web | HU-01 crit. 8; patrón de `shared/src/config.js`; decisión 28 |
| E3 Logs | Cualquier ejecución | Cada línea de log es JSON con `level`, `message`, `ejecucionId` (igual en toda la ejecución) y, si se refiere a un comercio, `comercio` (slug) | ADR-0011; TDD "Disponibilidad" viñeta 3 |

## Nombres que no se negocian

| Tipo | Valor exacto |
|---|---|
| Comando | `npm run scrape:local` |
| Tabla | `comercio` (`id`, `slug` único, `nombre`, `activo`) |
| Tabla | `publicacion` (`id`, `comercio_id`, `grupo_id` nulo, `nombre_original`, `marca`, `categoria_origen`, `url`, `precio_regular` numeric(10,2), `precio_oferta` numeric(10,2) nulo, `fecha_captura` timestamptz); único (`comercio_id`, `url`) |
| Slugs / nombres | `wong` / `Wong`, `plaza-vea` / `Plaza Vea`, `metro` / `Metro` |
| Variable | `COMERCIOS_CONFIG_PATH`: ruta a un JSON con el formato exacto de la sección "Formato del JSON de `COMERCIOS_CONFIG_PATH`" (v5) |
| Parámetros de búsqueda | `ft`, `_from`, `_to` (sección "Paginación de la búsqueda") |
| Variable | `SCRAPING_MAX_INTENTOS` (inicial 3) |
| Variable | `SCRAPING_TIMEOUT_MS` (tiempo máximo por petición) |
| Variable | `SCRAPING_USER_AGENT` |
| Variable | `SCRAPING_DLQ_LOCAL_PATH` (archivo JSON Lines de la DLQ local) |
| Variables de base | Las de las aclaraciones 18–19 (`DB_*`), con el usuario `comparador_app` (decisión 17) |
| Endpoint consultado | `/api/catalog_system/pub/products/search` (formato VTEX) |
| Campos de la DLQ | `comercio`, `url`, `motivo` |
| Campos de log | `level`, `message`, `ejecucionId`, `comercio` |
| Mensaje de log final | `"Actualización diaria terminada"` con `comerciosOk` y `comerciosFallidos` |
| Horario | `cron(0 6 * * ? *)` en `America/Lima` |

## Rutas de cada rol

| Rol | Rutas | Origen |
|---|---|---|
| TESTER | `tests/**` (incluidos los servidores falsos VTEX y sus datos en `tests/fixtures/**`), `jest.config.js`, `informes/TESTER-*.md` | `CLAUDE.md` § Propiedad de rutas |
| DEV | `scraper/**`, `shared/**`, `db/**`, `infra/**`, `package.json`, `package-lock.json`, `.env.example`, configuración de lint, `informes/DEV-*.md` | `CLAUDE.md` § Propiedad de rutas |
| LEAD / humano | `contratos/**` | Decisión 1 |

## Avisos de contexto

- **Migración de base de datos:** HU-01 crea las primeras tablas de negocio. `CLAUDE.md` exige
  confirmación humana antes de ejecutarla y que sea no bloqueante (índices `CONCURRENTLY`).
- **Riesgo legal aceptado (RN-6):** las pruebas usan servidores falsos. Las webs reales solo se
  consultarían en una verificación manual aparte, respetando `robots.txt` y el límite de peticiones.
- **Base de pruebas (v5, decisión 29):** las pruebas de integración usan una base aparte,
  `comparador_test`, que **crea el humano** y en la que **el humano aplica** la migración del DEV
  (con la confirmación que exige `CLAUDE.md`). Las pruebas la eligen pisando `DB_NAME` (aclaración
  11 del Sprint 0) y pueden borrar libremente sus filas de `comercio` y `publicacion` para partir de
  un estado conocido. **Nunca** borran datos de `comparador_dev`. Mientras `comparador_test` no
  exista o no tenga la migración, esas pruebas quedan `NO EJECUTADAS`.
- **`DEUDA.md` / `PATRONES.md`:** no existen en el proyecto.

## Decisiones

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | `contratos/**` pasa a ser ruta del LEAD/humano | El mapa no tiene dónde guardar contratos | Aprobada (humano, 2026-11-17) |
| 2 | Comando local `npm run scrape:local`, que simula Scheduler + SQS + DLQ (como `dev:api` en el Sprint 0) | Sin AWS ni Docker no hay otra forma de observar el pipeline de punta a punta | Aprobada (humano, 2026-11-17) |
| 3 | La configuración de comercios en local va en un JSON indicado por `COMERCIOS_CONFIG_PATH`; en AWS, en Parameter Store bajo `/comparador/{entorno}/comercios` | ADR-0010 dice dónde vive en AWS, no el formato ni el equivalente local | Aprobada (humano, 2026-11-17) |
| 4 | Límite de peticiones expresado como `limitePeticionesPorSegundo` por comercio | "Límite configurado" no dice la unidad | Aprobada (humano, 2026-11-17) |
| 5 | El pipeline crea o actualiza la fila de `comercio` a partir de la configuración | Alguien tiene que cargar los tres comercios en la tabla | Aprobada (humano, 2026-11-17) |
| 6 | Un producto que deja de aparecer no se borra | El PRD excluye el historial y no dice qué hacer con lo que desaparece | Aprobada (humano, 2026-11-17) |
| 7 | Una "oferta" mayor o igual al precio regular se guarda como `precio_oferta` nulo | Evita ofertas falsas al comparar (RN-7) | Aprobada (humano, 2026-11-17) |
| 8 | Cero productos leídos cuenta como fallo del comercio | Si una web cambia y devuelve vacío, debe llegar a la DLQ | Aprobada (humano, 2026-11-17) |
| 9 | Escritura todo o nada por comercio | El criterio 6 no dice qué pasa si falla a mitad | Aprobada (humano, 2026-11-17) |
| 10 | Variables `SCRAPING_MAX_INTENTOS`, `SCRAPING_TIMEOUT_MS`, `SCRAPING_USER_AGENT` y `SCRAPING_DLQ_LOCAL_PATH` | El criterio 8 pide configuración, pero no los nombres | Aprobada (humano, 2026-11-17) |
| 11 | `grupo_id` queda nulo en HU-01; la agrupación llega con HU-02 | El TDD agrupa "al guardar", pero eso es HU-02 | Aprobada (humano, 2026-11-17) |
| 12 | Log final `"Actualización diaria terminada"` con `comerciosOk` y `comerciosFallidos` | Señal observable del final de la ejecución | Aprobada (humano, 2026-11-17) |
| 13 | La parte de AWS se verifica revisando la plantilla; el despliegue queda NO VERIFICADO | No hay cuenta de AWS (pregunta 1 de v1) | Aprobada (humano, 2026-11-17) |
| 14 | Se usa `items[0]` y el vendedor `sellerDefault`; una fila por `link` | Investigación: VTEX puede traer varios SKU y vendedores | Aprobada (humano, 2026-11-17) |
| 15 | El scraper publica él mismo la entrada de la DLQ con `comercio`, `url` y `motivo`, una sola vez por comercio y ejecución | SQS no guarda el motivo del error (pregunta 2 de v1) | Aprobada (humano, 2026-11-17) |
| 16 | Solo cola liviana (`json`); sin cola ni Lambda `browser` | Pregunta 3 de v1; la investigación confirma que las tres webs son `json` | Aprobada (humano, 2026-11-17) |
| 17 | El scraper usa `comparador_app` hasta el despliegue | Pregunta 6 de v1 | Aprobada (humano, 2026-11-17) |
| 18 | `precio_regular` = `ListPrice`; `precio_oferta` = `Price` si es menor | Investigación: así distingue VTEX el precio de lista del de venta | Aprobada (humano, 2026-11-17) |
| 19 | Solo se leen los productos de `leche`, `arroz`, `azúcar`, `atún` y `aceite`, como términos de búsqueda configurables | Alcance del catálogo (pregunta 9 de v2) | Aprobada (humano, 2026-11-17) |
| 20 | **Sin filtro de categoría:** se guarda todo lo que devuelve la búsqueda de cada término (excepto los no disponibles) | El LEAD propuso filtrar por categoría por el ruido observado (entre 52 % y 88 %); el humano lo rechazó | Aprobada (humano, 2026-11-17) |
| 21 | Los productos no disponibles (`IsAvailable: false`) no se guardan | Pregunta 11 de v2 | Aprobada (humano, 2026-11-17) |
| 22 | Se ignoran las promociones con tarjeta (`Teasers`) | Pregunta 10 de v2 | Aprobada (humano, 2026-11-17) |
| 23 | HU-01 se construye en una sola entrega, con los tres comercios | Pregunta 12 de v2: un solo adaptador VTEX sirve para los tres | Aprobada (humano, 2026-11-17) |
| 24 | Un intento es una petición de búsqueda (término y página); 3 fallos de la misma petición = web caída, el comercio falla y no se sigue buscando; reintentos sin espera, respetando D2 | Preguntas del DEV (1) y del TESTER (3): C1 no decía cómo se cuenta un intento | Aprobada (humano, 2026-11-18) |
| 25 | `robots.txt` una vez por comercio y ejecución; 4xx = sin reglas; 5xx, timeout o error de red = todo prohibido (RFC 9309); token del User-Agent o grupo `*` | Pregunta del DEV (2) | Aprobada (humano, 2026-11-18) |
| 26 | Paginación VTEX (`ft`, `_from`, `_to` de 50 en 50) y formato del JSON de configuración fijados en el contrato | Preguntas del DEV (3, 5) y del TESTER (1, 4): el TESTER no puede leer `.env.example` | Aprobada (humano, 2026-11-18); el resto de la web falsa lo decide el TESTER |
| 27 | Un producto mal formado se omite con log `warn`; el comercio no falla | Pregunta del DEV (4) | Aprobada (humano, 2026-11-18) |
| 28 | Una variable de configuración vacía cuenta como que falta | Pregunta del TESTER (2) | Aprobada (humano, 2026-11-18) |
| 29 | Base de pruebas aparte `comparador_test`, creada y migrada por el humano | Pregunta del TESTER (5) | Aprobada (humano, 2026-11-18) |

## Fuera del contrato (decide el DEV)

- El adaptador VTEX (más allá del formato de petición fijado en v5), la estructura de módulos, las
  consultas SQL y cómo se implementan el límite de peticiones y el `robots.txt`, respetando los
  ADRs 0001, 0004, 0010 y 0011 y las decisiones 24–27.
- Cómo se simulan Scheduler y SQS dentro de `scrape:local`, siempre que el comportamiento
  observable sea el de este contrato.

## Preguntas abiertas para el humano

Ninguna. Las nuevas dudas del TESTER o del DEV se escalan al humano y generan una nueva versión.

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-11-17 | Versión inicial | Inicio de HU-01 tras cerrar el Sprint 0 | — |
| v2 | 2026-11-17 | Respuestas a las preguntas 1–7; formato VTEX de las tres webs; casos B5, B8, C3 y C7 ajustados; decisiones 13–18; preguntas 8–12 | Investigación del LEAD (pregunta 4 de v1) | Humano (respuestas 1–7) |
| v3 | 2026-11-17 | Respuestas a las preguntas 8–12; alcance de 5 productos (sección F); casos B9 y B10; decisiones 19–23; decisión 20 propuesta | Decisión del humano sobre el alcance; ruido y 429 observados | Humano (salvo la decisión 20) |
| v4 | 2026-11-17 | Decisión 20: sin filtro de categoría (se guarda todo lo que devuelve cada búsqueda); caso F2 reescrito; `busquedas` es una lista de términos | El humano rechazó el filtro propuesto | Humano |
| v5 | 2026-11-18 | Qué es un intento (C1, C2); casos D1b–D1d sobre `robots.txt`; caso B11 (producto mal formado); E2 con variable vacía; secciones de paginación y formato del JSON de configuración; base `comparador_test`; decisiones 24–29 | Preguntas del DEV (1–5) y del TESTER (1–5) durante la construcción | Humano |
