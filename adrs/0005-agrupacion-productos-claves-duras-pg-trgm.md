# ADR 0005: Agrupación de productos con claves duras + similitud de trigramas (pg_trgm)

## Estado

Aceptado

## Contexto

El PRD define que "un mismo producto vendido en distintos comercios se reconoce por similitud de
nombre", previa normalización de mayúsculas, tildes, signos y unidades ("1,5 L", "1.5L" y
"1500 ml" son equivalentes); que "dos productos con distinta marca o distinto tamaño/presentación
no se consideran el mismo producto"; y que "el nivel de similitud mínimo para agrupar es
configurable". HU-02 agrega: un producto que no supera el umbral con ningún grupo crea un grupo
nuevo, y si un comercio tiene dos publicaciones del mismo grupo se usa la de menor precio. El
reconocimiento por código de barras (EAN) y la IA están fuera de alcance.

## Decisión

La agrupación se calcula **al guardar** cada producto scrapeado:

1. **Normalizar** el nombre: minúsculas, sin tildes ni signos, unidades convertidas a unidad base
   (ml, g, unidades).
2. **Extraer claves duras**: marca y tamaño/presentación en unidad base. Si la web no entrega la
   marca, se infiere con un diccionario de marcas.
3. **Buscar candidatos** solo entre grupos con la misma marca y el mismo tamaño.
4. **Comparar** el resto del nombre con `similarity()` de la extensión `pg_trgm` de PostgreSQL.
   Si el mejor candidato supera el `UMBRAL_SIMILITUD` (configuración, no código) se asigna a ese
   grupo; si no, se crea un grupo nuevo.

## Alternativas consideradas

- **Similitud calculada en Node** (librería tipo token-set ratio) — más control del algoritmo y
  fácil de testear aislado. No se eligió porque obliga a traer los candidatos a la memoria de la
  Lambda y no aprovecha los índices de la base de datos.
- **Embeddings semánticos + pgvector** — más robusto ante sinónimos. No se eligió porque requiere
  una API de pago o un modelo propio, es menos explicable al usuario y se acerca a la IA que el
  PRD deja fuera de alcance.

## Consecuencias

- Las reglas duras del PRD (marca y tamaño distintos nunca se agrupan) se cumplen por
  construcción, no dependen del umbral.
- La similitud se resuelve en la base con índices GIN de trigramas; `pg_trgm` está disponible sin
  costo en RDS.
- El mismo índice de trigramas sirve para la búsqueda tolerante (ver ADR de búsqueda).
- **Trade-off (calidad de extracción):** la calidad del agrupamiento depende de extraer bien
  marca y tamaño; nombres mal escritos o sin marca pueden generar grupos duplicados. El diccionario
  de marcas requiere mantenimiento manual.
- **Trade-off (testabilidad):** parte de la lógica vive en SQL, por lo que necesita tests de
  integración contra PostgreSQL real (previstos en `CLAUDE.md`), no solo tests unitarios.
- La creación de la extensión y de los índices debe hacerse en migraciones no bloqueantes
  (`CREATE INDEX CONCURRENTLY`), según `CLAUDE.md`.
