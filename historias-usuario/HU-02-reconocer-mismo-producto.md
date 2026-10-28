# HU-02 — Reconocer el mismo producto por nombre similar

**Actor:** Consumidor · **Depende de:** HU-01 · **Origen:** `../PRD.md` v1.1

**Como** consumidor
**quiero** que un mismo producto vendido en distintas tiendas aparezca agrupado aunque cada tienda lo nombre distinto
**para** poder comparar sus precios.

## Criterios de aceptación
1. **Normalización:** los nombres se comparan ignorando mayúsculas, tildes y signos, y con unidades
   equivalentes ("1,5 L" = "1.5L" = "1500 ml").
2. **Agrupa nombres similares:** Dados "Coca Cola 1.5L" (comercio A) y "Gaseosa Coca-Cola 1,5 L"
   (comercio B), cuando se procesan, entonces quedan agrupados como el mismo producto.
3. **No agrupa tamaños distintos:** Dados "Coca Cola 1.5L" y "Coca Cola 500 ml", entonces quedan
   como productos distintos.
4. **No agrupa marcas distintas:** Dados "Arroz Costeño 1 kg" y "Arroz Paisana 1 kg", entonces
   quedan como productos distintos.
5. **Umbral configurable:** el nivel mínimo de similitud para agrupar se define por configuración
   y puede ajustarse sin cambiar código.
6. **Un precio por comercio:** Dado que un comercio tiene dos publicaciones agrupadas como el mismo
   producto, entonces en la comparación se usa la de menor precio.
7. **Producto nuevo:** Dado un producto que no supera el umbral con ningún grupo existente,
   entonces se crea un grupo nuevo.
