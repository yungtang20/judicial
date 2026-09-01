import { AIProvider, AIProviderGenerateOptions, AIProviderResponse } from './AIProvider.js';

/** Server-side adapter for OpenAI-compatible gateways (disabled unless selected). */
export class OpenAICompatibleProvider implements AIProvider {
  public readonly name = 'OpenAICompatibleProvider';
  private readonly defaultBaseUrl = 'https://api.hcnsec.cn/v1';
  private readonly defaultModel = 'gpt-4o-mini';

  private get key() { return process.env.HCNSEC_API_KEY?.trim(); }
  private get baseUrl() { return (process.env.HCNSEC_BASE_URL || this.defaultBaseUrl).replace(/\/$/, ''); }
  private get model() { return process.env.HCNSEC_MODEL || this.defaultModel; }

  private async request(prompt: string, options?: AIProviderGenerateOptions): Promise<AIProviderResponse> {
    if (!this.key) throw new Error('HCNSEC_API_KEY_UNAVAILABLE');
    if (options?.inlineData) throw new Error('HCNSEC_INLINE_DATA_UNSUPPORTED');
    const messages = [
      ...(options?.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
      { role: 'user', content: prompt }
    ];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.HCNSEC_TIMEOUT_MS || 30_000));
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: options?.model || this.model, messages, temperature: options?.temperature, response_format: options?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HCNSEC_HTTP_${response.status}`);
      const payload = await response.json() as any;
      const text = payload?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('HCNSEC_MALFORMED_RESPONSE');
      return { text, usage: payload.usage ? { promptTokens: payload.usage.prompt_tokens, completionTokens: payload.usage.completion_tokens, totalTokens: payload.usage.total_tokens } : undefined };
    } finally {
      clearTimeout(timer);
    }
  }

  generate(prompt: string, options?: AIProviderGenerateOptions) { return this.request(prompt, options); }

  async generateStructured<T = any>(prompt: string, schema: any, options?: AIProviderGenerateOptions): Promise<T> {
    const result = await this.request(prompt, { ...options, responseMimeType: 'application/json', responseSchema: schema });
    try { return JSON.parse(result.text) as T; } catch (error: any) { throw new Error(`STRUCTURED_OUTPUT_PARSE_ERROR: ${error.message}`); }
  }

  async healthCheck() {
    return this.key
      ? { ok: true, message: 'HCNSEC provider configured (OpenAI-compatible contract; live compatibility not verified)', model: this.model }
      : { ok: false, message: 'No HCNSEC API key provided (provider disabled)', model: this.model };
  }
}

