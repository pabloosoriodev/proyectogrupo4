# ADR 0008: Frontend como SPA en React + Vite servida estáticamente

## Estado

Aceptado

## Contexto

ADR 0001 fija que la web pública es estática (S3 + CloudFront) y consume la API REST de ADR 0007.
El MVP tiene tres vistas: búsqueda con filtros (HU-03), lista de resultados agrupados (HU-03) y
comparación de precios por comercio con el más barato destacado, fecha de captura, marca "no
actualizado hoy" y enlace al comercio (HU-04). El PRD exige una web pública sin login y excluye
una app móvil nativa. No hay `Design.md`. El stack transversal es JavaScript (`CLAUDE.md`).

## Decisión

La web se construye como **Single Page Application en React con Vite**, compilada a archivos
estáticos y publicada en S3 detrás de CloudFront. Las URLs de la API y demás configuración se
inyectan en el build por variables de entorno, nunca escritas en el código.

## Alternativas consideradas

- **Next.js con render en servidor** — mejor SEO y primera carga en páginas de producto. No se
  eligió porque en AWS necesita OpenNext/Lambda para renderizar, lo que agrega componentes y
  contradice la web 100% estática de ADR 0001.
- **HTML + JS ligero (htmx/Alpine)** — lo más liviano, sin build complejo. No se eligió porque
  ofrece menos estructura cuando la web crezca (registro de comercios, promociones, quejas) y es
  menos familiar para el equipo.

## Consecuencias

- Hosting gratuito dentro del free tier de S3/CloudFront; la web sigue disponible aunque fallen
  el scraping o la API (muestra el error de forma controlada).
- Un solo lenguaje (JavaScript) en frontend, API y scraping.
- **Trade-off (SEO):** al renderizarse en el navegador, los buscadores indexan poco contenido de
  producto; si el tráfico orgánico pasa a ser un objetivo, habrá que revisar esta decisión
  (prerender o SSR).
- **Trade-off (herramientas):** el ecosistema de Vite usa Vitest por defecto, pero `CLAUDE.md`
  fija Jest; el frontend necesitará configuración adicional (Babel/transform) para correr Jest.
- La SPA necesita que CloudFront redirija rutas desconocidas a `index.html` para que funcionen
  los enlaces directos a un producto.
