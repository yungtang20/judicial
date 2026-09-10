import { AIProvider, AIProviderGenerateOptions, AIProviderResponse } from './AIProvider.js';

export interface OpenAICompatibleProviderConfig {
  providerId: string;
  providerName: string;
  apiKeyEnv: string;
  baseUrlEnv: string;
  modelEnv: string;
  timeoutEnv: string;
  defaultBaseUrl: string;
  defaultModel: string;
  /** Optional request-scoped overrides; never persisted or logged. */
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

const HCNSEC_CONFIG: OpenAICompatibleProviderConfig = {
  providerId: 'HCNSEC',
  providerName: 'OpenAICompatibleProvider',
  apiKeyEnv: 'HCNSEC_API_KEY',
  baseUrlEnv: 'HCNSEC_BASE_URL',
  modelEnv: 'HCNSEC_MODEL',
  timeoutEnv: 'HCNSEC_TIMEOUT_MS',
  defaultBaseUrl: 'https://api.hcnsec.cn/v1',
  defaultModel: 'DeepSeek-V4-Pro'
};

/** Server-side adapter for OpenAI-compatible gateways (disabled unless selected). */
export class OpenAICompatibleProvider implements AIProvider {
  public readonly name: string;

  constructor(private readonly config: OpenAICompatibleProviderConfig = HCNSEC_CONFIG) {
    this.name = config.providerName;
  }

  private get key() { return (this.config.apiKey?.trim() || process.env[this.config.apiKeyEnv]?.trim()); }
  private get baseUrl() { return (this.config.baseUrl?.trim() || process.env[this.config.baseUrlEnv] || this.config.defaultBaseUrl).replace(/\/$/, ''); }
  private get model() { return this.config.model?.trim() || process.env[this.config.modelEnv] || this.config.defaultModel; }
  private errorCode(suffix: string) { return `${this.config.providerId}_${suffix}`; }

  private async request(prompt: string, options?: AIProviderGenerateOptions): Promise<AIProviderResponse> {
    if (!this.key) throw new Error(this.errorCode('API_KEY_UNAVAILABLE'));
    if (options?.inlineData) throw new Error(this.errorCode('INLINE_DATA_UNSUPPORTED'));
    const messages = [
      ...(options?.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
      { role: 'user', content: prompt }
    ];
    const controller = new AbortController();
    const timeoutMs = this.config.timeoutMs ?? Number(process.env[this.config.timeoutEnv] || 30_000);
    const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: options?.model || this.model, messages, temperature: options?.temperature, response_format: options?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(this.errorCode(`HTTP_${response.status}`));
      const payload = await response.json() as any;
      const text = payload?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error(this.errorCode('MALFORMED_RESPONSE'));
      return { text, usage: payload.usage ? { promptTokens: payload.usage.prompt_tokens, completionTokens: payload.usage.completion_tokens, totalTokens: payload.usage.total_tokens } : undefined };
    } finally {
      clearTimeout(timer);
    }
  }

  generate(prompt: string, options?: AIProviderGenerateOptions) { return this.request(prompt, options); }

  async generateStructured<T = any>(prompt: string, schema: any, options?: AIProviderGenerateOptions): Promise<T> {
    const result = await this.request(prompt, { ...options, responseMimeType: 'application/json', responseSchema: schema });
    const fencedJson = result.text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const jsonText = fencedJson?.[1] || result.text;
    try { return JSON.parse(jsonText) as T; } catch (error: any) { throw new Error(`STRUCTURED_OUTPUT_PARSE_ERROR: ${error.message}`); }
  }

  async healthCheck() {
    return this.key
      ? { ok: true, message: `${this.config.providerId} provider configured (OpenAI-compatible contract; live compatibility not verified)`, model: this.model }
      : { ok: false, message: `No ${this.config.providerId} API key provided (provider disabled)`, model: this.model };
  }
}
