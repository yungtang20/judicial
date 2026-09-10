import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { defaultAIProvider } from '../ai/providers/providerRegistry.js';

// Keep test audit writes isolated from the repository/runtime database.
process.env.AUDIT_DB_PATH = ':memory:';

vi.mock('../ai/providers/providerRegistry.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    defaultAIProvider: {
      generate: vi.fn().mockResolvedValue({ 
        text: "[Mocked response] 大前提：模擬前提 小前提：模擬前提 涵攝：模擬涵攝 結論：模擬結論\n\n[Option 1] [Option 2]" 
      }),
      generateStructured: vi.fn().mockResolvedValue({
        rawMessage: "請補充案件發生時間與地點。",
        suggestedOptions: ["我可以補充確切時間", "只能確認大約時間", "目前無法確認"]
      })
    }
  };
});
