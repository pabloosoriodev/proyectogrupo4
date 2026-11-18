# ADR 0002: PostgreSQL alojado en Amazon RDS

## Estado

Aceptado

## Contexto

`CLAUDE.md` fija PostgreSQL como base de datos relacional, prioriza servicios administrados de AWS
y exige migraciones no bloqueantes (`CONCURRENTLY`). El equipo prioriza opciones gratuitas. El
volumen inicial es pequeño (decenas de comercios, miles de productos, < 0.5 GB). La base la usan
dos componentes Lambda (API y scraper, ADR 0001), lo que obliga a cuidar la cantidad de conexiones
abiertas.

## Decisión

Se usa **Amazon RDS for PostgreSQL** en una instancia de la clase incluida en el free tier
(single-AZ, almacenamiento mínimo del free tier). La topología de red se define en ADR 0003.

## Alternativas consideradas

- **Neon** — Postgres serverless con plan gratuito permanente y driver HTTP pensado para Lambda
  (sin problemas de conexiones ni VPC). No se eligió para mantener todo dentro de AWS, como
  prefiere `CLAUDE.md`.
- **Supabase** — plan gratuito permanente con pooler incluido. No se eligió por estar fuera de
  AWS, por pausar proyectos gratuitos inactivos y por incluir servicios (auth, storage) que el
  proyecto no necesita.

## Consecuencias

- Un único proveedor (AWS) para cómputo, colas, configuración y datos: una sola consola, una sola
  facturación, IAM y CloudWatch unificados.
- **Trade-off (costo):** RDS es gratis solo por tiempo limitado (según el plan de free tier de la
  cuenta: créditos o 12 meses). Después cuesta aprox. 15 USD/mes. Hay que decidir antes de que
  venza si se sigue pagando o se migra
  (Neon/Supabase siguen siendo alternativas compatibles al ser PostgreSQL estándar).
- **Trade-off (disponibilidad):** single-AZ no cumple alta disponibilidad estricta; Multi-AZ no
  entra en el free tier. Se acepta porque el PRD solo exige que la web siga disponible si falla
  la *actualización*, y los backups automáticos de RDS permiten recuperar ante una caída.
- **Trade-off (conexiones):** sin RDS Proxy (de pago), cada Lambda debe reutilizar una única
  conexión entre invocaciones (crearla fuera del handler) y limitar su concurrencia reservada,
  para no superar el máximo de conexiones de una instancia pequeña.
