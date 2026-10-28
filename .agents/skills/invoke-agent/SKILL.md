---
name: invoke-agent
description: Busca en el workspace actual de herdr un agente ya despierto para el rol pedido (PM, BA, UX, ARCH, LEAD, TESTER, DEV); si no hay ninguno, crea un pane nuevo, levanta un agente en él y le carga ese rol. Use when the user runs /invoke-agent, asks to hand off work to another agent/role, spawn a new agent, or bring a PM/BA/UX/Architect/Lead/Tester/Developer into a herdr session.
type: skill
tags: [agentes, roles, herdr, multi-agente]
---

# Invoke Agent — Invocar un rol en herdr

## Goal

Conseguir que un agente con el rol pedido esté disponible y con el playbook cargado, dentro del
**workspace de herdr actual** — reusando uno ya despierto si existe, o creando uno nuevo si no.
Para cargar un rol en la sesión donde se está ejecutando ahora mismo, sin tocar herdr, usar
`init-agent` en su lugar.

## Roles disponibles

Los mismos que `init-agent`: `PM`, `BA`, `UX`, `ARCH`, `LEAD`, `TESTER`, `DEV`
(`references/PLAYBOOK-<ROL>.md`). Convención de nombre de agente en herdr: el rol en minúscula
(`pm`, `ba`, `ux`, `arch`, `lead`, `tester`, `dev`).

## Input

Un parámetro de rol, case-insensitive. Ejemplo: `/invoke-agent TESTER`.

Si no se especifica, o no matchea ninguno, preguntar cuál rol invocar y esperar respuesta. No
asumir un rol por defecto.

## Workflow

1. **Determinar el workspace actual.** Leer la variable de entorno `HERDR_WORKSPACE_ID` (si no
   está disponible, resolverla con `herdr pane get $HERDR_PANE_ID`).
2. **Listar los panes del workspace actual:** `herdr pane list --workspace <workspace_id>`.
3. **Listar los agentes vivos:** `herdr agent list`.
4. **Cruzar ambos listados.** Buscar un agente cuyo `pane_id` esté entre los panes del workspace
   actual y cuyo nombre coincida con la convención del rol pedido. Un agente despierto con el rol
   correcto pero en **otro** workspace no cuenta — se ignora.
   - **Si existe** en el workspace actual → es el destinatario. Ir al paso 6.
   - **Si no existe** → ir al paso 5.
5. **Crear un agente nuevo en el workspace actual:**
   1. Si el nombre del rol ya está tomado por un agente vivo en otro workspace, elegir un nombre
      libre agregando un sufijo numérico (`dev-2`, `dev-3`, ...).
   2. `herdr pane split --current --direction right --focus` → capturar el `pane_id` devuelto.
   3. `herdr agent start <nombre-resuelto> --kind <tu-agente> --pane <pane_id>`, usando el mismo
      tipo de agente con el que estás corriendo (claude, opencode, etc.) salvo que el usuario
      pida otro.
6. **Entregarle el rol y el trabajo** al agente (nuevo o reusado):
   1. `herdr agent prompt <target> "/init-agent <ROL>"` — para que se cargue el playbook a sí
      mismo en lugar de pegarlo por texto.
   2. Un segundo `herdr agent prompt <target> "<encargo concreto>"` con la tarea real: dónde está
      el insumo, contexto mínimo del proyecto y cualquier punto abierto relevante.
   3. **Si el encargo espera un aviso de vuelta** (por ejemplo, el LEAD esperando una entrega),
      incluir en el encargo **tu propio nombre de agente** y el formato del aviso:
      `herdr agent prompt <tu-nombre> "ENTREGA <ROL>: ..."`. Tu nombre se obtiene con
      `herdr agent list`, buscando el agente cuyo `pane_id` coincide con `$HERDR_PANE_ID`.
7. Confirmar al usuario, en una línea, si se reusó un agente existente o se creó uno nuevo, y su
   `pane_id`/nombre.

## Notas

- Depende de que `init-agent` esté instalado en el mismo entorno del agente invocado. Si no lo
  está, pegar el contenido completo del playbook correspondiente en el primer
  `herdr agent prompt` en su lugar.
- Nunca reusar un agente del rol pedido si está despierto en otro workspace, aunque esté idle.
- Si `herdr agent start` falla por nombre ya ocupado, diagnosticar con `herdr agent list`/
  `herdr agent get` antes de reintentar a ciegas con otro nombre.
- No usar `--wait` para esperar entregas largas: un timeout no implica que el trabajo falló. Para
  eso existe el aviso de vuelta del paso 6.3.
