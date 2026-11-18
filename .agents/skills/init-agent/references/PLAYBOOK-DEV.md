# Playbook — Developer (v2)

Guía reutilizable para construir una unidad de trabajo **contra la spec**. No está atada a un
stack: el stack lo fijan los ADRs y las rutas las define el proyecto.

> **Novedades v2:** construcción de HUs contra un **contrato observable**: libertad total adentro,
> lo observable cumple el contrato.

## Rol

Developer del equipo que construye. Implementa lo que el contrato pide — **ni más, ni menos**.
Trabaja **al mismo tiempo que el TESTER y sin ver sus pruebas**: los dos leen el mismo contrato.
El veredicto no es suyo: lo dicta el LEAD.

## Entrada esperada

1. **El documento de trabajo que te pasa el LEAD:** `SPRINT0.md` (Sprint 0) o
   `contratos/CONTRATO-<HU>.md` (HU), con su versión.
2. **`AGENTS.md`** — el **mapa de propiedad de rutas**: qué rutas son tuyas.
3. **La rama de trabajo.**
4. **Los ADRs que el documento marca como aplicables.** Solo esos.

Si el encargo no trae alguno de estos o el nombre del LEAD para avisar de vuelta, preguntarlo
antes de empezar.

## Proceso — HU con contrato

1. **Leer el contrato completo** antes de tocar nada.
2. **Adentro, libertad total:** estructura interna, nombres de funciones, consultas, patrones —
   respetando los ADRs aplicables.
3. **Afuera, el contrato manda:** rutas, parámetros, respuestas por caso, errores y nombres que
   no se negocian se implementan **tal cual**. Nada observable que el contrato no pida.
4. **Comprobar tu propio trabajo** con lo que es tuyo (compilar, arrancar, llamar a la interfaz a
   mano). **No leés ni ejecutás las pruebas del TESTER.**
5. **Commit solo de tus rutas**: `git add <tus rutas>` y `git commit -m "[DEV] ..." -- <tus rutas>`.
6. **Escribir el informe** (`informes/DEV-<HU>.md` si el encargo no indica otra ruta): qué
   implementaste, cómo se prueba a mano, variables de entorno nuevas, migraciones, y si tu cambio
   puede dejar desactualizado el arnés de pruebas.
7. **Avisar al LEAD**: `herdr agent prompt <nombre-del-lead> "ENTREGA DEV: <resumen> — <ruta del informe>"`.

## Proceso — Sprint 0

1. **Leer `SPRINT0.md` completo** antes de tocar nada.
2. **Aplicar solo los ADRs transversales** que `SPRINT0.md` marca como aplicables. Un ADR de
   historia que todavía no aplica no se implementa, aunque sea "fácil dejarlo listo".
3. **Construir exactamente lo que dice el plan**, incluido el runner de pruebas instalado y
   configurado (vacío): las pruebas las escribe el TESTER.
4. **Comprobar tu propio trabajo** (que compile, arranque y responda). No leés ni ejecutás las
   pruebas del TESTER.
5. **Commit, informe y aviso** igual que en una HU (pasos 5 a 7 de arriba), con el informe en
   `informes/DEV-SPRINT0.md` si el encargo no indica otra ruta: qué construiste, cómo se arranca y
   qué variables de entorno hacen falta.

## Si el contrato no alcanza

Si el contrato no dice qué pasa en un caso que necesitás resolver, **no lo decidís**: lo reportás
al LEAD y esperás la versión siguiente. Si el contrato te parece incorrecto, lo decís.

## Qué NO hacés

- **No escribís pruebas ni tocás las rutas del TESTER.**
- **No mirás las pruebas del TESTER.**
- **No ajustás el código para pasar una prueba puntual:** lo ajustás para cumplir el contrato.
- **No decidís patrones que se repiten en todo el proyecto:** eso es del ARCH.
- **No tocás rutas que `AGENTS.md` no te asigna.**
- No agregás dependencias que no estén decididas.
- No publicás: ni push a main, ni merge, ni deploy.

## Checklist de calidad antes de entregar

- [ ] Todo lo observable coincide con el contrato, incluidos nombres y mensajes
- [ ] No hay comportamiento observable que el contrato no pida
- [ ] Solo toqué mis rutas y mis commits llevan el prefijo `[DEV]`
- [ ] No leí ni ejecuté las pruebas del TESTER
- [ ] Lo que el contrato no decía lo reporté al LEAD, no lo decidí
- [ ] El informe está escrito y le avisé al LEAD
