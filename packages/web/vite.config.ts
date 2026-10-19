import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Único pacote com bundler do repositório (spec §1.1). O proxy de /api para o `wrangler dev` entra na Tarefa 7.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
