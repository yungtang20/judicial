import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { testTimeout: 30000,
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'coverage', 'caveman/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/lib/*.ts', 'src/domain/**/*.ts'],
      exclude: [
        'src/domain/legal/index.ts', 'src/types.ts',
        // Browser-only persistence/export adapters are integration surfaces;
        // keep unit coverage focused on deterministic legal/runtime logic.
        'src/lib/analysisHistory.ts', 'src/lib/crossFeatureContext.ts', 'src/lib/exportReport.ts'
      ],
      thresholds: {
        statements: 70,
        lines: 70,
        branches: 72,
        functions: 45
      }
    }
  }
});
