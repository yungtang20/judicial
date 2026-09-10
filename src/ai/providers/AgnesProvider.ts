import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

/** Server-side adapter for the OpenAI-compatible Agnes AI API. */
export class AgnesProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      providerId: 'AGNES',
      providerName: 'AgnesProvider',
      apiKeyEnv: 'AGNES_API_KEY',
      baseUrlEnv: 'AGNES_BASE_URL',
      modelEnv: 'AGNES_MODEL',
      timeoutEnv: 'AGNES_TIMEOUT_MS',
      defaultBaseUrl: 'https://apihub.agnes-ai.com/v1',
      defaultModel: 'agnes-2.5-flash'
    });
  }
}
