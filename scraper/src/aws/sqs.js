// Envío de mensajes a SQS (solo en AWS): cola del pipeline y DLQ (ADR-0001, ADR-0011).
// El SDK se carga al usarse, para que `npm run scrape:local` no dependa de él.
let cliente;

function obtenerCliente() {
  if (!cliente) {
    const { SQSClient } = require('@aws-sdk/client-sqs');
    cliente = new SQSClient({});
  }
  return cliente;
}

async function enviarMensaje(queueUrl, cuerpo) {
  const { SendMessageCommand } = require('@aws-sdk/client-sqs');
  await obtenerCliente().send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(cuerpo) }),
  );
}

function crearDlqSqs(dlqUrl) {
  return {
    async publicar({ comercio, url, motivo }) {
      await enviarMensaje(dlqUrl, { comercio, url, motivo });
    },
  };
}

module.exports = { enviarMensaje, crearDlqSqs };
