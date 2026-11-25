# CONTRATO — <ID> <Título del refactor>

**Tipo:** Refactor
**Versión:** v1
**Estado:** Pendiente de aprobación | Aprobado (<fecha>, <quién>)
**Origen:** <ítem de DEUDA.md o pedido>

---

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| DEUDA.md <ID> | Hallazgo, evidencia y riesgo |
| ADR-XXXX | ... |
| PATRONES.md §<tema> | Forma que hay que imitar |

## Alcance

| Dentro (el DEV puede reordenar) | Fuera (no se toca) |
|---|---|
| `<archivo o módulo>` | ... |

## Interfaz observable

<Ej.: API HTTP · pantalla · comando CLI · evento>

## Comportamiento que no cambia

| Caso | Entrada | Respuesta actual | Se conserva aunque sea raro | Origen |
|---|---|---|---|---|
| Camino feliz | ... | <status> + <datos> | — | `archivo:línea` |
| Error: ... | ... | <status> "<mensaje>" | Sí / No | `archivo:línea` |

> Los valores exactos los confirma el TESTER al fotografiar el sistema actual.

## Mejora medible

| Qué se mide | Hoy | Esperado | Cómo se comprueba |
|---|---|---|---|
| ... | ... | ... | <comando · búsqueda · CodeGraph · diff> |

## Pruebas existentes que siguen en verde

```text
<comandos del proyecto>
```

## Rutas de cada rol

| Rol | Rutas | Origen |
|---|---|---|
| TESTER | ... | AGENTS.md / DECISIÓN PROPUESTA |
| DEV | ... | AGENTS.md / DECISIÓN PROPUESTA |

## Decisiones propuestas (no venían en la tarea)

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | ... | ... | Pendiente / Aprobada por <quién> |

## Fuera del contrato (decide el DEV)

- Cómo se reordena por dentro, nombres de funciones y módulos nuevos, orden de los pasos
  (respetando los ADRs y el canon de `PATRONES.md`).

## Preguntas abiertas para el humano

1. ...

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | | Versión inicial | | |
