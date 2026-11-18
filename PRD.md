# PRD — Comparador de precios entre comercios/supermercados

**Versión:** 1.2 — 2026-11-10

## Problema
Los consumidores pierden tiempo y tienen dificultades para encontrar la alternativa más
económica debido a que la información de precios de un mismo producto entre diferentes tiendas o
supermercados está dispersa, desactualizada o requiere consulta manual.

## Objetivo
Una web pública donde cualquier persona, sin necesidad de registrarse, busca un producto y ve
en qué comercio está más barato. Los precios se obtienen automáticamente de las webs de los
comercios y se actualizan una vez al día.

## Actores
- **Usuario final (Consumidor):** visitante anónimo de la web. Busca productos, consulta precios
  y revisa cuál es la alternativa más económica. No necesita cuenta.
- **Comercio o proveedor:** registra sus promociones en la plataforma.
- **Administrador:** gestiona a los usuarios del sistema y la lista de comercios cuyas webs se
  consultan.
- **Soporte:** revisa y atiende los reportes de quejas y errores.
- **Proceso de actualización (sistema):** obtiene los precios de las webs de los comercios una
  vez al día.

## Fuente de los datos
- Los precios se obtienen **exclusivamente mediante scraping** de las webs públicas de los
  comercios.
- **Frecuencia:** una vez al día.
- Cada precio guarda la **fecha en que se obtuvo**, y la web la muestra al usuario.
- Si falla la lectura de un comercio, se conservan sus últimos precios conocidos (con su fecha
  original) y la falla queda registrada para revisión. Los demás comercios no se ven afectados.

## Identificación del mismo producto
- Un mismo producto vendido en distintos comercios se reconoce por **similitud de nombre**.
- Antes de comparar, los nombres se normalizan: mayúsculas/minúsculas, tildes, signos y
  unidades de medida (ej.: "1,5 L", "1.5L" y "1500 ml" son equivalentes).
- Dos productos con distinta marca o distinto tamaño/presentación **no** se consideran el mismo
  producto.
- El nivel de similitud mínimo para agrupar es configurable (no fijo en el código).

## Alcance — Incluye
- Web pública, sin login para el consumidor.
- Búsqueda de productos por nombre, marca o categoría y en un rango de km, dentro del Perú.
- Filtros y ordenamiento de resultados.
- Comparación de precios del mismo producto entre comercios y visualización de productos
  similares.
- Actualización diaria de precios mediante scraping.
- Módulo de registro de promociones (para comercios).
- Registro de usuarios (para comercios, administradores y soporte).
- Módulo para registro y atención de quejas y errores (para usuarios y soporte).

## Alcance — No incluye (por ahora)
- Gestión de inventario (disponibilidad de stock físico del producto).
- Predicción avanzada de precios mediante inteligencia artificial.
- Historial de precios.
- Comunicación directa con el proveedor.
- Programación de búsquedas y alertas automáticas.
- Actualización de precios más de una vez al día o en tiempo real.
- Reconocimiento de productos por código de barras (EAN).
- Aplicación móvil nativa.
- Cuentas de usuario para consumidores.

## Criterios de éxito
El usuario puede encontrar un producto por nombre, marca o categoría, y el sistema logra mostrar
precios de ese producto en al menos dos establecimientos distintos (si existe información
disponible), indicando la fecha en que se obtuvo cada precio.

## Requisitos no funcionales
- **Disponibilidad:** la web debe seguir disponible aunque falle la actualización de precios.
- **Resiliencia:** el scraping debe incluir reintentos y una cola de errores (DLQ) para las
  lecturas que fallen definitivamente.
- **Configuración:** URLs de comercios, horario de actualización, umbral de similitud y
  credenciales se manejan por configuración/variables de entorno, nunca en el código.
- **Scraping responsable:** respetar `robots.txt` y limitar la frecuencia de peticiones a cada web.

## Supuestos
1. Las promociones registradas por los comercios se muestran como información adicional; no
   reemplazan el precio obtenido por scraping.
2. Un precio con más de 24 horas de antigüedad se sigue mostrando, pero marcado como
   "no actualizado hoy".
3. Si un comercio tiene varias publicaciones del mismo producto, en la comparación se muestra
   la de menor precio para comparar (RN-7).

## Reglas de negocio
1. **RN-1 — Mercado y moneda:** el sistema opera solo en el Perú y todos los precios se expresan
   en soles (`S/`). Se asume para todo el sistema: no se registra país ni moneda por producto y no
   hay filtro por país.
2. **RN-2 — Comercios de la primera versión:** Wong, Plaza Vea y Metro. Se tratan como tres
   comercios distintos aunque pertenezcan al mismo grupo empresarial.
3. **RN-3 — Nombres y slugs:** el nombre del comercio va con cada palabra en mayúscula inicial
   (`Plaza Vea`); su slug va en minúsculas con guiones (`wong`, `plaza-vea`, `metro`).
4. **RN-4 — Precios capturados:** por cada producto se registran el precio regular y, si la web lo
   publica, el precio de oferta. El precio de oferta es el que muestra la web del comercio; no es
   lo mismo que las promociones registradas en la plataforma (Supuesto 1).
5. **RN-5 — Horario:** la actualización diaria se ejecuta a las 06:00, hora del Perú.
6. **RN-6 — Permiso legal del scraping:** no se revisan los términos de uso de cada web. Es una
   decisión del humano, que asume el riesgo. Se siguen respetando `robots.txt` y el límite de
   peticiones (Requisitos no funcionales).
7. **RN-7 — Precio para comparar:** se usa el precio de oferta si existe; si no, el precio
   regular. Con este precio se calculan "Desde", el orden de la comparación y el comercio más
   barato. Si hay oferta, el precio regular se muestra tachado al lado.

## Puntos abiertos
1. **Cálculo del filtro de distancia en km:** el Alcance incluye búsqueda "en un rango de km",
   pero no está definido cómo se calculará esa distancia **sin usar APIs de mapas externas**
   (qué fuente provee las coordenadas de comercios y usuario, qué fórmula se usa — distancia en
   línea recta tipo Haversine vs. distancia de ruta real — y qué precisión se espera). Requiere
   definición antes de construir esta funcionalidad.
2. ~~Contradicción aparente sobre el país/mercado objetivo~~ — **Resuelto (v1.2, CAMBIO-01):**
   ver RN-1.
3. ~~Comercios iniciales~~ — **Resuelto (v1.2, CAMBIO-01):** ver RN-2 y RN-3.
4. ~~Permiso legal del scraping~~ — **Cerrado por decisión (v1.2, CAMBIO-01):** ver RN-6.

## Registro de cambios
| Versión | Fecha | Qué cambió | Quién lo decidió | Cambio |
|---|---|---|---|---|
| 1.1 | 2026-10-01 | Versión base del PRD | — | — |
| 1.2 | 2026-11-10 | Mercado solo Perú (se quita el filtro por país) y moneda en soles; comercios Wong, Plaza Vea y Metro; precio regular y de oferta; horario 06:00; sin revisión legal; se cierran los puntos abiertos 2, 3 y 4 | Humano (pabloosoriodev) | CAMBIO-01 |
| 1.2 | 2026-11-10 | Precio para comparar: oferta si existe, si no regular (RN-7) | Humano (pabloosoriodev) | CAMBIO-01 |
