# Encargo — DEV — Vulnerabilidades de dependencias (SEC-05)

**De:** LEAD · **Fecha:** 2026-11-24 · **Rama:** `chore/deps-seguridad` (desde `main` `091912b`)
**Origen:** `SECURITY-REPORT.md`, SEC-05. El humano decidió corregirlo el 2026-11-24.

1. **Objetivo:** que `npm audit` termine **sin vulnerabilidades altas ni moderadas**, sin romper
   nada de lo que hoy está en verde.
2. **Situación de partida** (`npm audit`, Node 22.23.4 / npm 10.9.9):
   - 19 vulnerabilidades: 2 altas (`glob`, `node-pg-migrate`) y 17 moderadas (`minimatch` y la
     cadena de Jest 30). Producción: 0.
   - Arreglos que propone npm, todos de versión mayor:
     - `node-pg-migrate` → 9.0.0, que es solo ESM; `db/migrate.js` es CommonJS (aclaración 13 del
       Sprint 0);
     - `jest` → 29.7.0, una **bajada**.
3. **Criterios:**
   - Preferir subir versiones u `overrides` de npm sobre las dependencias transitivas vulnerables
     (`glob`, `minimatch`) antes que **bajar** Jest. Si la única salida es bajar Jest, no lo hagas:
     pregúntalo.
   - Nunca `npm audit fix --force`. `package-lock.json` se regenera con npm 10.9.9 (Node 22).
   - CommonJS se mantiene en `db/`, `api/`, `shared/` y `scraper/`. Si `node-pg-migrate` 9 exige
     ESM, adáptalo sin convertir el proyecto (por ejemplo con `import()` dinámico).
   - No cambian ni el esquema ni las migraciones existentes.
4. **Rutas:** solo las tuyas (`CLAUDE.md`). Si el cambio exige tocar `jest.config.js` o `tests/**`,
   **no lo hagas**: avísame y se lo encargo al TESTER.
5. **Verificación,** con Node 22.23.4 y en un clon limpio:
   - `npm ci`, `npm run build` (`node_modules` intacto), `npm run lint`, `npm run test`;
   - `npm run test:integration` contra `comparador_test` (85 pruebas);
   - `npm run db:migrate` sobre una base que ya tiene las migraciones: debe decir "No migrations to
     run";
   - `npm audit` y `npm audit --omit=dev`.
6. **Commits** solo de tus rutas, con el prefijo `[DEV]` y sin push. **Informe** en
   `informes/DEV-DEPS-SEGURIDAD.md`: qué cambió, la salida de `npm audit` antes y después, los
   comandos con su resultado y lo que quede pendiente o NO VERIFICADO.
7. Al terminar, tu último mensaje debe empezar con
   `ENTREGA DEV: <resumen> — informes/DEV-DEPS-SEGURIDAD.md`.
