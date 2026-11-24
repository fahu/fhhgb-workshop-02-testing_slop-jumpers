import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/workshop/**/*.spec.ts'] } },
      { test: { name: 'unit-regression', include: ['tests/unit/*.spec.ts'] } },
    ],
  },
});
