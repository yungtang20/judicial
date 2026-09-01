import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/*.ts', 'src/domain/**/*.ts'],
      exclude: ['src/domain/legal/index.ts'],
      thresholds: {
        statements: 70,
        lines: 70,
        branches: 75,
        functions: 45
      }
    }
  }
});
