import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function request(app: Express, path: string, init?: RequestInit): Promise<Response> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));

  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

describe('production security defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('enforces CSP instead of emitting a report-only header', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { securityHeaders } = await import('./security.js');
    const app = express();
    app.use(securityHeaders);
    app.get('/', (_req, res) => res.send('ok'));

    const response = await request(app, '/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('content-security-policy-report-only')).toBeNull();
  });

  it('rejects guest-token issuance unless production explicitly enables it', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_GUEST_MODE', 'false');
    vi.resetModules();
    const { default: guestAuthRouter } = await import('../routes/guestAuth.js');
    const app = express();
    app.use(guestAuthRouter);

    const response = await request(app, '/api/auth/guest', { method: 'POST' });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'GUEST_MODE_DISABLED_IN_PRODUCTION' });
  });

  it('issues an isolated signed guest token when production guest mode is explicitly enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_GUEST_MODE', 'true');
    vi.stubEnv('JWT_SECRET', 'test-only-guest-token-secret-with-sufficient-entropy-2026');
    vi.resetModules();
    const { default: guestAuthRouter } = await import('../routes/guestAuth.js');
    const { authenticate } = await import('./auth.js');
    const app = express();
    app.use(guestAuthRouter);
    app.use(authenticate());
    app.get('/protected', (req, res) => res.json({
      id: req.user?.id,
      tenantId: req.user?.tenantId,
      role: req.user?.role
    }));

    const guestResponse = await request(app, '/api/auth/guest', { method: 'POST' });
    expect(guestResponse.status).toBe(200);
    const guestBody = await guestResponse.json() as { token: string; expiresIn: number };
    expect(guestBody.token).toBeTruthy();
    expect(guestBody.expiresIn).toBe(60 * 60 * 4);

    const protectedResponse = await request(app, '/protected', {
      headers: { Authorization: `Bearer ${guestBody.token}` }
    });
    expect(protectedResponse.status).toBe(200);
    const protectedBody = await protectedResponse.json() as {
      id: string;
      tenantId: string;
      role: string;
    };
    expect(protectedBody.role).toBe('client');
    expect(protectedBody.id).toMatch(/^guest_/);
    expect(protectedBody.tenantId).toBe(protectedBody.id);
  });

  it('requires credentials in production even when REQUIRE_AUTH is false', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REQUIRE_AUTH', 'false');
    vi.resetModules();
    const { authenticate } = await import('./auth.js');
    const app = express();
    app.use(authenticate());
    app.post('/protected', (_req, res) => res.send('ok'));

    const response = await request(app, '/protected', { method: 'POST' });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
