# HU-04 — Comparar precios de un producto entre comercios

**Actor:** Consumidor · **Depende de:** HU-02, HU-03 · **Origen:** `../PRD.md` v1.1

**Como** consumidor
**quiero** ver los precios de un producto en los distintos comercios ordenados de menor a mayor
**para** identificar la alternativa más económica.

## Criterios de aceptación
1. **Lista de precios:** Dado que selecciono un producto de los resultados, entonces veo cada
   comercio que lo vende con su precio.
2. **Orden:** los comercios aparecen ordenados del precio más bajo al más alto.
3. **Más barato destacado:** el comercio con el precio más bajo se resalta visualmente.
4. **Fecha del precio:** cada precio muestra la fecha en que se obtuvo.
5. **Precio no actualizado:** Dado un precio con más de 24 horas de antigüedad, entonces se muestra
   marcado como "no actualizado hoy".
6. **Enlace al comercio:** cada precio incluye un enlace a la página del producto en la web del
   comercio.
7. **Un solo comercio:** Dado que el producto solo está en un comercio, entonces se muestra su
   precio con un aviso de que no hay otros comercios para comparar.
