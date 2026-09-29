import { AIProvider } from './AIProvider.js';
import { AgnesProvider } from './AgnesProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { withPiiMasking } from './piiMaskingProvider.js';

export type AIProviderId = 'agnes' | 'gemini' | 'hcnsec';

export function createConfiguredAIProvider(): AIProvider {
  const selected = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as AIProviderId;
  if (selected === 'agnes') return new AgnesProvider();
  if (selected === 'hcnsec') return new OpenAICompatibleProvider();
  return new GeminiProvider();
}

// 個資遮蔽在此統一套用：所有送往外部 AI 的文字都先遮蔽、回應再還原。
// 在 Provider 層而非各呼叫點套用，才能一次涵蓋辯護分流、判決分析、
// 追問、律師助理與書狀產製等所有路徑。
// 前端不使用本模組，遮蔽不影響瀏覽器側行為。
export const defaultAIProvider = withPiiMasking(createConfiguredAIProvider());
