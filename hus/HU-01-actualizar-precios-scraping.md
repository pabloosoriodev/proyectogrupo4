# HU-01 — Actualizar precios diariamente mediante scraping

**Actor:** Proceso / Administrador · **Depende de:** — · **Origen:** `../PRD.md` v1.2 (CAMBIO-01)

**Como** administrador
**quiero** que el sistema obtenga automáticamente los precios de las webs de los comercios una vez al día
**para** que los consumidores vean información vigente sin carga manual.

## Criterios de aceptación
1. **Ejecución diaria:** Dado un horario configurado, cuando llega esa hora, entonces el proceso
   se ejecuta automáticamente una vez sin intervención manual (valor inicial: 06:00, hora del
   Perú, PRD RN-5).
2. **Datos capturados:** Dado un comercio activo, cuando se lee su web, entonces por cada producto
   se guarda: nombre, marca (si existe), categoría (si existe), precio regular, precio de oferta
   (si existe), comercio, URL del producto y fecha/hora de captura. Los precios están en soles
   (PRD RN-1, RN-4).
3. **Reintentos:** Dado que la lectura de un comercio falla, cuando ocurre el error, entonces el
   sistema reintenta la cantidad de veces configurada antes de darla por fallida.
4. **Cola de errores (DLQ):** Dado que se agotaron los reintentos, entonces el error se envía a la
   DLQ con el comercio, la URL y el motivo del fallo.
5. **Aislamiento de fallos:** Dado que un comercio falla, entonces los demás comercios se
   procesan con normalidad.
6. **Conservación de datos:** Dado que un comercio falla, entonces sus últimos precios conocidos
   se mantienen con su fecha original (no se borran).
7. **Scraping responsable:** el proceso respeta `robots.txt` y el límite de peticiones configurado
   para cada web.
8. **Sin valores fijos en código:** URLs de comercios, horario, número de reintentos y límites se
   leen de configuración/variables de entorno.

## Escenarios del caso nuevo (CAMBIO-01)
```gherkin
# language: es
Característica: Captura de precio regular y de oferta

  Escenario: El producto tiene precio de oferta
    Dado que el comercio "Plaza Vea" con slug "plaza-vea" está activo
    Y su web publica un producto con precio regular S/ 5.90 y precio de oferta S/ 4.90
    Cuando se ejecuta la actualización diaria
    Entonces la publicación guarda el precio regular 5.90 y el precio de oferta 4.90
    Y guarda la fecha y hora de captura

  Escenario: El producto no tiene precio de oferta
    Dado que el comercio "Wong" con slug "wong" está activo
    Y su web publica un producto con precio regular S/ 5.90 y sin precio de oferta
    Cuando se ejecuta la actualización diaria
    Entonces la publicación guarda el precio regular 5.90 y el precio de oferta vacío
```

## Puntos abiertos
- ~~Qué comercios se consultan (PRD, punto 3)~~ — **Resuelto:** Wong, Plaza Vea y Metro (PRD RN-2).
- ~~Permiso legal (PRD, punto 4)~~ — **Cerrado por decisión del humano:** sin revisión (PRD RN-6).
- ~~Qué precio se usa para comparar~~ — **Resuelto:** oferta si existe, si no regular (PRD RN-7).
