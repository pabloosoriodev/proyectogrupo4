# ADR 0003: Red — Lambdas fuera de VPC y RDS con acceso público endurecido

## Estado

Aceptado

## Contexto

Con RDS (ADR 0002), la ubicación de red condiciona el costo:

- El scraper necesita salir a internet para leer las webs de los comercios, y todas las Lambdas
  necesitan llegar a SQS y a Parameter Store.
- Una Lambda dentro de una VPC no tiene salida a internet sin un NAT Gateway (~32 USD/mes) o una
  instancia NAT, ni acceso a SQS/Parameter Store sin NAT o *VPC interface endpoints* (de pago).
- El equipo prioriza opciones gratuitas. La aplicación no maneja datos personales ni sensibles
  (`CLAUDE.md`, sección Security).

## Decisión

Las Lambdas (API, orquestador y scraper) se ejecutan **fuera de VPC**, y la instancia RDS tiene
**acceso público habilitado y endurecido**:

- Conexión SSL/TLS obligatoria (`rds.force_ssl = 1`).
- Usuarios de base de datos con mínimo privilegio y separados por componente (la API solo lee;
  el scraper escribe precios; las migraciones usan un usuario propio).
- Contraseñas largas y aleatorias guardadas como `SecureString` en Parameter Store, nunca en el
  código ni en variables en texto plano del repo.

## Alternativas consideradas

- **VPC privada + instancia NAT** (EC2 pequeña) — RDS no expuesto a internet, más seguro. No se
  eligió porque no es completamente gratis (~3-4 USD/mes fuera del free tier) y la instancia NAT
  es un punto único de falla que hay que mantener.
- **VPC privada + NAT Gateway** — la opción estándar y administrada de AWS. No se eligió por su
  costo (~32 USD/mes + tráfico), incompatible con la restricción de opciones gratuitas.

## Consecuencias

- Costo de red: 0 USD. Las Lambdas acceden a internet, SQS y Parameter Store sin infraestructura
  adicional, y arrancan más rápido al no adjuntarse a una VPC.
- **Trade-off (seguridad):** la base de datos es alcanzable desde internet; su protección depende
  de credenciales, SSL y privilegios, no del aislamiento de red. No se puede filtrar por IP porque
  las Lambdas fuera de VPC no tienen IP fija. Se acepta porque la app no maneja datos personales,
  pero un robo de credenciales expondría la base directamente.
- **Trade-off (reversibilidad):** si el proyecto pasa a manejar datos sensibles o deja de estar
  limitado a lo gratuito, migrar a VPC privada exige agregar NAT y mover las Lambdas a la VPC; debe
  revisarse esta ADR en ese momento.
