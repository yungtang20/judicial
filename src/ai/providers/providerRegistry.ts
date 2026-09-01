import { AIProvider } from './AIProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

export type AIProviderId = 'gemini' | 'hcnsec';

export function createConfiguredAIProvider(): AIProvider {
  const selected = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as AIProviderId;
  if (selected === 'hcnsec') return new OpenAICompatibleProvider();
  return new GeminiProvider();
}

export const defaultAIProvider = createConfiguredAIProvider();

