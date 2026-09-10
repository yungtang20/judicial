import { AIProvider } from './AIProvider.js';
import { AgnesProvider } from './AgnesProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

export type AIProviderId = 'agnes' | 'gemini' | 'hcnsec';

export function createConfiguredAIProvider(): AIProvider {
  const selected = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as AIProviderId;
  if (selected === 'agnes') return new AgnesProvider();
  if (selected === 'hcnsec') return new OpenAICompatibleProvider();
  return new GeminiProvider();
}

export const defaultAIProvider = createConfiguredAIProvider();
