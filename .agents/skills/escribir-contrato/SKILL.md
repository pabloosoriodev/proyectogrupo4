---
name: escribir-contrato
description: Escribe el contrato observable de una unidad de trabajo para que el TESTER y el DEV puedan trabajar sin verse - para una feature (HU o pedido) define entrada, salida por caso, errores y nombres que no se negocian; para un refactor (ítem de deuda) define el comportamiento actual que no puede cambiar y la mejora medible. Arma el paquete de contexto, anota el origen de cada línea, propone las rutas de cada rol si el proyecto no las define, lista las decisiones abiertas y se detiene para aprobación humana. Use when the LEAD takes a user story, a feature request or a technical-debt item to build or refactor, or when asked to write, draft, or version a contract/spec.
type: skill
tags: [lead, contrato, spec, hu, refactor, caja-negra]
---

# Escribir contrato (v3)

## Goal

Producir el **único documento que leen el TESTER y el DEV**: lo que la unidad de trabajo tiene
que cumplir **vista desde afuera**, con la precisión suficiente para que dos agentes que no se
ven lleguen al mismo resultado. El contrato fija lo observable; lo interno queda libre para el DEV.

Hay dos tipos de contrato:

| Tipo | Qué fija |
|---|---|
| **Feature** | El comportamiento **nuevo** que hay que construir |
| **Refactor** | El comportamiento **actual** que no puede cambiar + la **mejora medible** |

**Esta skill no construye nada.** Escribe, pregunta y se detiene.

> **Novedades v3:** tipo refactor; contexto de proyectos existentes (`docs/contexto/`); rutas de
> cada rol propuestas en el contrato cuando `AGENTS.md` no las define.

## Input

- **La tarea:** una HU (desde Jira vía MCP o el archivo/enlace indicado), un pedido de feature, o
  un ítem de deuda (`docs/contexto/DEUDA.md`). Si una HU tiene puntos abiertos sin resolver,
  **detenerse**: se escalan antes de escribir el contrato.
- **El contexto del proyecto**, empezando por `AGENTS.md` como índice:
  - proyecto nuevo: `TECH-DESIGN.md` (la sección de esta HU) + `adrs/`;
  - proyecto existente: `docs/contexto/` (`ARQUITECTURA.md`, `PATRONES.md`, `DEUDA.md`…) + `adrs/`.
  Solo los ADRs y documentos que tocan esta unidad de trabajo.
- Contratos anteriores en `contratos/`, para no contradecir nombres ya fijados.

## Workflow — común a los dos tipos

1. **Armar el paquete de contexto:** la tarea + los ADRs y documentos que aplican. Nada más.
   Listar qué entró y por qué.

2. **Identificar la interfaz observable** por la que se usa o se ve la funcionalidad (una ruta
   HTTP, una pantalla, un comando, un evento…). El contrato se escribe sobre esa interfaz.

3. **Fijar las rutas de cada rol.** Si `AGENTS.md` ya dice qué rutas son del TESTER y cuáles del
   DEV, citarlo. Si no lo dice, **proponerlas** (por ejemplo: pruebas en la carpeta de pruebas que
   usa el proyecto; código en la zona del cambio) y marcarlas como `DECISIÓN PROPUESTA`.

4. **Revisar `PATRONES.md`** si existe: si la tarea toca un tema sin canon o una pregunta abierta,
   no se elige: va a "Preguntas abiertas para el humano".

5. Seguir con el workflow del tipo (feature o refactor).

## Workflow — Feature

6. **Por cada escenario Gherkin y cada criterio de aceptación**, derivar los casos:
   - **entrada** exacta (ruta, parámetros, formato);
   - **salida** exacta por caso (status, datos, texto visible, efecto persistente);
   - **errores** (qué entrada inválida produce qué respuesta).

7. **Fijar los nombres que no se negocian:** rutas, campos, mensajes visibles, formatos. Son los
   que el TESTER verificará textualmente.

8. **Si la feature pasa por una zona de `DEUDA.md`**, anotarlo en el contrato como aviso para el
   humano (puede convenir resolver esa deuda antes, como un refactor aparte).

## Workflow — Refactor

6. **Delimitar el alcance:** qué archivos o módulos reordena el DEV, según la evidencia del ítem
   de deuda. Lo que queda fuera del alcance no se toca.

7. **Listar el comportamiento que no cambia:** los casos observables de la zona afectada (camino
   feliz, entradas inválidas, recursos inexistentes, errores). **Incluir lo raro**: si hoy el
   sistema responde algo que parece incorrecto, se lista tal cual y se marca como "se conserva".
   Los valores exactos los confirma el TESTER al fotografiar el sistema; si no coinciden con el
   contrato, se corrige el contrato.

8. **Definir la mejora medible:** qué se mide, cuánto vale hoy (con evidencia) y qué valor se
   espera después. Ejemplos:

   | Tipo de deuda | Qué se mide |
   |---|---|
   | Código duplicado | Cuántas copias hay |
   | Archivo o función gigante | Líneas del archivo o de la función |
   | Rendimiento | Tiempo o memoria, con el mismo comando antes y después |
   | Dependencia fija | Cuántos archivos importan el módulo directo |

   Indicar **cómo se comprueba** (comando, búsqueda, CodeGraph, diff).

9. **Pruebas que ya tenía el proyecto:** listar los comandos que tienen que seguir en verde.

## Cierre — común a los dos tipos

10. **Anotar el origen de cada línea** (escenario Gherkin, criterio, ADR, ítem de deuda,
    `archivo:línea`). Una línea sin origen es una **decisión nueva**: se marca
    `DECISIÓN PROPUESTA` y entra en la lista de preguntas. Nunca se presenta como si viniera de la
    tarea.

11. **Declarar qué queda fuera del contrato** (todo lo interno) → libertad del DEV.

12. **Guardar** `contratos/CONTRATO-<ID>.md` con la plantilla del tipo, versión `v1`:
    - feature: `assets/contrato-template.md`;
    - refactor: `assets/contrato-refactor-template.md`.

13. **Detenerse.** Presentar el contrato y las preguntas al humano. No invocar a nadie.

## Versionado

Cuando durante el ciclo aparece un hueco (lo reporta el TESTER, el DEV o el veredicto):

1. se formula la pregunta al humano;
2. con la respuesta, se edita el contrato, se sube la versión (`v2`, `v3`…) y se agrega una fila
   al changelog (qué cambió, por qué, quién lo aprobó);
3. el LEAD avisa a TESTER y DEV de la nueva versión.

## Constraints

- No se completa con suposiciones lo que la tarea no dice: se pregunta.
- No se describe implementación interna en el contrato.
- En un refactor, no se "arregla" ningún comportamiento observable: se conserva.
- No se contradice un nombre fijado en un contrato anterior sin decirlo explícitamente.
- No se publica nada.
