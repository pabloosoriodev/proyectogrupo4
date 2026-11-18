# ADR 0006: Búsqueda en PostgreSQL con unaccent + pg_trgm

## Estado

Aceptado

## Contexto

El PRD incluye la "búsqueda de productos por nombre, marca o categoría". HU-03 precisa: el nombre
debe encontrar productos que lo contengan "o se parezcan"; la búsqueda ignora mayúsculas y tildes
("azucar" encuentra "Azúcar"); términos de menos de 2 caracteres no se buscan; y cada resultado es
un producto agrupado (ADR 0005) con su precio más bajo y la cantidad de comercios donde está. El
volumen esperado es de miles de productos. El equipo prioriza opciones gratuitas.

## Decisión

La búsqueda se resuelve en **PostgreSQL** (RDS, ADR 0002) con las extensiones **`unaccent`** y
**`pg_trgm`**:

- Texto de búsqueda y nombres se comparan normalizados (sin tildes, en minúsculas).
- Coincidencia parcial y tolerante a errores de tipeo con operadores de trigramas, ordenada por
  similitud.
- Marca y categoría se filtran por igualdad sobre columnas normalizadas.
- Se reutiliza el índice GIN de trigramas creado para la agrupación (ADR 0005).

## Alternativas consideradas

- **Full-text search de PostgreSQL** (`tsvector`, diccionario español) — entiende plurales y
  raíces. No se eligió porque no tolera errores de tipeo ni palabras parciales ("lech" no
  encuentra "leche"), que es lo que HU-03 pide con "se parece a".
- **Motor de búsqueda externo** (Algolia u OpenSearch) — relevancia y facetas superiores. No se
  eligió porque agrega un servicio que hay que mantener sincronizado con la base; OpenSearch en
  AWS no es gratuito y Algolia está fuera de AWS y limita la cantidad de registros gratis.

## Consecuencias

- Sin componentes nuevos ni costo adicional; un solo lugar donde viven datos e índices.
- Los resultados están siempre consistentes con los precios, sin desfase de sincronización.
- **Trade-off (relevancia):** sin sinónimos ni manejo lingüístico de plurales; la calidad depende
  del umbral de similitud de búsqueda, que debe ser configurable y ajustarse con datos reales.
- **Trade-off (escala):** las búsquedas comparten CPU con la instancia pequeña de RDS; si el
  catálogo crece mucho o hay mucho tráfico, habrá que revisar esta decisión.
- Las extensiones e índices se crean con migraciones no bloqueantes, según `CLAUDE.md`.
