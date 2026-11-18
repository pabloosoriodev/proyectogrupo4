# SPRINT 0 — <Nombre del proyecto>

**Estado:** Pendiente de aprobación | Aprobado (<fecha>, <quién>)
**Fuentes:** `TECH-DESIGN.md`, `adrs/`

---

## 1. ADRs que aplican (transversales)

| ADR | Decisión | Por qué aplica ahora |
|---|---|---|
| ADR-XXXX | ... | ... |

## 2. ADRs que NO aplican todavía (de historia)

| ADR | Decisión | Aplica cuando llegue |
|---|---|---|
| ADR-XXXX | ... | HU-XX |

## 3. A discutir (mixtos)

| ADR | Qué parte aplica ahora | Qué parte espera a su HU | Pregunta |
|---|---|---|---|

## 4. Propiedad de rutas

| Rol | Rutas |
|---|---|
| TESTER | ... |
| DEV | ... |
| Solo LEAD / humano | `AGENTS.md`, `CLAUDE.md`, skills, configuración de agentes, `SPRINT0.md`, `contratos/` |

> Esta tabla también se copia en `AGENTS.md` → `## Propiedad de rutas`.

## 5. Definition of Done — esqueleto

| # | Criterio | Cómo se verifica |
|---|---|---|
| 1 | La aplicación arranca en local | comando: `...` |
| 2 | Se conecta a <dependencia> | prueba |
| 3 | Responde en `<ruta/comando de salud exacto>` | prueba |
| 4 | El runner de pruebas se ejecuta | comando: `...` |
| 5 | Respeta los ADRs transversales | revisión: archivo:línea |
| 6 | Cero lógica de negocio | revisión humana |

## 6. Plan

### DEV crea
- ...

### TESTER crea
- Pruebas para los criterios verificables por prueba de la sección 5.

### NO se crea
- Nada que pertenezca a los ADRs de la sección 2.
- Ninguna funcionalidad de las HUs.

## 7. Preguntas abiertas para el humano

1. ...

## 8. Cambios durante el ciclo

| Fecha | Cambio | Aprobado por |
|---|---|---|
