import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Las variables VITE_* se leen del .env de la raíz del monorepo.
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  server: {
    strictPort: true,
  },
});
