window.ESTADO = {
  proyecto: {
    nombre: "Comparador de precios entre comercios/supermercados",
    fecha: "2026-11-17",
    demoDay: "",
    fuentesUsadas: "repo (rama chore/sprint0 en GitHub), GitHub API pública (PRs), Jira KAN, Confluence EPPEG4",
    equipo: []
  },
  hus: [
    {
      id: "HU-01", titulo: "Actualizar precios diariamente mediante scraping",
      estado: "Por hacer",
      claveJira: "KAN-1", urlJira: "https://grupo4aifirst.atlassian.net/browse/KAN-1",
      pr: { numero: null, url: "", estado: "ninguno" },
      veredicto: "ninguno",
      noVerificado: 0
    },
    {
      id: "HU-02", titulo: "Reconocer el mismo producto por nombre similar",
      estado: "Por hacer",
      claveJira: "KAN-2", urlJira: "https://grupo4aifirst.atlassian.net/browse/KAN-2",
      pr: { numero: null, url: "", estado: "ninguno" },
      veredicto: "ninguno",
      noVerificado: 0,
      bloqueadaPor: ["HU-01"]
    },
    {
      id: "HU-03", titulo: "Buscar productos",
      estado: "Por hacer",
      claveJira: "KAN-3", urlJira: "https://grupo4aifirst.atlassian.net/browse/KAN-3",
      pr: { numero: null, url: "", estado: "ninguno" },
      veredicto: "ninguno",
      noVerificado: 0,
      bloqueadaPor: ["HU-01"]
    },
    {
      id: "HU-04", titulo: "Comparar precios de un producto entre comercios",
      estado: "Por hacer",
      claveJira: "KAN-4", urlJira: "https://grupo4aifirst.atlassian.net/browse/KAN-4",
      pr: { numero: null, url: "", estado: "ninguno" },
      veredicto: "ninguno",
      noVerificado: 0,
      bloqueadaPor: ["HU-02", "HU-03"]
    }
  ],
  errores: [],
  cambios: [
    { id: "CAMBIO-01", titulo: "Comercios Wong, Plaza Vea y Metro; Perú y soles; precio regular y de oferta", decision: "ahora", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/docs/cambios/CAMBIO-01-analisis-impacto.md" }
  ],
  funcionaHoy: [],
  rubrica: [
    { criterio: "1 · Especificación", autoevaluacion: null, evidencia: [
      { texto: "PRD v1.2 (reglas de negocio y registro de cambios)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/PRD.md" },
      { texto: "PRD v1.2 en Confluence", url: "https://grupo4aifirst.atlassian.net/wiki/spaces/EPPEG4/pages/2916353" },
      { texto: "Historias de usuario HU-01 a HU-04", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/chore/sprint0/hus" },
      { texto: "Historias en Jira (KAN-1 a KAN-4)", url: "https://grupo4aifirst.atlassian.net/issues?jql=project%20%3D%20KAN%20ORDER%20BY%20key%20ASC" },
      { texto: "CAMBIO-01: análisis de impacto", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/docs/cambios/CAMBIO-01-analisis-impacto.md" },
      { texto: "CAMBIO-01: decisiones en Confluence", url: "https://grupo4aifirst.atlassian.net/wiki/spaces/EPPEG4/pages/14254081" }
    ] },
    { criterio: "2 · Arquitectura y decisiones", autoevaluacion: null, evidencia: [
      { texto: "Technical Design Document", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/TECH-DESIGN.md" },
      { texto: "ADRs 0001–0012 (0004 y 0007 modificados por CAMBIO-01)", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/chore/sprint0/adrs" },
      { texto: "Contrato de la API (openapi.yaml)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/openapi.yaml" },
      { texto: "Diagramas de arquitectura", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/chore/sprint0/docs/diagramas" }
    ] },
    { criterio: "3 · Construcción con agentes", autoevaluacion: null, evidencia: [
      { texto: "Plan, DoD y aclaraciones 1–25 del Sprint 0", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/SPRINT0.md" },
      { texto: "Mapa de propiedad de rutas por rol (CLAUDE.md)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/CLAUDE.md" },
      { texto: "Encargos a TESTER y DEV", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/chore/sprint0/encargos" },
      { texto: "Commit [DEV] 4b1e15f (esqueleto, en curso)", url: "https://github.com/pabloosoriodev/proyectogrupo4/commit/4b1e15f" },
      { texto: "Commit [TESTER] aa102fd (entrega 3)", url: "https://github.com/pabloosoriodev/proyectogrupo4/commit/aa102fd" }
    ] },
    { criterio: "4 · Evidencia y calidad", autoevaluacion: null, evidencia: [
      { texto: "Informe del TESTER, entrega 3 (resultados de test, test:integration y lint)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/informes/TESTER-SPRINT0.md" },
      { texto: "Informe del DEV (en curso)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/chore/sprint0/informes/DEV-SPRINT0.md" },
      { texto: "Pruebas de caja negra", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/chore/sprint0/tests" }
    ] }
  ],
  huecos: [
    { texto: "Sin veredicto del Sprint 0 (no existe informes/VEREDICTO-SPRINT0.md)", criterio: "C4", dueno: "", fecha: "" },
    { texto: "Falta la ENTREGA DEV: el informe del DEV dice «en curso» (faltan migración, API 200/503, web, criterio 12)", criterio: "C3", dueno: "", fecha: "" },
    { texto: "No hay ningún PR en GitHub", criterio: "C3", dueno: "", fecha: "" },
    { texto: "El informe del TESTER deja 5 puntos NO VERIFICADO (entre ellos, la web real contra la API real en un navegador)", criterio: "C4", dueno: "", fecha: "" },
    { texto: "No existen AGENTS.md ni docs/puertas.md", criterio: "C2", dueno: "", fecha: "" },
    { texto: "Punto abierto 1 del PRD (filtro por distancia en km) sin resolver", criterio: "C1", dueno: "", fecha: "" }
  ],
  dejoFuera: []
};
