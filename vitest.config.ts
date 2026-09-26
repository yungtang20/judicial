import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { testTimeout: 30000,
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts', 'scripts/**/*.test.ts'],
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
      include: [
        'src/lib/*.ts',
        // P9 交付閘門鏈：finalGate／reviewer／compliance 屬交付信任邊界，
        // 必須與其餘 lib 邏輯一同納入覆蓋率統計，否則核心閘門會變成零可見度。
        'src/lib/finalGate/*.ts',
        'src/lib/reviewer/*.ts',
        'src/lib/compliance/*.ts',
        'src/domain/**/*.ts',
        'src/hooks/appealDataAdapters.ts',
        'src/types/navigation.ts',
        'server/knowledge-base/retrievalMath.ts',
        'src/components/appeal/AttachmentHeaderFields.tsx'
      ],
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
        },
        // P9 交付閘門核心：匯出授權與最終放行判定屬不可繞過的 fail-closed 路徑。
        'src/lib/finalGate/pleadingExportGate.ts': {
          statements: 90,
          lines: 90,
          branches: 85,
          functions: 95
        },
        'src/lib/finalGate/pleadingFinalGate.ts': {
          statements: 90,
          lines: 90,
          branches: 85,
          functions: 95
        }
      }
    }
  }
});
