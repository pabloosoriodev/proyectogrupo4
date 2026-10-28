# ADR 0009: Infraestructura como código con AWS SAM

## Estado

Aceptado

## Contexto

La arquitectura de ADR 0001 tiene muchas piezas (Lambdas, API Gateway, EventBridge Scheduler,
SQS + DLQ, S3, CloudFront, permisos IAM) que deben crearse de forma reproducible. `CLAUDE.md` pide
levantar el proyecto localmente con `serverless-offline` o `sam local` (`npm run dev`), empaquetar
las funciones con `npm run build`, y prohíbe desplegar en producción sin aprobación de un
supervisor. El equipo prioriza opciones gratuitas.

## Decisión

Toda la infraestructura se define en **AWS SAM** (`template.yaml`, sobre CloudFormation) y se
despliega con `sam build` / `sam deploy`, con un stack por entorno (desarrollo y producción). El
desarrollo local usa `sam local` para emular Lambda y API Gateway.

## Alternativas consideradas

- **Serverless Framework v4** — YAML más conciso y `serverless-offline` muy cómodo. No se eligió
  porque desde la v4 exige cuenta de Serverless Inc. y licencia de pago a partir de cierto tamaño
  de organización: agrega un proveedor externo a una solución que se quiere gratuita.
- **Terraform** — estándar multi-nube y muy expresivo. No se eligió porque no emula Lambda
  localmente (habría que combinarlo con otra herramienta) y exige gestionar el estado remoto.

## Consecuencias

- Herramienta oficial y gratuita de AWS, sin cuentas ni licencias de terceros; los cambios de
  infraestructura quedan versionados y revisables en PRs.
- **Trade-off:** `template.yaml` es verboso y `sam local` requiere Docker y es más lento que
  `serverless-offline`.
- **Trade-off:** SAM cubre bien lo serverless, pero RDS y CloudFront se escriben como recursos
  CloudFormation "crudos", más largos de mantener.
- El stack de producción no se despliega ni modifica sin validación explícita de un supervisor
  (`CLAUDE.md`).

## Enmienda (2026-10-27)

El equipo no usará Docker en local, por lo que `sam local` (que lo requiere) **no** se usa para
desarrollo. `npm run dev:api` arranca un servidor HTTP de Node que traduce cada petición a un evento
de API Gateway HTTP API (payload 2.0) y llama al mismo handler de la Lambda. SAM sigue siendo la
herramienta de infraestructura para `sam build` y el despliegue. **Trade-off:** la emulación local
es menos fiel que `sam local` (sin límites de memoria/tiempo ni runtime real de Lambda); las
diferencias solo aparecen al desplegar.
