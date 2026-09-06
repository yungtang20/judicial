import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { defaultAIProvider } from '../ai/providers/providerRegistry.js';

vi.mock('../ai/providers/providerRegistry.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    defaultAIProvider: {
      generate: vi.fn().mockResolvedValue({ 
        text: "[Mocked response] 大前提：模擬前提 小前提：模擬前提 涵攝：模擬涵攝 結論：模擬結論\n\n[Option 1] [Option 2]" 
      })
    }
  };
});
