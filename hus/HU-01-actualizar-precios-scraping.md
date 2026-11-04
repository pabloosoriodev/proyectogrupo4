# HU-01 — Actualizar precios diariamente mediante scraping

**Actor:** Proceso / Administrador · **Depende de:** — · **Origen:** `../PRD.md` v1.1

**Como** administrador
**quiero** que el sistema obtenga automáticamente los precios de las webs de los comercios una vez al día
**para** que los consumidores vean información vigente sin carga manual.

## Criterios de aceptación
1. **Ejecución diaria:** Dado un horario configurado, cuando llega esa hora, entonces el proceso
   se ejecuta automáticamente una vez sin intervención manual.
2. **Datos capturados:** Dado un comercio activo, cuando se lee su web, entonces por cada producto
   se guarda: nombre, marca (si existe), categoría (si existe), precio, comercio, URL del producto
   y fecha/hora de captura.
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
