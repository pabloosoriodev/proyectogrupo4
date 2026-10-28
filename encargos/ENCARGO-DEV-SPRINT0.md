# Encargo — DEV — Sprint 0

**De:** LEAD · **Fecha:** 2026-10-27 · **Rama:** `chore/sprint0`

1. **Documento de trabajo:** `SPRINT0.md` (estado: Aprobado 2026-10-27) y el contrato
   `openapi.yaml`. Léelos completos. No leas otros encargos.
2. **Mapa de rutas:** sección `## Propiedad de rutas` de `CLAUDE.md` (no hay `AGENTS.md`).
   **Solo tocas las rutas que ese mapa asigna al DEV:** `api/**`, `scraper/**`, `shared/**`,
   `web/**`, `infra/**`, `db/**`, `package.json`, `package-lock.json`, `.eslintrc*`,
   `.prettierrc*`, `.env.example`, `.gitignore`, `informes/DEV-*.md`. No abras ni leas las rutas
   del TESTER (`tests/**`, `jest.config.js`).
3. **Tarea:** construye el esqueleto descrito en la sección 6 "DEV crea" de `SPRINT0.md`, cumpliendo
   la Definition of Done (sección 5) y las reglas de `CLAUDE.md` (sin valores fijos en el código,
   `try/catch`, logs JSON, `async/await`). Cero lógica de negocio. Instala `jest` como dependencia
   de desarrollo, pero no crees `jest.config.js` (es del TESTER). Respeta `openapi.yaml` al pie de
   la letra.
4. **Entorno:** Node.js 22, PostgreSQL 16 local (servicio Windows `postgresql-x64-16`, puerto 5432),
   sin Docker. Las credenciales locales van en un `.env` que **no** se sube (`.gitignore`); en el
   repositorio solo va `.env.example`.
5. **Commits:** solo de tus rutas y con el prefijo `[DEV]`:
   `git add <tus rutas>` y `git commit -m "[DEV] ..." -- <tus rutas>`. No hagas push ni merge.
   El TESTER trabaja en la misma carpeta y la misma rama: si Git avisa de `index.lock`, espera unos
   segundos y reintenta.
6. **Informe:** `informes/DEV-SPRINT0.md` con qué se creó, los comandos de la DoD que ejecutaste y
   su resultado, y lo que quedó `NO VERIFICADO`.
7. **Si `SPRINT0.md` no dice algo, no lo decidas:** escribe la pregunta al humano para que se la
   lleve al LEAD.
8. **Aviso de vuelta (sin herdr):** al terminar, tu último mensaje debe empezar exactamente con
   `ENTREGA DEV: <resumen> — informes/DEV-SPRINT0.md` para que el humano se lo pase al LEAD.
