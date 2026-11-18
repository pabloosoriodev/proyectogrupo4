// Cliente de GET /v1/health. La URL base llega por VITE_API_URL (ADR-0008, aclaración 12).

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
}

export async function isApiHealthy() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/v1/health`);
    return response.status === 200;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'No se pudo consultar /v1/health',
        error: String(error),
      }),
    );
    return false;
  }
}
