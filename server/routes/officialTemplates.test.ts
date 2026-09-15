import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createExpressApp } from '../index';
import { createSignedToken } from '../middleware/auth';

async function request(path: string, init?: RequestInit): Promise<Response> {
  const server = createExpressApp().listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

describe('official template routes', () => {
  afterEach(() => {
    delete process.env.REQUIRE_AUTH;
  });

  it('lists the official manifest without exposing local paths', async () => {
    const response = await request('/api/official-templates?category=%E5%88%91%E4%BA%8B');
    const body = await response.json() as { templates: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.templates.length).toBeGreaterThan(0);
    expect(body.templates[0]).not.toHaveProperty('localFilePath');
  });

  it('requires authentication and fails closed on incomplete field mapping', async () => {
    const unauthorized = await request('/api/official-templates/judicial-0202-1/render', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} }),
    });
    expect(unauthorized.status).toBe(401);

    const token = createSignedToken({ sub: 'test-user', tenantId: 'test-tenant', role: 'client' });
    const blocked = await request('/api/official-templates/judicial-0202-1/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields: {
        caseNumber: '113年度訴字第123號', defendantName: '測試', gender: '男', defenseFacts: '測試答辯',
      } }),
    });

    expect(blocked.status).toBe(422);
    await expect(blocked.json()).resolves.toMatchObject({ code: 'TEMPLATE_MAPPING_INCOMPLETE' });
  });
});
