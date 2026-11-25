# Encargo — TESTER — HU-01

**De:** LEAD · **Fecha:** 2026-11-17 · **Rama:** `feature/hu-01-scraping`

1. **Documento de trabajo:** `contratos/CONTRATO-HU-01.md`, **versión v4** (Aprobado). Léelo
   completo. Es la única spec: no leas otros encargos.
2. **Mapa de rutas:** sección `## Propiedad de rutas` de `CLAUDE.md`. **Solo tocas tus rutas:**
   `tests/**`, `tests/fixtures/**`, `jest.config.js`, `informes/TESTER-*.md`. No abras ni leas las
   rutas del DEV (`scraper/**`, `shared/**`, `db/**`, `infra/**`, …).
3. **Tarea:** pruebas de caja negra para todos los casos del contrato (A1–A4, B1–B10, C1–C7, D1–D3,
   E1–E3, F1–F5), sobre la interfaz observable del contrato:
   - el comando `npm run scrape:local`;
   - las tablas `comercio` y `publicacion` de la base local `comparador_dev`;
   - **servidores falsos de comercio** con el formato VTEX del contrato. **Nunca** las webs reales
     de Wong, Plaza Vea ni Metro;
   - el archivo de la DLQ local (`SCRAPING_DLQ_LOCAL_PATH`) y los logs JSON.

   Los casos que solo se verifican por revisión (A3, C7, E1) van al informe con la revisión sugerida.
4. **Base de datos:** las pruebas que necesitan las tablas nuevas quedan escritas y se marcan
   `NO EJECUTADAS` mientras la migración del DEV no esté aplicada. No crees tablas tú.
5. **Commits:** solo de tus rutas y con el prefijo `[TESTER]`. No hagas push ni merge.
6. **Informe:** `informes/TESTER-HU-01.md` con la tabla caso del contrato → prueba, cómo se
   ejecutan y qué quedó `NO VERIFICADO` / `NO EJECUTADO`.
7. **Si el contrato no dice algo, no lo decidas:** escribe la pregunta al LEAD. Las respuestas
   llegan como una nueva versión del contrato.
8. **Aviso de vuelta:** al terminar, tu último mensaje empieza exactamente con
   `ENTREGA TESTER: <resumen> — informes/TESTER-HU-01.md`.
