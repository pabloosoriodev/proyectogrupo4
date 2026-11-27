# Encargo — DEV — DEPLOY-01, entrega 1 (Seguridad y base)

**De:** LEAD · **Fecha:** 2026-11-26 · **Rama:** `chore/deploy-01` (desde `main` `fabb083`)

1. **Documento de trabajo:** `contratos/CONTRATO-DEPLOY-01.md`, **versión v2** (aprobado). Léelo
   completo. Es tu única spec; no leas otros encargos.
2. **Esta entrega cubre solo las secciones A, B, C, E y F** (ver "Entregas" del contrato). D, G y H
   son de la entrega 2: no las construyas todavía.
3. **Mapa de rutas:** `## Propiedad de rutas` de `CLAUDE.md`, más la decisión 9 del contrato
   (`.nvmrc` y `.npmrc` son tuyos). Solo tocas tus rutas. No abras ni leas `tests/**` ni
   `jest.config.js`.
4. **Tarea:**
   - A: `db/setup-local.sql` crea `comparador_api` y `comparador_scraper` con los permisos del
     contrato, con contraseñas como variables de `psql`, idempotente. Cada proceso usa sus
     variables (`DB_API_*`, `DB_SCRAPER_*`); `db:migrate` y `db:check` siguen con `DB_*`.
   - B: ninguna contraseña en `Environment` de la plantilla; `DB_CREDENTIALS_PARAMETER` por función,
     con `ssm:GetParameter` solo sobre su parámetro, y lectura del `SecureString` al arrancar.
   - C: throttling de la `HttpApi` y concurrencia reservada parametrizada, con `0` = sin reserva.
   - E: `infra/samconfig.toml` sin secretos, con los parámetros que existen hoy.
   - F: `.nvmrc`, `engines` y `.npmrc` con `engine-strict=true`.
   - Actualiza `.env.example` con las variables nuevas, sin valores secretos.
5. **Tu `.env` local:** añade `DB_API_USER`, `DB_API_PASSWORD`, `DB_SCRAPER_USER` y
   `DB_SCRAPER_PASSWORD` con contraseñas de desarrollo solo locales. `.env` nunca se sube.
6. **Base de datos:** **no** ejecutes `setup-local.sql` como `postgres`. Lo hace el humano
   (decisión 13). Cuando el script esté listo, pídele en tu ventana que lo ejecute en
   `comparador_dev` y `comparador_test`, dándole el comando exacto sin contraseñas escritas.
7. **Verificación** con Node 22.23.4 / npm 10.9.9:
   - `npm ci`, `npm run build` (`node_modules` intacto), `npm run lint`, `npm run test`;
   - `npm run test:integration` contra `comparador_test`, cuando el humano haya creado los usuarios;
   - `sam validate --lint --template-file infra/template.yaml`;
   - `npm ci` con Node 26 debe fallar (F3).
8. **Commits** solo de tus rutas, con `[DEV]` y sin push. **Informe** en
   `informes/DEV-DEPLOY-01-E1.md`: qué hiciste, comandos y resultado, y lo que quede NO VERIFICADO.
9. **Si el contrato no dice algo,** no lo decidas: pregúntamelo y lo escalo al humano.
10. Al terminar, tu último mensaje debe empezar con
    `ENTREGA DEV: <resumen> — informes/DEV-DEPLOY-01-E1.md`.
