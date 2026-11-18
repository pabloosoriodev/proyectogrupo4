'use strict';

const net = require('net');

/**
 * Host que no responde a la conexión (TEST-NET-1, RFC 5737, reservado para documentación):
 * sirve para provocar el timeout de conexión a la base. Se puede cambiar con
 * `TEST_DB_HOST_SIN_RESPUESTA` si la red local devuelve "inalcanzable" en vez de no responder.
 */
const HOST_SIN_RESPUESTA = process.env.TEST_DB_HOST_SIN_RESPUESTA || '192.0.2.1';

const HOST_LOCAL = '127.0.0.1';

/** Devuelve un puerto local en el que no escucha nadie (la conexión se rechaza). */
function puertoCerrado() {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.once('error', reject);
    servidor.listen(0, HOST_LOCAL, () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
  });
}

/** Credenciales ficticias para apuntar la API a una base falsa o inexistente. */
const CREDENCIALES_FICTICIAS = Object.freeze({
  DB_NAME: 'tester_sin_base',
  DB_USER: 'tester',
  DB_PASSWORD: 'tester',
});

module.exports = { HOST_SIN_RESPUESTA, HOST_LOCAL, puertoCerrado, CREDENCIALES_FICTICIAS };
