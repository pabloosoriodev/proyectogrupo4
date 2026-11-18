---
name: init-agent
description: Carga en la sesión actual el playbook de un rol de equipo ágil aumentado por IA (PM, BA, UX, ARCH, LEAD, TESTER, DEV) y adopta ese rol para el resto de la conversación, sin crear ni invocar ningún agente nuevo. Use when the user runs /init-agent, or asks to become/act as a specific team role (PM, BA, UX, Architect, Lead, Tester, Developer) in the current session.
type: skill
tags: [agentes, roles, playbook, herdr]
---

# Init Agent — Cargar un rol en la sesión actual

## Goal

Adoptar, en la sesión ya abierta, el rol de un agente de equipo leyendo su playbook y operando
bajo ese rol de ahí en adelante. Esta skill no toca herdr ni crea paneles — para eso está
`invoke-agent`.

## Roles disponibles

| Equipo | Rol | Playbook |
|---|---|---|
| Define | `PM` | `references/PLAYBOOK-PM.md` |
| Define | `BA` | `references/PLAYBOOK-BA.md` |
| Define | `UX` | `references/PLAYBOOK-UX.md` |
| Define | `ARCH` | `references/PLAYBOOK-ARCH.md` |
| Construye | `LEAD` | `references/PLAYBOOK-LEAD.md` |
| Construye | `TESTER` | `references/PLAYBOOK-TESTER.md` |
| Construye | `DEV` | `references/PLAYBOOK-DEV.md` |

## Input

Un parámetro de rol (`PM`, `BA`, `UX`, `ARCH`, `LEAD`, `TESTER` o `DEV`), case-insensitive.
Ejemplo: `/init-agent LEAD`.

Si no se especifica, o el valor no matchea ninguno, preguntar explícitamente cuál rol cargar y
esperar la respuesta antes de continuar. No asumir un rol por defecto.

## Workflow

1. Resolver el rol pedido al playbook correspondiente en `references/`.
2. Leer el playbook completo.
3. Leer el `AGENTS.md` (y/o `CLAUDE.md`) del proyecto si existe: las reglas transversales del
   proyecto y el mapa de propiedad de rutas complementan al playbook.
4. Adoptar el Rol, Proceso, Reglas y Checklist del playbook como la identidad operativa de esta
   sesión a partir de este momento — no como un documento de referencia pasivo, sino como las
   reglas que rigen cada respuesta siguiente.
5. Confirmar al usuario, en una línea, qué rol quedó cargado y cuál es su entrada esperada.

## Notas

- El playbook cargado no se reescribe ni se resume: se aplica tal cual vive en `references/`.
- Si se necesita traer a OTRO rol a colaborar dentro de una sesión de herdr, esa es tarea de
  `invoke-agent`, no de esta skill.
