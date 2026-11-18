# ADR 0001: Arquitectura serverless desacoplada con cola por comercio

## Estado

Aceptado

## Contexto

El PRD (v1.1) exige tres capacidades con ritmos y riesgos distintos:

- Una **web pública** sin login para buscar y comparar precios.
- Una **actualización diaria por scraping** donde "si falla la lectura de un comercio, se
  conservan sus últimos precios conocidos [...] Los demás comercios no se ven afectados".
- Requisitos no funcionales: "la web debe seguir disponible aunque falle la actualización de
  precios" y "el scraping debe incluir reintentos y una cola de errores (DLQ)".

`CLAUDE.md` fija como reglas transversales: Lambdas *stateless*, alta disponibilidad, retries y
DLQ en toda integración asíncrona, y preferencia por servicios administrados de AWS. El equipo
prioriza **opciones gratuitas** (free tier).

## Decisión

El sistema se divide en cuatro componentes desacoplados sobre AWS serverless:

1. **Web pública estática** servida desde S3 + CloudFront.
2. **API de lectura**: API Gateway (HTTP API) + Lambda, que consulta PostgreSQL.
3. **Pipeline de scraping**: EventBridge Scheduler (1 vez al día) → Lambda orquestador → un
   mensaje por comercio activo en **una de dos colas SQS** según su tipo de adaptador (ADR 0004):
   la **cola liviana** (json/html) y la **cola browser** (Playwright), cada una consumida por su
   propia Lambda scraper → PostgreSQL. Ambas colas comparten **una única DLQ**, que recibe el
   mensaje tras agotar los intentos configurados (ADR 0011).
4. **Base de datos PostgreSQL** compartida por API y scraper (proveedor definido en ADR 0002).

La API y el pipeline no se llaman entre sí: solo comparten la base de datos.

## Alternativas consideradas

- **Serverless con scraper único** (una Lambda recorre todos los comercios en bucle) — más
  simple, pero el límite de 15 minutos por invocación acota la cantidad de comercios, los
  reintentos por comercio habría que programarlos a mano y una falla no controlada corta el
  procesamiento de los comercios restantes, violando el aislamiento que pide el PRD.
- **Monolito en contenedor** (Express + cron en un host gratuito) — el más simple de programar,
  pero contradice la regla *stateless*/Lambda de `CLAUDE.md`; los hosts gratuitos suspenden el
  contenedor por inactividad, lo que hace poco fiable el cron diario y la disponibilidad de la web.

## Consecuencias

- Cada comercio se procesa en su propia invocación: una falla queda aislada, se reintenta vía SQS
  y termina en la DLQ con su contexto, cumpliendo el PRD y `CLAUDE.md`.
- La web y la API siguen disponibles aunque el pipeline falle por completo.
- Lambda, SQS, EventBridge Scheduler y API Gateway caben en el free tier para el volumen esperado
  (1 ejecución diaria, decenas de comercios).
- **Trade-off:** más piezas que configurar, desplegar y observar (scheduler, colas, DLQ, permisos
  IAM entre ellas) que en un monolito; exige infraestructura como código desde el Sprint 0.
- **Trade-off:** el scraping depende de lo que una Lambda pueda ejecutar (tiempo máx. 15 min por
  comercio, sin navegador incluido); si un comercio requiere renderizar JavaScript, eso se decide
  en el ADR de técnica de scraping.
