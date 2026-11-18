# ADR 0004: Scraping híbrido con un adaptador por comercio

## Estado

Aceptado — modificado el 2026-11-10 por CAMBIO-01 (PRD v1.2)

## Contexto

El PRD establece que los precios se obtienen "exclusivamente mediante scraping de las webs
públicas de los comercios", una vez al día, respetando `robots.txt` y limitando la frecuencia de
peticiones. Los comercios de la primera versión son Wong, Plaza Vea y Metro (PRD RN-2); aún no se
sabe si sus webs entregan el HTML ya renderizado, lo arman con JavaScript o exponen un JSON de
catálogo (frecuente en plataformas de e-commerce como VTEX). Cada mensaje SQS corresponde a un
comercio (ADR 0001). Por cada producto hay que registrar el precio regular y, si existe, el de
oferta, en soles (PRD RN-1 y RN-4).

## Decisión

Cada comercio tiene un **adaptador** que implementa una interfaz común y devuelve productos
normalizados: `{ nombre, marca, categoria, precioRegular, precioOferta, url, fechaCaptura }`,
donde `precioOferta` es `null` si la web no publica oferta. Los precios van en soles, sin campo
de moneda (PRD RN-1). El tipo de adaptador se declara en la configuración del comercio (no en el
código):

- `json` — consume el endpoint público de catálogo de la web (preferido cuando existe).
- `html` — descarga el HTML por HTTP y lo parsea con Cheerio.
- `browser` — usa Playwright + Chromium para webs que solo se arman con JavaScript.

Los comercios iniciales se configuran en Parameter Store (ADR 0010) con los slugs `wong`,
`plaza-vea` y `metro` (PRD RN-3). El modo de cada uno se fija al construir su adaptador.

Todos los modos comparten el control de `robots.txt`, el límite de peticiones por web y el
registro de fallas.

## Alternativas consideradas

- **Solo HTTP + Cheerio/JSON** — lo más liviano y barato. No se eligió porque los comercios cuya
  web depende de JavaScript y no exponen JSON quedarían fuera, y aún no se sabe cuáles serán.
- **Solo navegador headless** — cubre cualquier web. No se eligió porque cada ejecución es mucho
  más pesada (1.5-2 GB de RAM, capa de Chromium ~60 MB), lenta y frágil, consume más free tier y
  es más fácil de bloquear por los comercios.

## Consecuencias

- La mayoría de comercios se leen con el modo liviano (`json`/`html`), rápido y dentro del free
  tier; el modo `browser` queda como excepción explícita por comercio.
- Agregar un comercio es agregar un adaptador y su configuración, sin tocar el pipeline.
- **Trade-off (mantenimiento):** hay que mantener dos motores de scraping y un adaptador por
  comercio; cuando una web cambia su estructura, su adaptador se rompe y hay que actualizarlo
  (la falla queda aislada y registrada en la DLQ, ADR 0001).
- **Trade-off (despliegue):** el modo `browser` necesita una Lambda separada (más memoria y capa
  de Chromium) del scraper liviano; el orquestador debe enrutar cada comercio a la cola/función
  correcta según su tipo.
- **Riesgo aceptado (legal):** no se revisan los términos de uso de las webs (PRD RN-6, decisión
  del humano); se mantienen `robots.txt` y el límite de peticiones.
- **Trade-off (oferta):** cada web marca la oferta de forma distinta, así que cada adaptador
  tiene que distinguir el precio regular del de oferta.

## Registro de cambios

| Fecha | Cambio | Decidido por |
|---|---|---|
| 2026-11-10 | Salida con `precioRegular` y `precioOferta`, comercios iniciales y riesgo legal aceptado (CAMBIO-01) | Humano (pabloosoriodev) |
