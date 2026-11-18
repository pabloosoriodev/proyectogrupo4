// Servidor HTTP de desarrollo (enmienda ADR-0009): traduce cada petición a un evento de
// API Gateway HTTP API (payload 2.0) y llama al mismo handler que corre en Lambda.
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { getApiConfig, logger } = require('@proyectogrupo4/shared');
const health = require('./handlers/health');

const ROUTES = {
  'GET /v1/health': health.handler,
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function toHttpApiEvent(req, url, body, requestId) {
  const routeKey = `${req.method} ${url.pathname}`;
  return {
    version: '2.0',
    routeKey,
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ''),
    headers: req.headers,
    queryStringParameters: url.search ? Object.fromEntries(url.searchParams) : undefined,
    requestContext: {
      http: {
        method: req.method,
        path: url.pathname,
        protocol: `HTTP/${req.httpVersion}`,
        sourceIp: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
      requestId,
      routeKey,
      stage: '$default',
      timeEpoch: Date.now(),
    },
    body: body || undefined,
    isBase64Encoded: false,
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function handleRequest(req, res) {
  const requestId = randomUUID();
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const handler = ROUTES[`${req.method} ${url.pathname}`];
    if (!handler) {
      // Mismo cuerpo que devuelve API Gateway HTTP API para una ruta inexistente.
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }
    const body = await readBody(req);
    const event = toHttpApiEvent(req, url, body, requestId);
    const result = await handler(event, { awsRequestId: requestId });
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  } catch (error) {
    logger.error('Error no controlado en el servidor de desarrollo', {
      requestId,
      error: logger.serializeError(error),
    });
    if (!res.headersSent) {
      sendJson(res, 500, { message: 'Internal Server Error' });
    } else {
      res.end();
    }
  }
}

function createDevServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res);
  });
}

async function main() {
  try {
    const { port } = getApiConfig();
    const server = createDevServer();
    server.on('error', (error) => {
      logger.error('El servidor de desarrollo de la API no pudo arrancar', {
        error: logger.serializeError(error),
      });
      process.exitCode = 1;
    });
    server.listen(port, () => {
      logger.info('API de desarrollo escuchando', { port });
    });
  } catch (error) {
    logger.error('Configuración inválida para la API de desarrollo', {
      error: logger.serializeError(error),
    });
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { createDevServer, toHttpApiEvent };
