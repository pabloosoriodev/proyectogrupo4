# Encargo — TESTER — Sprint 0

**De:** LEAD · **Fecha:** 2026-10-27 · **Rama:** `chore/sprint0`

1. **Documento de trabajo:** `SPRINT0.md` (estado: Aprobado 2026-10-27) y el contrato
   `openapi.yaml`. Léelos completos. No leas otros encargos.
2. **Mapa de rutas:** sección `## Propiedad de rutas` de `CLAUDE.md` (no hay `AGENTS.md`).
   **Solo tocas las rutas que ese mapa asigna al TESTER:** `tests/**`, `tests/fixtures/**`,
   `jest.config.js`, `informes/TESTER-*.md`. No abras ni leas las rutas del DEV.
3. **Tarea:** escribe pruebas de caja negra para los criterios 5, 6, 7, 8, 11, 13 y 14 de la DoD
   (sección 5 de `SPRINT0.md`) y crea `jest.config.js`. Los criterios que solo se verifican con un
   comando van en el informe con el comando sugerido. Si el runner o el código aún no existen,
   tus pruebas quedan escritas y se marcan `NO EJECUTADAS`; no instales dependencias en archivos
   que no son tuyos.
4. **Commits:** solo de tus rutas y con el prefijo `[TESTER]`:
   `git add <tus rutas>` y `git commit -m "[TESTER] ..." -- <tus rutas>`. No hagas push ni merge.
   El DEV trabaja en la misma carpeta y la misma rama: si Git avisa de `index.lock`, espera unos
   segundos y reintenta.
5. **Informe:** `informes/TESTER-SPRINT0.md` con la tabla criterio de la DoD → prueba, cómo se
   corren y qué quedó `NO VERIFICADO` / `NO EJECUTADO`.
6. **Si `SPRINT0.md` no dice algo, no lo decidas:** escribe la pregunta al humano para que se la
   lleve al LEAD.
7. **Aviso de vuelta (sin herdr):** al terminar, tu último mensaje debe empezar exactamente con
   `ENTREGA TESTER: <resumen> — informes/TESTER-SPRINT0.md` para que el humano se lo pase al LEAD.
