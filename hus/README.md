# Historias de Usuario — Comparador de precios

Basadas en `../PRD.md` v1.2. Esta primera entrega cubre el flujo principal (criterio de éxito del PRD):
obtener precios → reconocer el mismo producto → buscar → comparar.

| ID    | Historia                                                                  | Actor                   | Depende de   |
|-------|---------------------------------------------------------------------------|-------------------------|--------------|
| HU-01 | [Actualizar precios diariamente mediante scraping](HU-01-actualizar-precios-scraping.md) | Proceso / Administrador | —            |
| HU-02 | [Reconocer el mismo producto por nombre similar](HU-02-reconocer-mismo-producto.md)       | Consumidor              | HU-01        |
| HU-03 | [Buscar productos](HU-03-buscar-productos.md)                                             | Consumidor              | HU-01        |
| HU-04 | [Comparar precios de un producto entre comercios](HU-04-comparar-precios.md)              | Consumidor              | HU-02, HU-03 |

## Pendientes para próximas HUs
- Filtro por distancia en km (bloqueado por el punto abierto 1 del PRD). No hay filtro por país
  (PRD RN-1).
- Filtros y ordenamiento adicionales en resultados.
- Registro de promociones (comercios).
- Registro de usuarios (comercio, administrador, soporte).
- Registro y atención de quejas y errores.
