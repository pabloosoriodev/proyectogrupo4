# ADR 0012: Monorepo con npm workspaces

## Estado

Aceptado

## Contexto

El sistema tiene cuatro piezas de código (web, API, scraper e infraestructura, ADR 0001) que
comparten lógica: la normalización de nombres y unidades se usa al agrupar (ADR 0005) y al buscar
(ADR 0006), y el contrato `openapi.yaml` (ADR 0007) une API y web. `CLAUDE.md` pide separar
lógicamente el código de negocio de la infraestructura, y el flujo de construcción asigna rutas a
cada rol (TESTER, DEV), por lo que la estructura de carpetas debe permitir un mapa de propiedad
claro. El proyecto es nuevo.

## Decisión

Un **único repositorio** con **npm workspaces**:

```
proyectogrupo4/
├─ openapi.yaml            contrato de la API (ADR 0007)
├─ infra/template.yaml     infraestructura SAM (ADR 0009)
├─ shared/                 normalización, unidades, tipos comunes
├─ api/                    Lambda de la API
├─ scraper/                orquestador + adaptadores por comercio
├─ web/                    React + Vite (ADR 0008)
├─ db/migrations/          migraciones no bloqueantes
└─ PRD.md, TECH-DESIGN.md, adrs/, historias-usuario/   documentación
```

## Alternativas consideradas

- **Un repositorio por componente** — despliegues y permisos totalmente independientes. No se
  eligió porque la normalización compartida tendría que publicarse como paquete versionado y un
  cambio de contrato exigiría PRs coordinados en varios repos.

## Consecuencias

- Un cambio de contrato, API y web viaja en un solo PR y se revisa junto; `shared/` se reutiliza
  sin publicar paquetes.
- La separación por carpetas facilita el mapa de propiedad de rutas por rol en `AGENTS.md`.
- La infraestructura queda separada lógicamente del código de negocio en `infra/`, como pide
  `CLAUDE.md`.
- **Trade-off:** el CI debe detectar qué workspace cambió para no ejecutar todos los tests y
  despliegues en cada PR; sin eso, los tiempos de CI crecen con el proyecto.
- **Trade-off:** todos los colaboradores tienen acceso a todo el código; los límites entre roles
  dependen del mapa de propiedad y de la revisión, no de permisos del repositorio.
