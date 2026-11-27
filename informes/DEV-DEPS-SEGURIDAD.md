# Informe DEV — Vulnerabilidades de dependencias (SEC-05)

**Rama:** `chore/deps-seguridad` (desde `0f4810f`) · **Encargo:** `encargos/ENCARGO-DEV-DEPS-SEGURIDAD.md`
· **Origen:** `SECURITY-REPORT.md`, SEC-05 · Sin push.
**Entorno:** Node **22.23.4** / npm **10.9.9** (tomado de `nvm\installs\v22.23.4` en el PATH de cada
comando).

## Resultado

`npm audit`: de **19 vulnerabilidades (2 altas, 17 moderadas)** a **0**. Producción sigue en 0. Sin
bajar Jest, sin `npm audit fix --force` y sin tocar `jest.config.js` ni `tests/**`.

## Qué cambió

| Archivo | Cambio |
|---|---|
| `package.json` | `node-pg-migrate` `^7.9.1` → `^9.0.0`. Nuevo bloque `overrides`: `glob` → `^14.0.6` y, solo dentro de `test-exclude`, `minimatch` → `^11.0.9` |
| `package-lock.json` | Regenerado con npm 10.9.9: 12 paquetes añadidos, 28 eliminados, 6 cambiados |
| `db/migrate.js` | `node-pg-migrate` 9 es solo ESM y exporta `runner` en lugar de `default`: se carga con `await import('node-pg-migrate')` dentro de `main()`. El script sigue siendo CommonJS (aclaración 13); mismas opciones de ejecución |

Sin cambios en el esquema ni en las migraciones existentes.

**Por qué así:**
- Las versiones corregidas son `glob` ≥ 14.0.2 (GHSA-5j98-mcp5-4vw2, GHSA-3g3m-2fjr-6pw4) y
  `minimatch` ≥ 11.0.1 (GHSA-g3hv-75wg-m249). Ambas siguen publicando una versión `require`
  (CommonJS), así que Jest 30 las puede usar sin bajar de versión.
- `glob` 14 depende de `minimatch` ^11.0.5, ya corregida. `test-exclude` (cadena de Jest) pide
  `minimatch` ^10 directamente: por eso el `override` anidado.
- La `minimatch` 3.1.5 de ESLint no está en el rango vulnerable (7.0.0–11.0.0) y su API es
  distinta: no se fuerza.
- `node-pg-migrate` 9 pide `glob` ~13: queda en 14.0.6 por el `override`.

Árbol resultante (`npm ls glob minimatch --all`): todas las copias de `glob` en 14.0.6; `minimatch`
11.0.9 bajo `glob` y `test-exclude`; 3.1.5 bajo ESLint.

## `npm audit` antes y después

| | Antes (`0f4810f`) | Después |
|---|---|---|
| `npm audit` | `19 vulnerabilities (17 moderate, 2 high)`: `glob` 9.0.0–14.0.1, `minimatch` 7.0.0–11.0.0, `node-pg-migrate`, `test-exclude` y la cadena de Jest 30 | `found 0 vulnerabilities` |
| `npm audit --omit=dev` | `found 0 vulnerabilities` | `found 0 vulnerabilities` |

## Verificación en clon limpio

`git clone` de `chore/deps-seguridad` en el scratchpad (fuera de OneDrive), con mis tres archivos
cambiados copiados encima y el `.env` local (ignorado por git). Node 22.23.4 / npm 10.9.9.

| Comando | Resultado |
|---|---|
| `npm ci` | 0; `found 0 vulnerabilities`; `node_modules` 427 entradas |
| `npm run build` | 0; `build:api`, `build:scraper`, `sam build` (`Build Succeeded`) y Vite; `node_modules` 427 después (intacto) |
| `npm run lint` | 0 |
| `npm run test` | 0; 4 suites, **22 pruebas** pasadas |
| `npm run test:integration` (contra `comparador_test`) | 0; 8 suites, **85 pruebas** pasadas |
| `npm run db:migrate` sobre `comparador_dev` (confirmado por el humano) | 0; `No migrations to run!` |
| `DB_NAME=comparador_test npm run db:migrate` (confirmado por el humano) | 0; `No migrations to run!` |
| `npm audit` / `npm audit --omit=dev` | 0 / 0 vulnerabilidades |

Las pruebas del TESTER se ejecutaron porque lo pide el encargo; no las leí.

## Pendiente o NO VERIFICADO

- **Aplicar una migración nueva con `node-pg-migrate` 9:** solo se comprobó sobre bases ya migradas
  (no había migraciones pendientes). La carga de los archivos de migración CommonJS por la v9 queda
  sin ejercitar hasta la próxima migración.
- Los `overrides` fuerzan versiones mayores de `glob` y `minimatch` que Jest 30 no declara. Las 107
  pruebas pasan, pero conviene quitar los `overrides` cuando Jest y `test-exclude` publiquen
  versiones con estas dependencias corregidas (revisar con `npm audit` en cada actualización).
