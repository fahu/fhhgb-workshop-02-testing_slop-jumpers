import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5175, strictPort: true, proxy: { '/api': process.env.API_ORIGIN ?? 'http://127.0.0.1:8092' } },
});
