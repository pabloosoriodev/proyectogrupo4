// Lectura de Parameter Store (solo en AWS, ADR-0010). El SDK se carga al usarse.
let cliente;

async function leerParametro(nombre) {
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  if (!cliente) {
    cliente = new SSMClient({});
  }
  const { Parameter } = await cliente.send(
    new GetParameterCommand({ Name: nombre, WithDecryption: true }),
  );
  return Parameter.Value;
}

module.exports = { leerParametro };
