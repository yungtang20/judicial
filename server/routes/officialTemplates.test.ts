import type { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';
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

  it('reports downloaded catalog state without losing official source counts', async () => {
    const response = await request('/api/official-templates');
    const body = await response.json() as { totalTemplates: number; categories: Array<{ total: number; needsFieldMapping: number; downloaded: number; sourceLinks: number }> };

    expect(response.status).toBe(200);
    expect(body.totalTemplates).toBe(685);
    expect(body.categories.reduce((sum, category) => sum + category.sourceLinks, 0)).toBe(685);
    expect(body.categories.reduce((sum, category) => sum + category.needsFieldMapping, 0)).toBe(655);
    expect(body.categories.reduce((sum, category) => sum + category.downloaded, 0)).toBe(30);
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

    expect(blocked.status).toBe(409);
    await expect(blocked.json()).resolves.toMatchObject({ code: 'P9_FINAL_GATE_REQUIRED' });
  });

  it('downloads only the unchanged hash-verified official source', async () => {
    const unauthorized = await request('/api/official-templates/judicial-0202-1/source');
    expect(unauthorized.status).toBe(401);

    const token = createSignedToken({ sub: 'test-user', tenantId: 'test-tenant', role: 'client' });
    const response = await request('/api/official-templates/judicial-0202-1/source', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const source = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/vnd.oasis.opendocument.text');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="judicial-0202-1.odt"');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(createHash('sha256').update(source).digest('hex')).toBe('c7978050ee139dc1df6e3ffac932ee393d8f48e9fc4ac9163885678f670e2d5e');
  });

  it('serves a downloaded PDF with the correct immutable source hash', async () => {
    const token = createSignedToken({ sub: 'test-user', tenantId: 'test-tenant', role: 'client' });
    const response = await request('/api/official-templates/judicial-0199-117/source', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const source = Buffer.from(await response.arrayBuffer());
    const detail = await request('/api/official-templates/judicial-0199-117');
    const metadata = await detail.json() as { localFileHash: string };

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="judicial-0199-117.pdf"');
    expect(createHash('sha256').update(source).digest('hex')).toBe(metadata.localFileHash);
  });

  it('does not expose a source file for an unknown template id', async () => {
    const token = createSignedToken({ sub: 'test-user', tenantId: 'test-tenant', role: 'client' });
    const response = await request('/api/official-templates/not-a-template/source', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: 'TEMPLATE_NOT_FOUND' });
  });
});
