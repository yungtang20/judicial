import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

describe('OpenAI-compatible provider', () => {
  beforeEach(() => {
    delete process.env.HCNSEC_API_KEY;
    delete process.env.HCNSEC_BASE_URL;
    delete process.env.HCNSEC_MODEL;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.HCNSEC_API_KEY;
    delete process.env.HCNSEC_BASE_URL;
    delete process.env.HCNSEC_MODEL;
    vi.restoreAllMocks();
  });

  it('does not expose or call upstream without a key', async () => {
    const provider = new OpenAICompatibleProvider();
    await expect(provider.generate('test')).rejects.toThrow('HCNSEC_API_KEY_UNAVAILABLE');
  });

  it('normalizes an OpenAI-compatible chat response', async () => {
    process.env.HCNSEC_API_KEY = 'test-only-key';
    process.env.HCNSEC_BASE_URL = 'https://example.test/v1';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '分析結果' } }], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } }), { status: 200 }));
    const result = await new OpenAICompatibleProvider().generate('請分析');
    expect(result.text).toBe('分析結果');
    expect(result.usage?.totalTokens).toBe(5);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.test/v1/chat/completions');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe('DeepSeek-V4-Pro');
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).not.toContain('test-only-key');
  });

  it('prefers an explicitly configured HCNSEC model', async () => {
    process.env.HCNSEC_API_KEY = 'test-only-key';
    process.env.HCNSEC_MODEL = 'kimi-k3';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));

    await new OpenAICompatibleProvider().generate('test');

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe('kimi-k3');
  });

  it('parses structured JSON wrapped in a Markdown code fence', async () => {
    process.env.HCNSEC_API_KEY = 'test-only-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"value":"ok"}\n```' } }]
    }), { status: 200 }));

    await expect(new OpenAICompatibleProvider().generateStructured<{ value: string }>('test', {}))
      .resolves.toEqual({ value: 'ok' });
  });
});
