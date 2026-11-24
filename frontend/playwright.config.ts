import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    { name: 'e2e', testDir: './tests/e2e/workshop' },
    { name: 'e2e-regression', testMatch: '**/e2e/*.spec.ts' },
  ],
  workers: 1,
  webServer: [
    {
      command: process.platform === 'win32' ? 'mvnw.cmd spring-boot:run' : './mvnw spring-boot:run',
      cwd: '../backend',
      env: { PORT: '8093', SERVER_ADDRESS: '127.0.0.1' },
      url: 'http://127.0.0.1:8093/api/health',
      timeout: 120000,
    },
    {
      command: 'npm run dev -- --port 5176',
      env: { API_ORIGIN: 'http://127.0.0.1:8093' },
      url: 'http://127.0.0.1:5176',
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5176',
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
