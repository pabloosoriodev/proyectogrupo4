# CONTRATO — <ID> <Título>

**Tipo:** Feature
**Versión:** v1
**Estado:** Pendiente de aprobación | Aprobado (<fecha>, <quién>)
**Origen:** <HU (enlace o ruta) o pedido>

---

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| <HU-ID> | Historia y criterios de aceptación |
| TECH-DESIGN.md §<sección> | Criterios técnicos de esta HU |
| ADR-XXXX | ... |

## Interfaz observable

<Ej.: API HTTP · pantalla · comando CLI · evento>

## Comportamiento

### <Nombre del comportamiento>

**Entrada**

```text
<MÉTODO> <ruta>?<parámetros>
```

**Casos**

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Camino feliz | ... | <status> + <datos/texto> | Gherkin esc. 1 |
| ... | ... | ... | TDD §... |
| Error: ... | ... | <status> "<mensaje exacto>" | ADR-XXXX |

## Nombres que no se negocian

| Tipo | Valor exacto |
|---|---|
| Ruta | ... |
| Campo | ... |
| Mensaje | ... |

## Rutas de cada rol

| Rol | Rutas | Origen |
|---|---|---|
| TESTER | ... | AGENTS.md / DECISIÓN PROPUESTA |
| DEV | ... | AGENTS.md / DECISIÓN PROPUESTA |

## Avisos de contexto

- Deuda en la zona del cambio (`DEUDA.md`): <ninguna / ítem + por qué conviene resolverla antes>
- Patrones aplicables (`PATRONES.md`): <canon a imitar>

## Decisiones propuestas (no venían en la tarea)

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | ... | ... | Pendiente / Aprobada por <quién> |

## Fuera del contrato (decide el DEV)

- Estructura interna, nombres de funciones y módulos, consultas a la base, patrones internos
  (respetando los ADRs aplicables).

## Preguntas abiertas para el humano

1. ...

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | | Versión inicial | | |
