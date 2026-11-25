window.ESTADO = {
  proyecto: {
    nombre: "Comparador de precios entre comercios/supermercados",
    fecha: "2026-11-17",
    demoDay: "",
    fuentesUsadas: "repo (rama main en GitHub), GitHub PRs (gh), Jira KAN, Confluence EPPEG4, informes/VEREDICTO-SPRINT0.md",
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
    { id: "CAMBIO-01", titulo: "Comercios Wong, Plaza Vea y Metro; Perú y soles; precio regular y de oferta", decision: "ahora", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/docs/cambios/CAMBIO-01-analisis-impacto.md" }
  ],
  funcionaHoy: [
    { texto: "La web local muestra si el sistema está disponible («API: ok» / «API: no disponible»), conectada a la base de datos", evidencia: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/informes/VEREDICTO-SPRINT0.md" },
    { texto: "La pantalla de búsqueda muestra un ejemplo de resultados en soles (maquetado, sin búsqueda real todavía)", evidencia: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/informes/VEREDICTO-SPRINT0.md" },
    { texto: "El Sprint 0 (esqueleto web → API → base de datos) está cerrado y fusionado en main", evidencia: "https://github.com/pabloosoriodev/proyectogrupo4/pull/1" }
  ],
  rubrica: [
    { criterio: "1 · Especificación", autoevaluacion: null, evidencia: [
      { texto: "PRD v1.2 (reglas de negocio y registro de cambios)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/PRD.md" },
      { texto: "PRD v1.2 en Confluence", url: "https://grupo4aifirst.atlassian.net/wiki/spaces/EPPEG4/pages/2916353" },
      { texto: "Historias de usuario HU-01 a HU-04", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/main/hus" },
      { texto: "Historias en Jira (KAN-1 a KAN-4)", url: "https://grupo4aifirst.atlassian.net/issues?jql=project%20%3D%20KAN%20ORDER%20BY%20key%20ASC" },
      { texto: "CAMBIO-01: análisis de impacto", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/docs/cambios/CAMBIO-01-analisis-impacto.md" },
      { texto: "CAMBIO-01: decisiones en Confluence", url: "https://grupo4aifirst.atlassian.net/wiki/spaces/EPPEG4/pages/14254081" }
    ] },
    { criterio: "2 · Arquitectura y decisiones", autoevaluacion: null, evidencia: [
      { texto: "Technical Design Document", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/TECH-DESIGN.md" },
      { texto: "ADRs 0001–0012", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/main/adrs" },
      { texto: "Contrato de la API (openapi.yaml)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/openapi.yaml" },
      { texto: "Diagramas de arquitectura", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/main/docs/diagramas" }
    ] },
    { criterio: "3 · Construcción con agentes", autoevaluacion: null, evidencia: [
      { texto: "Plan, DoD y aclaraciones 1–26 del Sprint 0", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/SPRINT0.md" },
      { texto: "Mapa de propiedad de rutas por rol (CLAUDE.md)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/CLAUDE.md" },
      { texto: "Encargos a TESTER y DEV", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/main/encargos" },
      { texto: "PR #1 del Sprint 0 (fusionado)", url: "https://github.com/pabloosoriodev/proyectogrupo4/pull/1" }
    ] },
    { criterio: "4 · Evidencia y calidad", autoevaluacion: null, evidencia: [
      { texto: "Veredicto del Sprint 0 en verde (vuelta 2)", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/informes/VEREDICTO-SPRINT0.md" },
      { texto: "Informe del TESTER", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/informes/TESTER-SPRINT0.md" },
      { texto: "Informe del DEV", url: "https://github.com/pabloosoriodev/proyectogrupo4/blob/main/informes/DEV-SPRINT0.md" },
      { texto: "Pruebas de caja negra", url: "https://github.com/pabloosoriodev/proyectogrupo4/tree/main/tests" }
    ] }
  ],
  huecos: [
    { texto: "La Lambda desplegada en AWS sigue NO VERIFICADO (no hay despliegue ni cuenta de AWS configurada)", criterio: "C4", dueno: "", fecha: "" },
    { texto: "Riesgo aceptado por ahora: 2 vulnerabilidades altas de npm audit en glob (solo desarrollo)", criterio: "C4", dueno: "", fecha: "" },
    { texto: "Jira: el estado «Tareas por hacer» está en la categoría «En curso»; KAN-1 aparece en curso sin trabajo empezado", criterio: "C3", dueno: "", fecha: "" },
    { texto: "No existen AGENTS.md ni docs/puertas.md", criterio: "C2", dueno: "", fecha: "" },
    { texto: "Punto abierto 1 del PRD (filtro por distancia en km) sin resolver", criterio: "C1", dueno: "", fecha: "" }
  ],
  dejoFuera: []
};
