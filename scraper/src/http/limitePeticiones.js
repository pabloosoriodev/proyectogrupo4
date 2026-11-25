// Límite de peticiones por comercio (contrato HU-01, caso D2; decisión 4): en cualquier ventana de
// 1 s la web recibe como máximo `limitePeticionesPorSegundo` peticiones, contando robots.txt.
// Ventana deslizante: se guarda el inicio de las últimas peticiones y se espera lo necesario.

const UN_SEGUNDO_MS = 1000;
// Holgura para que la latencia de red no junte en el servidor dos peticiones que aquí salieron
// separadas por exactamente la ventana.
const HOLGURA_MS = 50;

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function crearLimitePeticiones(peticionesPorSegundo, { ahora = Date.now, esperar = dormir } = {}) {
  // Con un límite menor que 1 (p. ej. 0.5) se permite 1 petición cada 1 / límite segundos.
  const capacidad = Math.max(1, Math.floor(peticionesPorSegundo));
  const ventanaMs =
    (peticionesPorSegundo >= 1 ? UN_SEGUNDO_MS : UN_SEGUNDO_MS / peticionesPorSegundo) + HOLGURA_MS;
  const recientes = [];
  let turnos = Promise.resolve();

  async function tomarTurno() {
    for (;;) {
      const t = ahora();
      while (recientes.length > 0 && t - recientes[0] >= ventanaMs) {
        recientes.shift();
      }
      if (recientes.length < capacidad) {
        recientes.push(t);
        return;
      }
      await esperar(recientes[0] + ventanaMs - t);
    }
  }

  // Las peticiones esperan en fila: así el límite vale también con llamadas concurrentes.
  return {
    esperarTurno() {
      const turno = turnos.then(tomarTurno);
      turnos = turno.catch(() => {});
      return turno;
    },
  };
}

module.exports = { crearLimitePeticiones };
