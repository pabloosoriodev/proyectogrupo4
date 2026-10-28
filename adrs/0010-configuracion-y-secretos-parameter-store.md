# ADR 0010: Configuración y secretos en SSM Parameter Store

## Estado

Aceptado

## Contexto

`CLAUDE.md` prohíbe valores escritos en el código (credenciales, URLs, configuraciones) y pide
inyectar secretos desde AWS Secrets Manager o Parameter Store. El PRD exige que "URLs de comercios,
horario de actualización, umbral de similitud y credenciales se manejan por configuración/variables
de entorno". ADR 0003 define usuarios de base de datos separados por componente, con contraseñas
fuertes. El equipo prioriza opciones gratuitas.

## Decisión

Toda la configuración y los secretos viven en **SSM Parameter Store**, organizados por entorno
(`/comparador/{entorno}/...`):

- `SecureString` para credenciales de base de datos (un usuario por componente).
- `String` para la configuración de negocio y operación: comercios activos con su URL y tipo de
  adaptador (ADR 0004), horario del scraping, `UMBRAL_SIMILITUD` (ADR 0005), umbral de búsqueda
  (ADR 0006), número de reintentos y límites de peticiones por web.

Las Lambdas leen los parámetros al arrancar y los mantienen en memoria durante la vida del
contenedor.

## Alternativas consideradas

- **Secrets Manager para credenciales + Parameter Store para el resto** — permite rotar
  automáticamente las contraseñas de RDS. No se eligió por su costo (~0.40 USD/mes por secreto,
  ~1.5-2 USD/mes con un usuario por componente), contrario a la restricción de opciones gratuitas.

## Consecuencias

- Costo 0 USD (parámetros Standard); un único lugar para cambiar configuración sin desplegar
  código.
- **Trade-off (seguridad):** sin rotación automática; las contraseñas de base de datos se rotan a
  mano, lo que en la práctica significa que rotarán poco. Esto pesa más porque RDS es accesible
  desde internet (ADR 0003).
- **Trade-off (frescura):** al cachear los parámetros en memoria, un cambio de configuración no
  aplica hasta que las Lambdas se reciclan; para cambios urgentes hay que forzar un redeploy.
