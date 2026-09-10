import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgnesProvider } from './AgnesProvider';
import { createConfiguredAIProvider } from './providerRegistry';

describe('Agnes provider', () => {
  beforeEach(() => {
    delete process.env.AGNES_API_KEY;
    delete process.env.AGNES_BASE_URL;
    delete process.env.AGNES_MODEL;
    delete process.env.AI_PROVIDER;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.AGNES_API_KEY;
    delete process.env.AGNES_BASE_URL;
    delete process.env.AGNES_MODEL;
    delete process.env.AI_PROVIDER;
    vi.restoreAllMocks();
  });

  it('fails closed when the server-side API key is unavailable', async () => {
    await expect(new AgnesProvider().generate('test')).rejects.toThrow('AGNES_API_KEY_UNAVAILABLE');
  });

  it('is selected by the provider registry', () => {
    process.env.AI_PROVIDER = 'agnes';
    expect(createConfiguredAIProvider()).toBeInstanceOf(AgnesProvider);
  });

  it('uses the documented Agnes endpoint and default text model', async () => {
    process.env.AGNES_API_KEY = 'test-only-key';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '分析結果' } }],
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
    }), { status: 200 }));

    const result = await new AgnesProvider().generate('請分析');

    expect(result.text).toBe('分析結果');
    expect(result.usage?.totalTokens).toBe(5);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://apihub.agnes-ai.com/v1/chat/completions');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe('agnes-3.0-flash');
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).not.toContain('test-only-key');
  });

  it('accepts an explicitly configured Agnes model', async () => {
    process.env.AGNES_API_KEY = 'test-only-key';
    process.env.AGNES_MODEL = 'agnes-2.5-pro';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'ok' } }]
    }), { status: 200 }));

    await new AgnesProvider().generate('test');

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe('agnes-2.5-pro');
  });
});
