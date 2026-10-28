'use strict';

/**
 * DoD Sprint 0 — criterio 14: la conexión acepta SSL por configuración (ADR-0003).
 *
 * Caja negra sin base real: la API se apunta a un servidor TCP falso que solo registra el primer
 * mensaje del protocolo de PostgreSQL de cada conexión. Un cliente que pide SSL abre con
 * `SSLRequest` (código 80877103); uno que no, abre directamente con `StartupMessage` (protocolo
 * 3.0, código 196608).
 *
 * Given: la API levantada con `npm run dev:api`, `DB_HOST`/`DB_PORT` en el servidor falso y `DB_SSL`.
 * When:  GET /v1/health (la API intenta conectarse a la base).
 * Then:  con `DB_SSL=true` toda conexión pide SSL; con `DB_SSL=false`, ninguna.
 */

const net = require('net');
const { iniciarApi, pedirSalud, esperarHasta } = require('../helpers/apiLocal');
const { HOST_LOCAL, CREDENCIALES_FICTICIAS } = require('../fixtures/red');

jest.setTimeout(120000);

const CODIGO_SSL_REQUEST = 80877103;
const CODIGO_STARTUP_V3 = 196608;
const CODIGO_GSSENC_REQUEST = 80877104;

function clasificarPrimerMensaje(buffer) {
  if (buffer.length < 8) return `incompleto (${buffer.length} bytes)`;
  const codigo = buffer.readInt32BE(4);
  if (codigo === CODIGO_SSL_REQUEST) return 'SSLRequest';
  if (codigo === CODIGO_STARTUP_V3) return 'StartupMessage';
  if (codigo === CODIGO_GSSENC_REQUEST) return 'GSSENCRequest';
  return `desconocido (${codigo})`;
}

function iniciarPostgresFalso() {
  const primerosMensajes = [];
  const servidor = net.createServer((socket) => {
    socket.on('error', () => {});
    socket.once('data', (buffer) => {
      primerosMensajes.push(clasificarPrimerMensaje(buffer));
      socket.destroy();
    });
  });
  return new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(0, HOST_LOCAL, () => {
      resolve({
        puerto: servidor.address().port,
        primerosMensajes,
        cerrar: () => new Promise((fin) => servidor.close(() => fin())),
      });
    });
  });
}

describe.each([
  ['true', 'SSLRequest'],
  ['false', 'StartupMessage'],
])('conexión a PostgreSQL con DB_SSL=%s', (dbSsl, mensajeEsperado) => {
  let postgresFalso;
  let api;

  beforeAll(async () => {
    postgresFalso = await iniciarPostgresFalso();
    api = await iniciarApi({
      ...CREDENCIALES_FICTICIAS,
      DB_HOST: HOST_LOCAL,
      DB_PORT: String(postgresFalso.puerto),
      DB_SSL: dbSsl,
      DB_CONNECT_TIMEOUT_MS: '2000',
    });
  });

  afterAll(async () => {
    if (api) await api.detener();
    if (postgresFalso) await postgresFalso.cerrar();
  });

  test(`[DoD 14] el cliente PostgreSQL abre cada conexión con ${mensajeEsperado}`, async () => {
    await pedirSalud().catch(() => undefined);
    await esperarHasta(() => postgresFalso.primerosMensajes.length > 0, 10000, 100);

    expect(postgresFalso.primerosMensajes.length).toBeGreaterThan(0);
    expect(postgresFalso.primerosMensajes).toEqual(
      postgresFalso.primerosMensajes.map(() => mensajeEsperado),
    );
  });
});
