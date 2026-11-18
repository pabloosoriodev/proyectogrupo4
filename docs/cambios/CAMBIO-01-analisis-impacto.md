# CAMBIO-01 — Análisis de impacto

**Pedido:** "los comercios a consultar serán Wong, Plaza Vea y Metro"
**Fecha del análisis:** 2026-11-10 · **Rama analizada:** `chore/sprint0` · **Autor:** LEAD
**Estado:** solo análisis — ningún archivo del proyecto fue modificado. La decisión es del humano.

> Fuentes omitidas porque no existen en el repo: `AGENTS.md`, `docs/puertas.md`,
> `docs/openapi.yaml`. En su lugar se usaron `CLAUDE.md` (mapa de rutas), `openapi.yaml` (raíz) y
> las tarjetas de Jira KAN-1 a KAN-4.

## 1. Resumen del cambio

La primera versión compara precios solo de tres supermercados peruanos: **Wong, Plaza Vea y Metro**.

## 2. Impacto por pieza

| Pieza | ¿Cambia? | Qué cambia | Evidencia |
|---|---|---|---|
| PRD — Punto abierto 3 (comercios iniciales) | **sí** | Queda resuelto: 3 comercios, 3 webs. | `PRD.md:95-96` |
| PRD — Punto abierto 2 y exclusión "dentro del Perú" | **a decidir** | Los tres comercios son peruanos y el PRD excluye "Búsqueda de productos dentro del Perú". El cambio la contradice o la resuelve de hecho. | `PRD.md:54`, `PRD.md:91-94` |
| PRD — Punto abierto 4 (permiso legal) | **a decidir** | Pasa a ser concreto: revisar términos de uso de esas 3 webs. Sigue abierto. | `PRD.md:97-98` |
| PRD — Criterio de éxito (≥ 2 establecimientos) | no | Alcanzable con 3. | `PRD.md:64-67` |
| HU-01 / KAN-1 | **sí** (contexto) / no (criterios) | Criterios 1–8 válidos tal cual. El riesgo anotado en la tarjeta (puntos 3 y 4) queda a medias: 3 resuelto, 4 abierto. | `hus/HU-01-actualizar-precios-scraping.md:9-26`; comentario de priorización en KAN-1 |
| HU-02 / KAN-2 | **a decidir** | Wong y Metro podrían ser del mismo grupo y compartir catálogo/nombres; afecta qué significa "comparar entre comercios". | `hus/HU-02-reconocer-mismo-producto.md:9-23` |
| HU-03 / KAN-3 | no | Búsqueda por nombre, marca y categoría, igual. | `hus/HU-03-buscar-productos.md:32-46` |
| HU-04 / KAN-4 | no (criterios) | Como máximo 3 filas de comparación. | `hus/HU-04-comparar-precios.md:55-66` |
| `hus/README.md` — pendiente filtros país/km | **a decidir** | Depende de cómo se resuelva el punto 2. | `hus/README.md:14` |
| TECH-DESIGN — riesgo "comercios iniciales sin definir" | **sí** | Se cierra; queda saber el modo de adaptador por web. | `TECH-DESIGN.md:182-183` |
| TECH-DESIGN — riesgo país/moneda | **a decidir** | El modelo no tiene país ni moneda; los precios serían en soles. | `TECH-DESIGN.md:184-186` |
| TECH-DESIGN — entidad `comercio` | no (estructura) | Caben 3 filas (`slug`, `nombre`, `activo`); se cargan al construir HU-01. | `TECH-DESIGN.md:81` |
| TECH-DESIGN — horario del scraping | **a decidir** | Estaba "por definir al configurar los comercios": ya toca, con su zona horaria. | `TECH-DESIGN.md:109` |
| ADR 0004 — adaptador por comercio | no (decisión) / **a decidir** (modo) | Ya prevé VTEX y el modo `json`; falta fijar `json` / `html` / `browser` por web. | `adrs/0004-scraping-hibrido-por-adaptador.md:11-23`, `:47-48` |
| ADR 0001 / 0002 — volumen | no | Dimensionados para "decenas de comercios"; 3 está por debajo. | `adrs/0001-arquitectura-serverless-desacoplada.md:52`, `adrs/0002-postgresql-en-amazon-rds.md:11` |
| ADR 0010 — configuración | no | Los comercios van en Parameter Store, no en código. | `adrs/0010-configuracion-y-secretos-parameter-store.md:21-23` |
| ADR 0005, 0006, 0011 | no | Agrupación, búsqueda y reintentos/DLQ son independientes de qué comercios. | `adrs/0005-agrupacion-productos-claves-duras-pg-trgm.md:9-16`, `adrs/0011-resiliencia-reintentos-dlq-revision-manual.md:17-26` |
| ADR 0007 — forma futura de la API | **a decidir** | `precio` planeado sin moneda; decidir si se añade. | `adrs/0007-api-rest-contrato-openapi.md:22-24` |
| `openapi.yaml` (contrato vigente) | no | Solo `/v1/health`. | `openapi.yaml:12-58` |
| SPRINT0 — DoD 17 (cero lógica de negocio) | no | El cambio no entra en el Sprint 0. | `SPRINT0.md:80` |
| SPRINT0 — DoD 19 y moneda `$` | **a decidir** | La DoD exige `Desde $n.nn`; si la moneda pasa a `S/`, cambia la DoD. | `SPRINT0.md:82`, `SPRINT0.md:103` |
| Web — formato de precio | **a decidir** | `$` fijo; se ajustaría aquí si se decide `S/`. | `web/src/components/ProductCard.jsx:1-3` |
| Web — datos de ejemplo | **a decidir** (menor) | `cantidadComercios` llega a 5 y 6, imposible con 3 comercios. Las marcas ya son peruanas. | `web/src/data/searchResultsSample.js:15,23,55` |
| `scraper/` | no (hoy) | Vacío hasta HU-01; ahí nacen los 3 adaptadores. | `scraper/package.json:5` |
| `db/` (migraciones) | no (hoy) | Migración base vacía. La carga de comercios será una migración/semilla futura (requiere confirmación según `CLAUDE.md`). | `db/migrations/1793155625595_base.js:1-6` |
| `shared/src/config.js`, `api/`, `infra/template.yaml` | no | Solo base de datos, CORS, puerto y salud. | `shared/src/config.js:36-58`, `infra/template.yaml:49` |
| Pruebas del TESTER | no | Ninguna depende de comercios ni de moneda. | `tests/**` (búsqueda de "comercio", "$" y "Desde": sin coincidencias relevantes) |
| Stitch (pantallas UX) | **a decidir** | Diseñadas con moneda `$`. | `SPRINT0.md:103` |
| Confluence (PRD v1.1, página 2916353) | **sí**, si cambia el PRD | Copia del PRD; quedaría desactualizada. | NO VERIFICADO |

## 3. Preguntas que debe decidir una persona

1. ¿Perú es el mercado de la v1? ¿Se elimina del PRD la exclusión "Búsqueda de productos dentro
   del Perú" (`PRD.md:54`) y se cierra el Punto abierto 2?
2. ¿En qué moneda se muestran los precios: soles (`S/`) o `$`? Si son soles, ¿se cambia ya la DoD
   19 del Sprint 0 o se deja para HU-03?
3. ¿Se modela el país o la moneda en la base de datos, o se asume Perú/soles de forma implícita?
4. ¿Quién revisa los términos de uso y el `robots.txt` de Wong, Plaza Vea y Metro, y para cuándo?
   (Punto abierto 4)
5. Si Wong y Metro comparten catálogo o precios, ¿cuentan como dos comercios distintos en
   "Disponible en N comercios" y en el criterio de éxito?
6. ¿Qué precio se captura: regular, oferta o precio con tarjeta? ¿Con qué tienda o zona de
   despacho, si el precio varía por ubicación?
7. ¿A qué hora y en qué zona horaria corre el scraping diario?
8. ¿Cómo se escriben los nombres y los `slug` (por ejemplo "Plaza Vea" / `plaza-vea`)?
9. ¿Se actualizan ya el PRD, Confluence y las pantallas de Stitch, o al empezar HU-01?

## 4. ¿Rompe la promesa de alguna puerta?

**No rompe ninguna puerta publicada.** El único contrato vigente es `GET /v1/health`
(`openapi.yaml:13-38`). Lo usan la página `/` de la web (`web/src/api/healthClient.js`) y las
pruebas del TESTER (`tests/integration/salud.*`, `tests/web/paginaSalud.test.js`); ninguno se ve
afectado.

Riesgos de promesa, solo si se decide la moneda en soles:

- **DoD 19 del Sprint 0** (`SPRINT0.md:82`) promete `Desde $n.nn`. El DEV ya lo implementó así
  (`web/src/components/ProductCard.jsx:2`) y el TESTER tiene pendientes las pruebas de los
  criterios 18–20, que se escribirían contra `$`. Cambiar a `S/` obliga a rehacer ambas.
- **Forma futura de la API** (`adrs/0007-api-rest-contrato-openapi.md:22-24`): aún no está en el
  contrato y nadie la usa. Añadir la moneda ahora es gratis; después de HU-03/HU-04 sería un cambio
  de contrato.

## 5. NO VERIFICADO

- Que Wong y Metro sean del mismo grupo empresarial y compartan catálogo (conocimiento previo, no
  consultado).
- Que las tres webs usen VTEX y expongan un catálogo JSON público (define el modo `json` frente a
  `browser`).
- Los términos de uso y el `robots.txt` de cada web.
- Si el precio varía según la tienda o zona seleccionada.
- El contenido actual de la página de Confluence y de las pantallas de Stitch.
- El trabajo del DEV sin commit: se leyó del disco y puede cambiar.

## 6. Recomendación

**Próximo sprint (HU-01).** El Sprint 0 prohíbe lógica de negocio (DoD 17) y el cambio solo se
materializa en los adaptadores de HU-01. Antes deben cerrarse las preguntas 1 (Perú) y 4 (permiso
legal). Lo único que conviene decidir ya es la moneda (pregunta 2), para no cerrar la DoD 19 con `$`
y tener que rehacerla.
