# AGENTS.md

## 1. Project Overview
- **Qué es el sistema:** Una plataforma de búsqueda y comparación de precios de productos (por nombre, marca o modelo).
- **Qué problema resuelve:** Centraliza la búsqueda de productos dispersos, permitiendo al usuario encontrar la alternativa más económica rápidamente.

## 2. Repository Structure
No definido pero recomendar buenas practicas.
- **Importante:** El código de negocio y la infraestructura están separados lógicamente.
- **Qué NO debe tocar:** El agente **nunca** debe modificar, eliminar o desplegar recursos definidos en la carpeta de infraestructura de los entornos de **producción** sin validación explícita de un supervisor.

## 3. Tech Stack
No definido pero recomendar opciones gratuitas.
Recomendar tecnología y metodología para realizar el scrapeo de paginas web de proveedores de los productos.
- **Runtime:** Node.js (JavaScript).
- **Testing:** Jest (unit & integration tests).
- **Package manager:** npm / yarn.

## 4. Development Workflow
- **Cómo levantar el proyecto:** Ejecutar `npm install` y utilizar simuladores locales como `serverless-offline` o `sam local` (`npm run dev`).
- **Cómo ejecutar tests:** `npm run test` (unitarios) y `npm run test:integration`.
- **Cómo hacer lint:** `npm run lint` (ESLint + Prettier).
- **Cómo buildar:** `npm run build` (empaquetado de funciones Lambda).
- **Cómo ejecutar migraciones:** Scripts de migración a través del ORM o query builder, ejecutados mediante `npm run db:migrate`. **Regla estricta:** Ninguna migración local debe replicarse en producción sin revisión.

## 5. Architecture Rules
- **Principios que deben respetarse:** Alta disponibilidad (High Availability) y naturaleza *stateless* (sin estado local en las Lambdas).
- **Patrones obligatorios:** Se SÍ debe incluir por defecto patrones de resiliencia, específicamente *retries* y *Dead Letter Queues (DLQs)* en todas las integraciones y comunicación asíncrona.
- **Dependencias permitidas:** SÍ se debe priorizar el uso de servicios administrados listos para usar en AWS en lugar de construir soluciones desde cero (el presupuesto es amplio; la velocidad es crítica).
- **Patrones prohibidos:** Queda estrictamente prohibido el uso de variables "hardcodeadas" (NO harcodear credenciales, URLs o configuraciones). 

## 6. Coding Conventions
- **Naming:** `camelCase` para variables/funciones, `PascalCase` para clases, `UPPER_SNAKE_CASE` para constantes y variables de entorno.
- **Organización de archivos:** Un archivo por función Lambda principal. Inyección de dependencias para los servicios y repositorios.
- **Error handling:** Bloques `try/catch` obligatorios. Todos los errores no controlados deben enviarse a la DLQ correspondiente.
- **Logging:** Estructurado en JSON (ej. `console.info`, `console.error`) para correcta ingesta en AWS CloudWatch.
- **Async patterns:** Uso exclusivo de `async/await`. Prohibido el uso de callbacks anidados.

## 7. Testing
- **Qué debe testearse:** Lógica de negocio en `src/services/` (unitario) y queries complejos a PostgreSQL (integración). Validar escenarios de fallo (retries, timeouts).
- **Dónde están los tests:** Carpeta `__tests__` adyacente a los archivos o en un directorio raíz de pruebas.
- **Cómo ejecutarlos:** Vía comandos npm automatizados en el CI/CD.

## 8. Security
- **Manejo de secretos:** Todas las credenciales de BD y tokens deben inyectarse mediante variables de entorno (consumidas desde AWS Secrets Manager o Parameter Store). Prohibido harcodear.
- **Datos sensibles:** La aplicación **no** maneja datos personales ni sensibles del usuario. No se requiere enmascaramiento complejo de PII.
- **Acciones prohibidas:** Despliegues destructivos en infraestructura de producción sin aprobación.

## 9. Database
- **Schema:** Relacional (PostgreSQL).
- **Reglas para modificar DB:** **NO** se deben ejecutar migraciones de esquemas que impliquen un bloqueo temporal de las tablas (table-locking). Cualquier alteración (ej. añadir índices o columnas) debe ser no bloqueante (`CONCURRENTLY`) para mantener la alta disponibilidad requerida.

## 10. Git & PR Rules
- **Naming de branches:** `feature/xxx`, `fix/xxx`, `chore/xxx`.
- **Commits:** Conventional Commits (`feat: ...`, `fix: ...`).
- **Qué revisar antes de terminar:** El agente debe validar que el código no contenga variables hardcodeadas y que se incluyan configuraciones de DLQ/retries en nuevas integraciones.

## 11. Agent Instructions
- **Qué debe hacer antes de modificar código:** Analizar si el requerimiento puede resolverse conectando un servicio administrado de AWS existente antes de escribir código personalizado (Time-to-market medido en semanas).
- **Qué debe validar después:** Confirmar que no hay "hardcoding" y que la función está diseñada para fallar de forma segura (resiliencia).
- **Cuándo pedir confirmación:** **Siempre** que la tarea implique tocar scripts de despliegue, archivos de Terraform/Serverless Framework de producción, o migraciones de PostgreSQL.
- **Qué cosas nunca debe asumir:** Nunca debe asumir que puede bloquear la base de datos para una actualización.

## 12. Definition of Done
- Todo el código nuevo cuenta con patrones de resiliencia definidos.
- No hay ninguna credencial o variable de entorno hardcodeada.
- Las migraciones de base de datos han sido auditadas para ser no-bloqueantes.
- Tests y Lint pasan exitosamente en el entorno de CI.

## Propiedad de rutas

> Aprobado en `SPRINT0.md` (2026-10-27, humano).

| Rol | Rutas |
|---|---|
| TESTER | `tests/**` (unitarias e integración), `tests/fixtures/**`, `jest.config.js` (raíz), `informes/TESTER-*.md` |
| DEV | `api/**`, `scraper/**`, `shared/**`, `web/**`, `infra/**`, `db/**`, `package.json`, `package-lock.json`, `.eslintrc*`, `eslint.config.js`, `.prettierrc*`, `.prettierignore`, `.env.example`, `.gitignore`, `informes/DEV-*.md` |
| Solo LEAD / humano | `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.agents/**`, `skills-lock.json`, `SPRINT0.md`, `openapi.yaml`, `PRD.md`, `TECH-DESIGN.md`, `adrs/**`, `historias-usuario/**`, `docs/**`, `encargos/**`, `informes/VEREDICTO-*.md` |

Cada rol solo modifica sus rutas y hace commits únicamente de ellas, con el prefijo `[TESTER]` o
`[DEV]` en el mensaje.