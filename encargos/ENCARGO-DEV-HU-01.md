# Encargo — DEV — HU-01

**De:** LEAD · **Fecha:** 2026-11-17 · **Rama:** `feature/hu-01-scraping`

1. **Documento de trabajo:** `contratos/CONTRATO-HU-01.md`, **versión v4** (Aprobado). Léelo
   completo. Es la única spec: no leas otros encargos.
2. **Mapa de rutas:** sección `## Propiedad de rutas` de `CLAUDE.md`. **Solo tocas tus rutas**
   (`scraper/**`, `shared/**`, `db/**`, `infra/**`, `package.json`, `package-lock.json`,
   `.env.example`, la configuración de lint, `informes/DEV-*.md`, …). No abras ni leas `tests/**`
   ni `jest.config.js`.
3. **Tarea:** construir HU-01 según el contrato: el orquestador y el scraper (adaptador VTEX
   `json`), el comando `npm run scrape:local`, la configuración de los comercios y de las
   búsquedas, la DLQ local y, en `infra/template.yaml`, Scheduler, cola liviana, DLQ y permisos
   (sin desplegar). Respeta los nombres que no se negocian **al pie de la letra** y las reglas de
   `CLAUDE.md`: sin valores fijos, `try/catch`, logs JSON y `async/await`.
4. **Migración de base de datos (`comercio`, `publicacion`):** debe ser no bloqueante (índices
   `CONCURRENTLY`). **Antes de ejecutar `npm run db:migrate`, pide confirmación explícita al humano
   en tu ventana** (`CLAUDE.md`).
5. **Webs reales:** no las uses en pruebas automáticas. Si haces una verificación manual contra
   Wong, Plaza Vea o Metro, respeta `robots.txt` y el límite de peticiones: las tres ya
   respondieron `429 Too Many Requests` al LEAD.
6. **Entorno:** Node 22.23.4 / npm 10. Comprueba `node -v` antes de construir o verificar: la
   terminal puede arrancar con Node 26.
7. **Commits:** solo de tus rutas y con el prefijo `[DEV]`. No hagas push ni merge.
8. **Informe:** `informes/DEV-HU-01.md` con qué se creó, los comandos que ejecutaste y su resultado
   (con la versión de Node) y lo que quedó `NO VERIFICADO`.
9. **Si el contrato no dice algo, no lo decidas:** escribe la pregunta al LEAD. Las respuestas
   llegan como una nueva versión del contrato.
10. **Aviso de vuelta:** al terminar, tu último mensaje empieza exactamente con
    `ENTREGA DEV: <resumen> — informes/DEV-HU-01.md`.
