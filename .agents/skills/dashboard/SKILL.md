---
name: dashboard
description: Genera o actualiza el dashboard de estado del proyecto (dashboard/index.html + dashboard/estado.js) leyendo el repo, los PRs y Jira. Úsala cuando pidan el estado del proyecto, el avance real, un dashboard, o escriban /dashboard.
---

# /dashboard — Estado del proyecto

Produces dos archivos en `dashboard/` del repo:
- `index.html`: la plantilla fija (copiada de `plantilla.html` de esta skill). Solo se copia si no existe; si ya existe NO se sobrescribe (el equipo pudo personalizarla).
- `estado.js`: los datos. Es lo único que regeneras cada vez.

Se abre con doble clic en `dashboard/index.html`. No requiere servidor.

## Reglas (no negociables)
1. No inventes. Cada dato sale de una fuente que puedas abrir (archivo del repo, PR, issue de Jira). Si no puedes comprobarlo, no lo escribas: déjalo vacío o sin `url`; el tablero lo mostrará como NO VERIFICADO.
   Solo cuenta lo que puedas abrir AHORA. No uses tu memoria de sesiones anteriores ni notas previas como fuente; si algo solo lo recuerdas, déjalo vacío y dilo.
2. No escribas porcentajes ni «avance». La plantilla los calcula desde `hus`.
3. No pongas `autoevaluacion` en la rúbrica: la decide una persona del equipo. Déjala en `null`.
4. No cambies código del proyecto ni escribas en Jira o Confluence. Solo lees y generas `dashboard/`.
5. Una HU es `"Hecho"` solo si cumple la Regla de estados del proyecto (AGENTS.md); si no existe, usa: PR fusionado + veredicto verde + sin NO VERIFICADO abierto. Si Jira dice Hecho y el repo no lo prueba, escribe el estado que dice Jira y deja el PR/veredicto como realmente están: la plantilla marcará la contradicción.
6. Un PR en borrador es `"borrador"` y no cuenta como En curso.

## Pasos
1. **Lee las fuentes** (las que existan; di cuáles usaste en `proyecto.fuentesUsadas`):
   - `docs/hus/*.md` o equivalentes: lista de HUs y sus criterios.
   - Git: `git log`, ramas, y si `gh` está disponible, `gh pr list --state all --json number,title,state,isDraft,mergedAt,headRefName,url`.
   - Veredictos (`VEREDICTO-*.md` o similar): cuenta los ítems NO VERIFICADO.
   - Jira (MCP de Atlassian, si está conectado): estado, vínculos «bloqueada por» y Errores de cada HU. Si no hay Jira, usa la Regla de estados de AGENTS.md o deja `claveJira` vacía.
   - Pedidos de cambio (`CAMBIO-*.md`) y su decisión, si existen.
   - PRD, TECH-DESIGN, ADRs, `docs/puertas.md`, página de estado de Confluence: son evidencia de la rúbrica; enlázalos solo si existen de verdad.
2. **Escribe `dashboard/estado.js`** con exactamente esta forma (un solo objeto, sin nada más):

```js
window.ESTADO = {
  proyecto: {
    nombre: "Nombre del proyecto",
    fecha: "2026-11-17",            // hoy
    demoDay: "2026-12-10",
    fuentesUsadas: "repo, GitHub PRs, Jira RCAN",
    equipo: [ { nombre: "Ana", presenta: true } ]   // pregunta al usuario; si no sabes, []
  },
  hus: [
    {
      id: "HU-01", titulo: "…",
      estado: "Por hacer|En curso|En revisión|Hecho|Bloqueado",
      claveJira: "RCAN-2", urlJira: "https://…/browse/RCAN-2",
      pr: { numero: 1, url: "https://…/pull/1", estado: "fusionado|abierto|borrador|ninguno" },
      veredicto: "verde|rojo|parcial|ninguno",
      noVerificado: 0,
      bloqueadaPor: ["HU-03"]       // opcional
    }
  ],
  errores: [ { clave: "RCAN-8", titulo: "…", estado: "Por hacer|En curso|Listo", url: "https://…" } ],
  cambios: [ { id: "CAMBIO-01", titulo: "…", decision: "ahora|próximo sprint|no entra", url: "https://…" } ],
  funcionaHoy: [ { texto: "Qué se puede hacer hoy, en lenguaje de negocio", evidencia: "https://… (PR, commit, video, archivo)" } ],
  rubrica: [
    { criterio: "1 · Especificación",            autoevaluacion: null, evidencia: [ { texto: "PRD v2", url: "https://…" } ] },
    { criterio: "2 · Arquitectura y decisiones", autoevaluacion: null, evidencia: [] },
    { criterio: "3 · Construcción con agentes",  autoevaluacion: null, evidencia: [] },
    { criterio: "4 · Evidencia y calidad",       autoevaluacion: null, evidencia: [] }
  ],
  huecos: [ { texto: "…", criterio: "C4", dueno: "", fecha: "" } ],   // dueño y fecha los pone una persona
  dejoFuera: []                                                      // lo decide una persona
};
```

   Las URLs de archivos del repo van como enlace completo a la rama (por ejemplo `https://github.com/ORG/REPO/blob/main/docs/puertas.md`). Sin rama real no hay enlace.
3. **Copia la plantilla** si `dashboard/index.html` no existe: `cp .claude/skills/dashboard/plantilla.html dashboard/index.html`.
4. **Informa al usuario** (máximo 12 líneas): cuántas HUs leíste, qué fuentes usaste y cuáles no estaban disponibles, qué quedó como NO VERIFICADO y por qué, qué debe completar una persona (equipo, autoevaluación, huecos, lo que dejan fuera). Dile que abra `dashboard/index.html` con doble clic.
5. **No hagas commit.** Pregunta si quieren commitearlo.

## Qué mirar si algo falla
- Página en blanco: `estado.js` debe estar junto a `index.html` y empezar con `window.ESTADO =`.
- Si no hay `gh` ni Jira: arma las HUs desde `docs/hus` y marca PR `ninguno`; lo que no pudiste comprobar queda sin enlace.
