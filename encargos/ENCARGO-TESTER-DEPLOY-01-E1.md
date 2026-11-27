# Encargo — TESTER — DEPLOY-01, entrega 1 (Seguridad y base)

**De:** LEAD · **Fecha:** 2026-11-26 · **Rama:** `chore/deploy-01` (desde `main` `fabb083`)

1. **Documento de trabajo:** `contratos/CONTRATO-DEPLOY-01.md`, **versión v2** (aprobado). Léelo
   completo. Es tu única spec; no leas otros encargos.
2. **Esta entrega cubre solo las secciones A, B, C, E y F** (ver "Entregas" del contrato). D, G y H
   son de la entrega 2: no las pruebes todavía.
3. **Mapa de rutas:** `## Propiedad de rutas` de `CLAUDE.md`. Solo tocas `tests/**`,
   `tests/fixtures/**`, `jest.config.js` e `informes/TESTER-*.md`. No abras ni leas las rutas del
   DEV.
4. **Tarea:** pruebas de caja negra contra el contrato:
   - A1–A3 y A6: conectado a `comparador_test` con cada usuario, comprobar lo que puede y lo que no
     (código SQL `42501` cuando está prohibido).
   - A4–A5: adaptar las pruebas existentes de la API y de HU-01 para que cada proceso use sus
     variables (`DB_API_*`, `DB_SCRAPER_*`). La decisión 1 reemplaza la 17 de HU-01.
   - B, C, E: pruebas que leen `infra/template.yaml` (con las etiquetas de CloudFormation) e
     `infra/samconfig.toml` y comprueban los casos del contrato.
   - F: `.nvmrc`, `engines` y `.npmrc`. F3 (`npm ci` con Node 26 falla) puede quedar como
     verificación por comando en tu informe.
5. **Tu `.env` local:** necesitas `DB_API_USER`, `DB_API_PASSWORD`, `DB_SCRAPER_USER` y
   `DB_SCRAPER_PASSWORD`. Los usuarios los crea el humano en `comparador_test` cuando el DEV termine
   `setup-local.sql` (decisión 13). Mientras no existan, esas pruebas quedan `NO EJECUTADAS`.
6. **Nunca borres datos de `comparador_dev`** (decisión 29 de HU-01).
7. **Ejecución** con Node 22.23.4: `npm run test`, `npm run test:integration` y `npm run lint`
   (incluye `tests/**`).
8. **Commits** solo de tus rutas, con `[TESTER]` y sin push. **Informe** en
   `informes/TESTER-DEPLOY-01-E1.md`: tabla caso del contrato → prueba, cómo se ejecutan y qué quedó
   NO VERIFICADO o NO EJECUTADO.
9. **Si el contrato no dice algo,** no lo decidas: pregúntamelo y lo escalo al humano.
10. Al terminar, tu último mensaje debe empezar con
    `ENTREGA TESTER: <resumen> — informes/TESTER-DEPLOY-01-E1.md`.
