// npm run dev — arranca en paralelo la API (dev:api) y la web (dev:web) para desarrollo local.
const { spawn } = require('node:child_process');

const SCRIPTS = ['dev:api', 'dev:web'];
const children = [];

function stopAll(signal) {
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill(signal);
    }
  }
}

for (const script of SCRIPTS) {
  const child = spawn('npm', ['run', script], { stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(JSON.stringify({ level: 'error', message: `${script} terminó`, code }));
      process.exitCode = code ?? 1;
      stopAll('SIGTERM');
    }
  });
  children.push(child);
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
