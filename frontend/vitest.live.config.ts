import { defineConfig } from 'vitest/config';

const backendUrl = process.env.SLOP_TEST_BACKEND_URL;

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.spec.ts'],
    environment: backendUrl ? 'happy-dom' : 'node',
    // The game uses relative /api URLs. Give its HTTP client the test server's origin.
    environmentOptions: { happyDOM: { url: backendUrl } },
  },
});
