# Technical Design Document: Comparador de precios entre comercios/supermercados

**Tipo de proyecto:** Greenfield — no existe código ni infraestructura previa.
**Design.md disponible:** No — el modelo de datos se derivó solo del PRD (v1.1) y de las HUs
(HU-01 a HU-04).
**Restricción del equipo:** priorizar opciones gratuitas (free tier).
**Fecha:** 2026-10-15

## Resumen

Se construye una web pública, sin login, donde cualquier persona busca un producto por nombre,
marca o categoría y ve en qué comercio está más barato, con la fecha en que se obtuvo cada precio
(PRD, Objetivo y Criterios de éxito). Los precios se obtienen una vez al día por scraping de las
webs de los comercios, con reintentos y cola de errores, sin afectar la disponibilidad de la web
cuando la actualización falla. El sistema es serverless sobre AWS, en JavaScript (Node.js), con
PostgreSQL en RDS, y se mantiene dentro del free tier. Este documento cubre el MVP definido por
HU-01 a HU-04; promociones, registro de usuarios, quejas y los filtros por país y distancia quedan
fuera hasta resolver los puntos abiertos del PRD.

## Arquitectura de componentes

Todo es nuevo. Cuatro componentes desacoplados (ADR 0001) en un monorepo (ADR 0012):

```
                 EventBridge Scheduler (1 vez al día, horario configurable)
                              │
                     Lambda orquestador ── lee comercios activos (Parameter Store)
                              │ 1 mensaje por comercio
                 ┌────────────┴────────────┐
           SQS scraping-liviano      SQS scraping-browser
           (json / html)             (Playwright)
                 │  hasta 3 intentos        │
                 ├──────────► DLQ ◄─────────┤   (revisión manual, 14 días)
                 ▼                          ▼
        Lambda scraper liviano     Lambda scraper browser
                 └──── normaliza + agrupa (pg_trgm) ────┐
                                                        ▼
                                          Amazon RDS PostgreSQL
                                          (público, SSL, mínimo privilegio)
                                                        ▲
   Navegador ─► CloudFront ─► S3 (SPA React)            │
        └────► API Gateway (HTTP API, /v1) ─► Lambda API (solo lectura)
```

| Componente | Responsabilidad | Carpeta |
|---|---|---|
| Web pública | Búsqueda, resultados y comparación de precios (SPA estática) | `web/` |
| API de lectura | Endpoints REST `/v1` definidos en `openapi.yaml` | `api/` |
| Pipeline de scraping | Orquestar, leer cada comercio con su adaptador, normalizar, agrupar y guardar | `scraper/` |
| Lógica compartida | Normalización de texto y unidades, extracción de marca/tamaño, tipos | `shared/` |
| Base de datos | Comercios, categorías, grupos de productos y publicaciones con su último precio | `db/migrations/` |
| Infraestructura | Plantilla SAM de todos los recursos AWS | `infra/` |

La API y el pipeline nunca se llaman entre sí: solo comparten la base de datos. Configuración y
secretos se leen de SSM Parameter Store (ADR 0010).

## Decisiones de arquitectura

| # | Decisión | Estado |
|---|---|---|
| [ADR-0001](adrs/0001-arquitectura-serverless-desacoplada.md) | Arquitectura serverless desacoplada con cola por comercio | Aceptado |
| [ADR-0002](adrs/0002-postgresql-en-amazon-rds.md) | PostgreSQL alojado en Amazon RDS | Aceptado |
| [ADR-0003](adrs/0003-red-rds-publico-endurecido.md) | Lambdas fuera de VPC y RDS con acceso público endurecido | Aceptado |
| [ADR-0004](adrs/0004-scraping-hibrido-por-adaptador.md) | Scraping híbrido con un adaptador por comercio | Aceptado |
| [ADR-0005](adrs/0005-agrupacion-productos-claves-duras-pg-trgm.md) | Agrupación de productos con claves duras + pg_trgm | Aceptado |
| [ADR-0006](adrs/0006-busqueda-postgresql-unaccent-pg-trgm.md) | Búsqueda en PostgreSQL con unaccent + pg_trgm | Aceptado |
| [ADR-0007](adrs/0007-api-rest-contrato-openapi.md) | API REST de solo lectura con contrato OpenAPI primero | Aceptado |
| [ADR-0008](adrs/0008-frontend-react-vite-spa.md) | Frontend SPA en React + Vite servida estáticamente | Aceptado |
| [ADR-0009](adrs/0009-infraestructura-como-codigo-aws-sam.md) | Infraestructura como código con AWS SAM | Aceptado |
| [ADR-0010](adrs/0010-configuracion-y-secretos-parameter-store.md) | Configuración y secretos en SSM Parameter Store | Aceptado |
| [ADR-0011](adrs/0011-resiliencia-reintentos-dlq-revision-manual.md) | Resiliencia con reintentos SQS, DLQ y revisión manual | Aceptado |
| [ADR-0012](adrs/0012-monorepo-npm-workspaces.md) | Monorepo con npm workspaces | Aceptado |

## Modelo de datos

Derivado del PRD y de HU-01 a HU-04 (sin Design.md). El PRD excluye el historial de precios, por
lo que cada publicación guarda **solo su último precio** conocido.

| Entidad | Campos principales | Notas |
|---|---|---|
| `comercio` | `id`, `slug` (único), `nombre`, `activo` | Datos para mostrar y relacionar. La configuración de scraping (URL, tipo de adaptador, límites) vive en Parameter Store bajo el mismo `slug` (ADR 0010). |
| `categoria` | `id`, `nombre`, `nombre_normalizado` (único) | Alimenta el filtro de HU-03. |
| `producto_grupo` | `id`, `nombre_display`, `marca_normalizada`, `tamano_valor`, `tamano_unidad` (ml / g / u), `resto_normalizado`, `categoria_id` | Producto "lógico" agrupado (ADR 0005). Índice sobre (`marca_normalizada`, `tamano_valor`, `tamano_unidad`) e índice GIN de trigramas sobre el texto normalizado (ADR 0005 y 0006). |
| `publicacion` | `id`, `comercio_id`, `grupo_id`, `nombre_original`, `nombre_normalizado`, `marca`, `categoria_origen`, `url`, `precio` (numeric), `fecha_captura` | Un producto tal como lo publica un comercio. Único por (`comercio_id`, `url`). Un comercio que falla no modifica sus filas (ADR 0011). |

Relaciones: `comercio 1─N publicacion N─1 producto_grupo N─1 categoria`.

Valores derivados (no se guardan):

- `precioMin` y `cantidadComercios` de un grupo: el mínimo y el conteo de comercios distintos
  entre sus publicaciones. Si un comercio tiene varias publicaciones del grupo, cuenta la de menor
  precio (PRD Supuesto 3, HU-02).
- `actualizadoHoy`: `false` cuando `fecha_captura` tiene más de 24 horas (PRD Supuesto 2).

Todas las migraciones (tablas, extensiones `pg_trgm` y `unaccent`, índices) deben ser no
bloqueantes (`CREATE INDEX CONCURRENTLY`), según `CLAUDE.md`.

## Valores de configuración iniciales

Todos viven en Parameter Store (ADR 0010) y se ajustan con datos reales sin cambiar código.

| Parámetro | Valor inicial |
|---|---|
| `UMBRAL_SIMILITUD` (agrupación) | 0.6 |
| Umbral de similitud de búsqueda | 0.3 |
| Resultados por página | 20 |
| Intentos totales por comercio (`maxReceiveCount`) | 3 (1 intento + 2 reintentos) |
| Retención de la DLQ | 14 días |
| Horario del scraping | por definir al configurar los comercios |

## Criterios de aceptación por flujo

### Actualización diaria de precios (HU-01)

- [ ] EventBridge Scheduler ejecuta el orquestador una vez al día en el horario leído de la
      configuración, sin intervención manual.
- [ ] El orquestador publica exactamente un mensaje SQS por cada comercio activo, enrutado a la
      cola liviana o browser según su tipo de adaptador.
- [ ] Por cada producto leído se guarda nombre, marca (si existe), categoría (si existe), precio,
      comercio, URL y fecha/hora de captura.
- [ ] Un comercio que falla se procesa hasta 3 intentos en total (1 + 2 reintentos) y luego aparece
      en la DLQ con comercio, URL y motivo del fallo.
- [ ] Si un comercio falla, el resto de comercios de la misma ejecución se guardan correctamente
      (verificable forzando el fallo de un comercio en un test de integración).
- [ ] Si un comercio falla, sus publicaciones previas mantienen su precio y su `fecha_captura`
      original.
- [ ] El scraper no solicita rutas prohibidas por `robots.txt` y no supera el límite de peticiones
      configurado por web.
- [ ] Ninguna URL, horario, umbral, credencial ni número de reintentos aparece en el código fuente.

### Agrupación de productos (HU-02)

- [ ] "1,5 L", "1.5L" y "1500 ml" se normalizan al mismo tamaño en unidad base.
- [ ] "Coca Cola 1.5L" (comercio A) y "Gaseosa Coca-Cola 1,5 L" (comercio B) quedan en el mismo
      `producto_grupo`.
- [ ] "Coca Cola 1.5L" y "Coca Cola 500 ml" quedan en grupos distintos.
- [ ] "Arroz Costeño 1 kg" y "Arroz Paisana 1 kg" quedan en grupos distintos.
- [ ] Cambiar `UMBRAL_SIMILITUD` en Parameter Store cambia el resultado de la agrupación sin
      desplegar código.
- [ ] Un producto que no supera el umbral con ningún grupo crea un grupo nuevo.
- [ ] Si un comercio tiene dos publicaciones en el mismo grupo, la comparación usa la de menor
      precio.

### Búsqueda de productos (HU-03)

- [ ] `GET /v1/productos?q=leche` responde sin autenticación y devuelve grupos cuyo nombre
      contiene o se parece a "leche".
- [ ] `q=azucar` devuelve productos cuyo nombre contiene "Azúcar".
- [ ] El filtro `marca=Gloria` devuelve solo productos de esa marca, y el filtro `categoria`
      devuelve solo productos de esa categoría.
- [ ] Cada resultado incluye `precioMin` y `cantidadComercios`, y la página tiene como máximo
      20 resultados.
- [ ] Un término vacío o de menos de 2 caracteres responde 400 en la API y la web no lanza la
      búsqueda y muestra un aviso.
- [ ] Sin coincidencias, la API devuelve una lista vacía y la web muestra un mensaje claro.
- [ ] La respuesta cumple el esquema de `openapi.yaml`.

### Comparación de precios (HU-04)

- [ ] `GET /v1/productos/{id}/precios` devuelve un elemento por comercio, ordenado por precio
      ascendente, con `comercio`, `precio`, `url`, `fechaCaptura` y `actualizadoHoy`.
- [ ] La web resalta visualmente el comercio con el precio más bajo.
- [ ] Un precio con `fecha_captura` de más de 24 horas aparece marcado "no actualizado hoy".
- [ ] Cada precio enlaza a la página del producto en la web del comercio.
- [ ] Un producto disponible en un solo comercio muestra su precio y el aviso de que no hay otros
      comercios para comparar.
- [ ] Un `id` inexistente responde 404.

### Disponibilidad y rendimiento (requisitos no funcionales)

- [ ] Con el pipeline de scraping fallando por completo, la web y la API siguen respondiendo con
      los últimos precios conocidos.
- [ ] El percentil 95 de los tiempos de respuesta de búsqueda y comparación es menor a 1 s,
      excluyendo arranques en frío, con el volumen del MVP.
- [ ] Todas las Lambdas registran logs en JSON con el comercio o endpoint y un identificador de
      ejecución.

## Riesgos técnicos abiertos

- **Legalidad del scraping (PRD, Punto abierto 4):** cada web debe revisarse antes de crear su
  adaptador. Bloquea agregar comercios, no el esqueleto.
- **Comercios iniciales sin definir (PRD, Punto abierto 3):** hasta saberlos no se sabe cuántos
  necesitan el modo `browser` (ADR 0004), que es el más caro y frágil.
- **País, moneda y distancia (PRD, Puntos abiertos 1 y 2):** el modelo no incluye país, moneda ni
  ubicación de los comercios. Resolver esos puntos implicará nuevas columnas, migraciones y
  probablemente nuevas ADRs.
- **Vencimiento del free tier de RDS (ADR 0002):** después de los créditos o los 12 meses cuesta
  aprox. 15 USD/mes. Hay que decidir antes si se paga o se migra a Neon o Supabase.
- **Base de datos expuesta a internet sin rotación automática de contraseñas (ADR 0003 y 0010):**
  la seguridad depende de credenciales que rotan a mano.
- **Fallas sin alerta automática (ADR 0011):** depende de que el equipo revise la DLQ y los logs;
  si no lo hace en 14 días, se pierden los mensajes.
- **Calidad de agrupación (ADR 0005):** depende de extraer bien marca y tamaño y de mantener un
  diccionario de marcas; puede generar grupos duplicados.
- **Doble fuente de comercios:** los datos de `comercio` están en la base y su configuración de
  scraping en Parameter Store, enlazados por `slug`; pueden desincronizarse si se edita uno sin el
  otro. Cuando exista el módulo del Administrador, habrá que decidir una única fuente.
- **Jest en el frontend (ADR 0008):** Vite usa Vitest por defecto y `CLAUDE.md` fija Jest; hace
  falta configuración adicional.
- **SEO limitado (ADR 0008):** la SPA no favorece el tráfico desde buscadores.
- **Diagramas:** generados con `archify` en `docs/diagramas/`:
  [componentes](docs/diagramas/componentes.html),
  [scraping diario](docs/diagramas/scraping-diario.html) y
  [modelo de datos](docs/diagramas/modelo-datos.html). Pasaron la validación de esquema, entrega y
  revisión estricta de archify; la comprobación en navegador real **no se pudo ejecutar** (Chrome no
  responde con Node v26 en esta máquina) y no se hizo revisión visual. Los tipos SQL del diagrama de
  datos son una propuesta inicial.
