import { useEffect, useState } from 'react';
import { isApiHealthy } from '../api/healthClient.js';

const STATUS_TEXT = {
  checking: 'API: comprobando…',
  ok: 'API: ok',
  unavailable: 'API: no disponible',
};

export default function HealthPage() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    isApiHealthy().then((healthy) => {
      if (active) {
        setStatus(healthy ? 'ok' : 'unavailable');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="health">
      <h1>Estado del sistema</h1>
      <p className={`health-status health-status--${status}`} role="status">
        {STATUS_TEXT[status]}
      </p>
    </section>
  );
}
