# ADR 0007: API REST de solo lectura con contrato OpenAPI escrito primero

## Estado

Aceptado

## Contexto

La web pública consume la API de lectura (API Gateway + Lambda, ADR 0001). Las HUs del MVP
requieren tres operaciones: buscar productos agrupados (HU-03), ver los precios de un producto en
cada comercio con fecha de captura (HU-04) y listar categorías para el filtro (HU-03). El equipo
que construye trabaja con un TESTER y un DEV independientes que no ven el trabajo del otro, por lo
que necesitan un contrato común explícito.

## Decisión

La API es **REST/JSON de solo lectura**, versionada bajo `/v1`, expuesta con API Gateway HTTP API.
Su contrato vive en **`openapi.yaml`** en el repositorio y se escribe **antes** de implementar.
Endpoints del MVP:

- `GET /v1/productos?q=&marca=&categoria=&page=` → lista de productos agrupados
  `{ id, nombre, marca, tamaño, precioMin, cantidadComercios }`.
- `GET /v1/productos/{id}/precios` → precios por comercio ordenados de menor a mayor
  `{ comercio, precio, url, fechaCaptura, actualizadoHoy }`.
- `GET /v1/categorias` → `{ id, nombre }`.

El dueño del contrato es el equipo de construcción vía el LEAD; cualquier cambio pasa primero
por `openapi.yaml`.

## Alternativas consideradas

- **REST sin contrato formal (code-first)** — más rápido al arrancar. No se eligió porque el
  TESTER no tendría un documento independiente del código del DEV contra el cual escribir pruebas,
  y las divergencias se descubrirían tarde.
- **GraphQL con AppSync** — flexible para pantallas futuras. No se eligió por la complejidad
  extra para tres consultas simples, porque su free tier es temporal y porque complica el cacheo
  HTTP en CloudFront.

## Consecuencias

- TESTER y DEV trabajan contra el mismo documento; las respuestas pueden validarse
  automáticamente contra el esquema en los tests.
- Respuestas GET cacheables en CloudFront/API Gateway, aliviando a la instancia pequeña de RDS.
- **Trade-off:** `openapi.yaml` debe mantenerse al día con cada cambio; si se desactualiza, el
  contrato pierde valor y genera falsos verdes o rojos.
- Las funciones de comercios, administradores y soporte (promociones, usuarios, quejas) no forman
  parte de este contrato; requerirán endpoints autenticados en una decisión futura.
