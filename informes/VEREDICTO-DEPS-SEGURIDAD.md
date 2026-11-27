# Veredicto — SEC-05 Vulnerabilidades de dependencias de desarrollo

**Fecha:** 2026-11-26 · **LEAD** · **Rama:** `chore/deps-seguridad` (base `main` `091912b`, HEAD `28fcf16`)
**Spec:** `encargos/ENCARGO-DEV-DEPS-SEGURIDAD.md` y `SECURITY-REPORT.md` SEC-05. El humano
decidió corregirlo el 2026-11-24.
**Entrega:** DEV `28fcf16` — `informes/DEV-DEPS-SEGURIDAD.md`. No hubo trabajo del TESTER: no fue
necesario tocar `jest.config.js` ni `tests/**`.

## Resultado

**🟢 Cumple (vuelta 1).** `npm audit` pasa de 19 vulnerabilidades (2 altas y 17 moderadas) a **0**,
sin bajar Jest y sin romper nada de lo que estaba en verde.

## Verificación (Node 22.23.4 / npm 10.9.9)

| Comando | Dónde | Resultado |
|---|---|---|
| `npm ci` | clon limpio | código 0 — 429 paquetes |
| `npm run build` | clon limpio | código 0 — `node_modules` sigue con 429 |
| `npm run lint` | clon limpio | código 0 |
| `npm run test` | clon limpio | código 0 — 22/22 |
| `npm audit` | clon limpio | `found 0 vulnerabilities` |
| `npm audit --omit=dev` | clon limpio | `found 0 vulnerabilities` |
| `npm ci` + `npm run test:integration` | proyecto, contra `comparador_test` | código 0 — 8 suites, **85/85** |

## Criterios del encargo

| Criterio | Resultado | Evidencia |
|---|---|---|
| Sin vulnerabilidades altas ni moderadas | 🟢 | `npm audit` → 0 |
| Subir u `overrides` antes que bajar Jest | 🟢 | `node-pg-migrate` ^7.9.1 → ^9.0.0; `overrides`: `glob` ^14.0.6, y `minimatch` ^11.0.9 solo dentro de `test-exclude`; Jest sigue en 30 |
| Sin `audit fix --force`; lock regenerado con npm 10.9.9 | 🟢 | Informe del DEV; `npm ci` del lock sin cambios en el clon |
| CommonJS en `db/` | 🟢 | `db/migrate.js` carga `node-pg-migrate` con `await import()` y sigue siendo CommonJS |
| Sin cambios de esquema ni de migraciones | 🟢 | El commit no toca `db/migrations/` |
| Solo rutas del DEV | 🟢 | `28fcf16` toca `db/migrate.js`, `package.json`, `package-lock.json` e `informes/DEV-DEPS-SEGURIDAD.md` |

## NO VERIFICADO

1. **Que `node-pg-migrate` 9 aplique una migración nueva:** no había ninguna pendiente. Según el
   informe del DEV, `db:migrate` respondió "No migrations to run!" en ambas bases. Se verificará en
   la primera migración nueva.

## Observaciones

- Los `overrides` fuerzan versiones mayores que Jest 30 no declara. Conviene quitarlos cuando Jest
  publique versiones corregidas.
