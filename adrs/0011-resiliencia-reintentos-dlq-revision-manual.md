# ADR 0011: Resiliencia con reintentos SQS, DLQ y revisión manual de fallas

## Estado

Aceptado

## Contexto

El PRD exige que el scraping incluya "reintentos y una cola de errores (DLQ) para las lecturas que
fallen definitivamente", que una falla "quede registrada para revisión", que se conserven los
últimos precios conocidos del comercio que falla y que la web siga disponible aunque falle la
actualización. `CLAUDE.md` obliga a usar `try/catch`, enviar los errores no controlados a la DLQ
y registrar logs estructurados en JSON para CloudWatch.

## Decisión

- **Reintentos:** cada mensaje de comercio en SQS se procesa hasta un máximo configurable de
  **intentos en total** (`maxReceiveCount`, por defecto 3: el primer intento + 2 reintentos), con
  el *visibility timeout* como espera entre intentos.
- **DLQ:** agotados los intentos, el mensaje pasa a la DLQ (única, compartida por la cola liviana
  y la cola browser, ADR 0001) con comercio, URL y motivo del fallo. La DLQ retiene mensajes
  14 días (máximo de SQS).
- **Sin borrado:** un comercio que falla no modifica sus precios guardados; conservan su fecha
  original y la API los marca con `actualizadoHoy = false`.
- **Logs:** todas las Lambdas registran en JSON (`console.info` / `console.error`) con el
  comercio y un identificador de ejecución.
- **Detección:** **revisión manual** periódica de la DLQ y los logs de CloudWatch por parte del
  equipo; no se configuran alarmas automáticas.

## Alternativas consideradas

- **Alarma de CloudWatch → email por SNS** — avisaría en cuanto haya mensajes en la DLQ o
  errores de Lambda, dentro del free tier. No se eligió: el equipo prefiere empezar sin alertas
  automáticas y revisar manualmente.

## Consecuencias

- Las fallas quedan aisladas por comercio, reintentadas y registradas con su contexto, cumpliendo
  el PRD y `CLAUDE.md`; la web nunca depende del éxito del scraping.
- Cero configuración adicional de monitoreo.
- **Trade-off (detección):** una falla puede pasar días sin que nadie la vea; los precios de ese
  comercio envejecen (visibles como "no actualizado hoy") hasta la siguiente revisión. Si nadie
  revisa la DLQ en 14 días, los mensajes se pierden.
- Se recomienda fijar en el proceso del equipo una frecuencia concreta de revisión (p. ej.
  diaria) y reconsiderar las alarmas si la revisión no se sostiene.
