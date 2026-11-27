# Security Pass — Comparador de precios entre comercios/supermercados

Fecha: 2026-11-24
Rama revisada: `feature/hu-01-scraping` (HEAD `905c44e`; incluye el Sprint 0 fusionado en `main`)

**Alcance revisado:**
- Producto: `PRD.md` v1.2.
- Arquitectura: `TECH-DESIGN.md` y `adrs/0001`–`0012`.
- Especificaciones: `contratos/CONTRATO-HU-01.md` v6 y `hus/`.
- Código: `api/`, `scraper/`, `shared/`, `db/`, `web/`, `infra/template.yaml` e `infra/scripts/`.
- Configuración: `.env.example` y `.gitignore`.
- Dependencias: `package.json` y `package-lock.json`.
- Pruebas: `tests/` y `informes/TESTER-HU-01.md`.

**Capas omitidas:** CI/CD, porque no existe (no hay `.github/` ni pipeline). Tampoco se revisó
infraestructura desplegada, porque no hay despliegue ni cuenta de AWS.

**Auditoría de dependencias:** se ejecutó `npm audit` en modo lectura con Node 22.23.4.
- `npm audit --omit=dev` → **0 vulnerabilidades** en dependencias de producción.
- `npm audit` completo → 19 (2 altas y 17 moderadas), todas en dependencias de desarrollo: `glob`
  y `minimatch` a través de `jest` y `node-pg-migrate`. Ver SEC-05.

## Resumen ejecutivo

El sistema compara precios públicos de supermercados. **No maneja cuentas, pagos ni datos
personales** (PRD), así que su riesgo de seguridad es bajo. Lo que hay que proteger es la base de
datos (integridad y disponibilidad de los precios) y la disponibilidad de la web pública.

El código de HU-01 está bien hecho en lo esencial: SQL parametrizado, configuración validada,
`robots.txt` y límite de peticiones con pruebas, y permisos IAM acotados.

Los dos riesgos reales están en la **plantilla de AWS, que todavía no está desplegada**:
- la contraseña de la base viaja en texto plano y con el mismo usuario con escritura para la API
  pública y el scraper;
- la API pública no tiene límite de peticiones, así que puede agotar las conexiones de la base.

Conviene corregirlos **antes del primer despliegue**. El resto son mejoras de robustez frente a
datos de webs de terceros.

## Fortalezas de seguridad

- **SQL parametrizado:** todas las escrituras usan parámetros (`unnest($n::tipo[])`), sin
  concatenar texto (`scraper/src/repositorio.js:4-30`).
- **Integridad en la base:** `CHECK` de precios no negativos y oferta menor que el regular, e
  índices únicos (`db/migrations/1794977884792_comercio-publicacion.js`). Además, la escritura es
  todo o nada por comercio (`repositorio.js:45-70`).
- **Configuración validada:** URL solo `http`/`https`, slugs únicos, límites positivos y tope
  entero (`scraper/src/config/comercios.js:11-89`). Si falta algo, el comando no arranca (caso E2,
  con pruebas).
- **Scraping responsable con pruebas:** `robots.txt` según RFC 9309, que ante un error de
  servidor prohíbe todo (fail-closed, `scraper/src/robots/robots.js:84-99`), límite de peticiones
  por ventana y `User-Agent` propio. Lo cubren los casos D1–D3 de
  `tests/integration/hu01/scrapingResponsable.test.js`.
- **Timeout en cada petición** (`AbortSignal.timeout`, `scraper/src/http/clienteHttp.js:13`) y
  reintentos acotados (decisión 24).
- **IAM con mínimo privilegio:** cada Lambda solo puede leer su parámetro o enviar a su cola
  (`infra/template.yaml:154-158, 181-184, 204-214`). DLQ en todas las rutas asíncronas.
- **Secretos fuera del repositorio:** `.env` está ignorado (`.gitignore:5-7`) y `.env.example` no
  tiene valores. El parámetro `DbPassword` tiene `NoEcho` y los logs no serializan pilas ni
  configuración (`shared/src/logger.js:3-12`).
- **Las pruebas no pueden dañar la base de desarrollo:** usan `comparador_test` y se niegan a
  borrar si la conexión apunta a otra base (`informes/TESTER-HU-01.md`).

## Findings

### MEDIUM

**ID:** SEC-01
**Title:** La contraseña de la base viaja en texto plano a las Lambdas, con un único usuario con escritura para la API pública y el scraper
**Severity:** MEDIUM
**Confidence:** HIGH
**Category:** Secretos fuera de un gestor de secretos / privilegios excesivos
**Affected artifact:** Infraestructura (`infra/template.yaml`); arquitectura (ADR-0003, ADR-0010)
**Location:**
- `infra/template.yaml:18-24` (un solo `DbUser` y `DbPassword`);
- `:98-102` (`HealthFunction`), `:145-149` (`OrquestadorFunction`) y `:170-174` (`ScraperFunction`),
  con `DB_PASSWORD: !Ref DbPassword`.

**Description:** las tres Lambdas reciben la misma contraseña como **variable de entorno en texto
plano**. Además usan el mismo usuario de base de datos, así que la API pública, que solo debería
leer, tiene los mismos permisos de escritura que el scraper.
- ADR-0010 dice que las credenciales viven como `SecureString` en Parameter Store y que las Lambdas
  las leen al arrancar.
- ADR-0003 pide "usuarios de base de datos con mínimo privilegio y separados por componente (la API
  solo lee; el scraper escribe precios)".
- La decisión 17 del contrato HU-01 aceptó usar `comparador_app` "hasta el despliegue". Esta
  plantilla **es** el artefacto de despliegue.

**Evidence:** en las líneas citadas, `DB_PASSWORD: !Ref DbPassword` está en `Environment.Variables`
de las tres funciones. El parámetro `DbUser` se describe como "Usuario de la API en PostgreSQL".
`NoEcho` solo oculta el valor en CloudFormation, no en la configuración de la Lambda.

**Attack scenario:**
- Cualquier identidad de AWS con `lambda:GetFunctionConfiguration` lee la contraseña en claro, desde
  la consola o la CLI. ADR-0003 deja RDS **accesible desde internet**, así que con esa contraseña
  se conecta a la base desde fuera.
- Una futura inyección en la API de búsqueda (HU-03) tendría permisos de escritura y podría alterar
  o borrar precios.

**Potential impact:** integridad de todos los precios y posible pérdida de datos. La web mostraría
precios falsos.

**Existing mitigation:**
- SSL configurable (`DB_SSL`).
- `NoEcho` en el parámetro.
- Las consultas actuales de la API son fijas (`SELECT 1`).
- No hay despliegue todavía.

**Recommended remediation:** antes del primer despliegue:
1. Guardar la contraseña como `SecureString` en Parameter Store, conceder a cada Lambda
   `ssm:GetParameter` sobre su parámetro y leerla al arrancar, sin pasarla como variable de entorno.
   Es lo que ya hace el orquestador con la configuración de comercios.
2. Crear usuarios separados: `comparador_api` solo con `SELECT`, `comparador_scraper` con `INSERT`
   y `UPDATE` sobre `comercio` y `publicacion`, y un usuario aparte para migraciones (ADR-0003).

**Suggested verification:** revisión de la plantilla, que no debe tener ninguna `DB_PASSWORD` en
`Environment`. Además, una prueba de integración que demuestre que el usuario de la API no puede
hacer `INSERT` en `publicacion`.

**Required change type:** CODE FIX. Ver Gobernanza: hay que decidir si la decisión 17 cubre o no
el despliegue.

---

**ID:** SEC-02
**Title:** La API pública no tiene límite de peticiones ni de concurrencia, y cada petición abre una conexión a la base
**Severity:** MEDIUM
**Confidence:** MEDIUM
**Category:** Agotamiento de recursos / disponibilidad
**Affected artifact:** Infraestructura (`infra/template.yaml`); código (`api/src/handlers/health.js`, `shared/src/db.js`)
**Location:**
- `infra/template.yaml:83-84`: `HttpApi` sin `DefaultRouteSettings` ni throttling.
- `:86-112`: `HealthFunction` sin `ReservedConcurrentExecutions`.
- `api/src/handlers/health.js:26`: `SELECT 1` en cada petición.
- `shared/src/db.js`: una conexión por instancia.

**Description:** `GET /v1/health` es público y sin autenticación, por diseño (PRD: web sin login).
Cada instancia de Lambda abre una conexión a PostgreSQL. Sin throttling en API Gateway ni límite de
concurrencia, un aluvión de peticiones escala las Lambdas hasta el límite de la cuenta (por defecto
1000), con una conexión por instancia. Eso supera de sobra las conexiones de una instancia RDS
pequeña (ADR-0002, free tier).

**Evidence:**
- La plantilla no declara `ThrottlingBurstLimit`, `ThrottlingRateLimit` ni
  `ReservedConcurrentExecutions` en ningún recurso.
- `HEALTH_QUERY = 'SELECT 1'` se ejecuta en cada invocación (`health.js:5, 26`).

**Attack scenario:** cualquiera en internet lanza miles de `GET /v1/health` por segundo. Las
conexiones de RDS se agotan, el scraper diario (que comparte la base) falla y va a la DLQ, y las
futuras búsquedas (HU-03) y comparaciones (HU-04) dejan de responder. Además, aumenta el costo de
Lambda y de API Gateway.

**Potential impact:** indisponibilidad de la web y del pipeline, y costo inesperado. El PRD pide
"la web debe seguir disponible".

**Existing mitigation:** una sola conexión por instancia (`db.js`) y timeout de conexión
(`DB_CONNECT_TIMEOUT_MS`).

**Recommended remediation:**
- Configurar throttling en la `HttpApi` (`DefaultRouteSettings` con `ThrottlingBurstLimit` y
  `ThrottlingRateLimit`) y `ReservedConcurrentExecutions` en las funciones de la API, con valores
  coherentes con `max_connections` de RDS.
- Valorar que el endpoint de salud no consulte la base en cada petición (por ejemplo, con un
  resultado en caché de pocos segundos). Esa decisión es del equipo.

**Suggested verification:** revisión de la plantilla (los valores deben estar parametrizados). En
AWS, una prueba de carga que confirme respuestas `429` sin agotar las conexiones de RDS.

**Required change type:** CODE FIX.

**Confidence MEDIUM porque:** sin despliegue no se pudo medir `max_connections` de la instancia
elegida ni el límite real de concurrencia de la cuenta.

### LOW

**ID:** SEC-03
**Title:** Los datos de las webs de terceros se guardan sin validar el enlace ni el rango del precio
**Severity:** LOW
**Confidence:** MEDIUM
**Category:** Manejo de entradas no confiables / integridad y disponibilidad
**Affected artifact:** Especificación (`contratos/CONTRATO-HU-01.md`, tabla de correspondencia y caso B11); código (`scraper/src/adaptadores/vtex.js`)
**Location:**
- `scraper/src/adaptadores/vtex.js:20` (`url` = `link` tal cual) y `:11` (`esPrecio`: cualquier
  número finito ≥ 0);
- columnas `numeric(10,2)` de la migración.

**Description:** el scraper trata como confiables los datos de webs de terceros. Algunas, como
Plaza Vea y Metro, son marketplaces con vendedores externos.
- **Enlace:** se guarda el `link` sin comprobar que sea `https` ni que pertenezca al dominio del
  comercio. HU-04 (criterio 6) lo mostrará como enlace al público.
- **Precio:** basta con que sea finito y ≥ 0, pero la columna admite como máximo 99 999 999.99. Un
  solo producto con un precio fuera de ese rango hace fallar la transacción **de todo el comercio**
  (decisión 9, todo o nada).

**Evidence:**
- `mapearProducto` copia `producto.link` sin validar (`vtex.js:20, 49`).
- `esPrecio` no tiene tope (`vtex.js:11`).
- El contrato v6 no define validación de esquema ni de dominio para `url`, ni rango de precios.

**Attack scenario:**
1. Un producto publicado por un vendedor externo, o una ficha comprometida, con un `link` hacia un
   dominio de phishing: la web del comparador redirigiría a sus usuarios a ese sitio.
2. Una ficha con `ListPrice` = 1e9 hace que ese comercio falle **todos los días** y conserve
   precios viejos.

**Potential impact:** usuarios enviados a sitios maliciosos desde una web que confían; precios de
un comercio congelados.

**Existing mitigation:**
- React 19 bloquea las URLs `javascript:` en `href` y escapa el texto.
- Los tres comercios son grandes cadenas.
- HU-04 todavía no existe.
- Los `CHECK` de la base evitan datos incoherentes.

**Recommended remediation:**
- En el contrato (v7 de HU-01, o en el de HU-04): un producto cuyo `link` no sea `https` o cuyo host
  no coincida con el de la URL del comercio se omite como mal formado (caso B11).
- Un producto con precio mayor que el máximo de la columna se omite también como B11, en vez de
  hacer fallar al comercio.

**Suggested verification:** pruebas con la web VTEX falsa:
- `link` = `https://otro-dominio.example/p` → no se guarda;
- `ListPrice` = 1e9 → el producto se omite y el resto del comercio se guarda.

**Required change type:** SPEC CHANGE.

---

**ID:** SEC-04
**Title:** El cliente HTTP sigue redirecciones a cualquier destino y lee respuestas sin límite de tamaño
**Severity:** LOW
**Confidence:** MEDIUM
**Category:** Entradas no confiables / agotamiento de recursos
**Affected artifact:** Código (`scraper/src/http/clienteHttp.js`); especificación (contrato HU-01, sección D)
**Location:** `scraper/src/http/clienteHttp.js:10-14` (`fetch` con la opción por defecto
`redirect: 'follow'`) y `:24` (`respuesta.text()` sin límite).

**Description:**
- **Redirecciones:** si una web de comercio responde con una redirección 3xx, `fetch` la sigue a
  cualquier host. No vuelve a comprobar `robots.txt` del nuevo destino, y en ese host el límite de
  peticiones no es el del comercio.
- **Tamaño:** el cuerpo se lee entero en memoria, sin límite. El timeout limita el tiempo, no el
  tamaño.

**Evidence:** no hay `redirect:` ni comprobación de tamaño en `clienteHttp.js`. Una búsqueda en
`scraper/src` de `redirect`, `content-length` o `maxBytes` no da resultados.

**Attack scenario:**
1. Una web cambia su API y redirige a otro dominio: el scraper consulta un sitio no previsto sin
   comprobar su `robots.txt`, lo que va contra RN-6 y el caso D1.
2. Una respuesta enorme (por error o a propósito) agota la memoria de la Lambda y el comercio falla.

**Potential impact:** scraping fuera de las reglas acordadas (riesgo legal, RN-6); fallos del
comercio por memoria.

**Existing mitigation:** URLs base validadas en la configuración, `SCRAPING_TIMEOUT_MS` y
reintentos acotados.

**Recommended remediation:** fijarlo en el contrato y luego en el código:
- usar `redirect: 'manual'` y tratar un 3xx como fallo, o seguirlo solo si el destino es el mismo
  host;
- cortar la lectura por encima de un tamaño máximo configurable y tratarlo como fallo.

**Suggested verification:** pruebas con la web falsa:
- responde `302 Location: http://otro-host/...` → no se pide el otro host y el comercio falla (o
  se trata según lo que se decida);
- respuesta de más del máximo → fallo controlado.

**Required change type:** SPEC CHANGE.

### INFO

**ID:** SEC-05
**Title:** Vulnerabilidades en dependencias de desarrollo (19: 2 altas y 17 moderadas), cero en producción
**Severity:** INFO
**Confidence:** HIGH
**Category:** Cadena de suministro
**Affected artifact:** `package-lock.json` (devDependencies)
**Location:** `glob` 9.0.0–14.0.1 (alta), a través de `node-pg-migrate` (alta, directa) y Jest;
`minimatch` 7.0.0–11.0.0 (moderada), a través de la cadena de Jest 30.

**Description:** `npm audit` reporta 19 vulnerabilidades, todas en herramientas de desarrollo y
pruebas. La alta de `glob` es una inyección de comandos **en su CLI** (`-c/--cmd`). En el Sprint 0
eran 7; ahora son 19 por la cadena de Jest 30.

**Evidence:**
- `npm audit --omit=dev` → `found 0 vulnerabilities`.
- `npm audit` → `19 vulnerabilities (17 moderate, 2 high)`.

**Attack scenario:** ninguno realista en este proyecto:
- el proyecto no ejecuta el CLI de `glob` con `-c`;
- `minimatch` solo procesa patrones propios de Jest;
- nada de esto entra en los paquetes de las Lambdas, que se empaquetan con esbuild solo con
  dependencias de producción.

**Potential impact:** ninguno en producción. Sería mínimo en la máquina de desarrollo y en una
futura CI.

**Existing mitigation:** son dependencias de desarrollo, fuera de los paquetes desplegados. El
riesgo de `glob` ya se aceptó en el Sprint 0.

**Recommended remediation:** actualizar cuando haya versiones corregidas compatibles con CommonJS
(`node-pg-migrate`) y con Jest, sin usar `npm audit fix --force`.

**Suggested verification:** volver a ejecutar `npm audit --omit=dev` en cada PR; debe seguir en 0.

**Required change type:** ACCEPT RISK.

## Prioridad

1. **SEC-01**, antes de cualquier despliegue. Es la que más daño permite (escritura sobre todos los
   precios desde la API pública y una contraseña legible).
2. **SEC-02**, antes de abrir la web al público. Se corrige en la misma plantilla que SEC-01.
3. **SEC-03**, antes de construir HU-04, porque es ahí donde el enlace se muestra al usuario. La
   parte del precio, en la próxima versión del contrato de HU-01.
4. **SEC-04**, junto con SEC-03 en esa misma versión del contrato.
5. **SEC-05**, mantenimiento normal de dependencias.

Ninguna bloquea el veredicto de HU-01, porque no hay despliegue. SEC-01 y SEC-02 sí bloquean el
primer despliegue.

## Decisiones del humano (2026-11-24)

| Finding | Decisión | Consecuencia |
|---|---|---|
| SEC-01 | No se corrige por ahora | Queda como **requisito previo al primer despliegue**: no se despliega sin resolverlo |
| SEC-02 | Sin decisión explícita | Igual que SEC-01: bloquea el primer despliegue |
| SEC-03 y SEC-04 | No se corrigen | Riesgo aceptado; no se abre una nueva versión del contrato |
| SEC-05 | Se corrige | Encargo al DEV en la rama `chore/deps-seguridad` (`encargos/ENCARGO-DEV-DEPS-SEGURIDAD.md`) |

## Gobernanza / Decisión requerida (texto original del pase)

- **SEC-01: alcance de la decisión 17 (humano).** Se aprobó usar `comparador_app` "hasta el
  despliegue". Falta decidir si la plantilla actual (contraseña en variable de entorno y un solo
  usuario) se corrige **ya** en HU-01 o se registra como requisito para el primer despliegue.
  Corregirlo no requiere cambiar ningún ADR: ADR-0003 y ADR-0010 ya lo prescriben.
- **SEC-03 y SEC-04: cambio de contrato (humano).** Validar el `link`, el rango del precio, las
  redirecciones y el tamaño de respuesta cambia el comportamiento observable. Hace falta una nueva
  versión del contrato (de HU-01 o de HU-04) aprobada por el humano.
- **SEC-05: aceptar el riesgo (humano).** Ya se aceptó para `glob` en el Sprint 0. Hay que
  confirmar que la aceptación cubre también las 17 moderadas nuevas de la cadena de Jest 30.
