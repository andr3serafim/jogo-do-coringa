import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Único pacote com bundler do repositório (spec §1.1).
// Em desenvolvimento, /api (e o WebSocket) vai para o `wrangler dev` na porta 8787; a origem
// http://localhost:5173 já é aceita por ALLOWED_ORIGINS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
});
