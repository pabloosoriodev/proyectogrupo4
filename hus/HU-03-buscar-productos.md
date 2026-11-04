# HU-03 — Buscar productos

**Actor:** Consumidor · **Depende de:** HU-01 · **Origen:** `../PRD.md` v1.1

**Como** consumidor
**quiero** buscar productos por nombre, marca o categoría desde la web, sin registrarme
**para** encontrar rápidamente lo que necesito.

## Criterios de aceptación
1. **Acceso público:** la búsqueda funciona sin iniciar sesión.
2. **Por nombre:** Dado que escribo "leche", cuando busco, entonces veo los productos cuyo nombre
   contiene o se parece a "leche".
3. **Por marca:** Dado que escribo una marca (ej. "Gloria"), cuando busco, entonces veo los
   productos de esa marca.
4. **Por categoría:** Dado que selecciono una categoría, cuando busco, entonces veo solo productos
   de esa categoría.
5. **Tolerancia:** la búsqueda ignora mayúsculas y tildes ("azucar" encuentra "Azúcar").
6. **Resultados agrupados:** cada resultado es un producto (agrupado según HU-02) y muestra su
   precio más bajo y en cuántos comercios está disponible.
7. **Sin resultados:** Dado que no hay coincidencias, entonces se muestra un mensaje claro
   indicándolo.
8. **Validación:** Dado un término vacío o de menos de 2 caracteres, entonces no se ejecuta la
   búsqueda y se muestra un aviso.
