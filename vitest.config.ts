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
        statements: 85,
        lines: 85,
        branches: 75,
        functions: 90,
        'src/domain/workflow/sdlcOrchestrator.ts': {
          statements: 90,
          lines: 90,
          branches: 75,
          functions: 95
        },
        'src/lib/externalCitationVerifier.ts': {
          statements: 95,
          lines: 95,
          branches: 90,
          functions: 85
        }
      }
    }
  }
});
