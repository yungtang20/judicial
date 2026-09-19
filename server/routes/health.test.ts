import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import http from 'node:http';
import { performance } from 'node:perf_hooks';

vi.mock('../../src/ai/providers/providerRegistry.js', () => ({
  defaultAIProvider: {
    healthCheck: vi.fn().mockResolvedValue({ ok: true, message: 'local test provider', model: 'mock' }),
    generate: vi.fn(() => { throw new Error('Unexpected generation during health test'); }),
    generateStructured: vi.fn(() => { throw new Error('Unexpected generation during health test'); }),
  },
}));

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    const current = server;
    server = undefined;
    current.closeAllConnections();
    await new Promise<void>((resolve, reject) => current.close(error => error ? reject(error) : resolve()));
  }
  vi.unstubAllEnvs();
  vi.resetModules();
});

function get(server: Server, path: string): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    const req = http.get({ hostname: '127.0.0.1', port: addr.port, path, timeout: 3000 }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

describe('health endpoint bounded local load', () => {
  it('serves 200 requests with 10 workers without errors or application quota consumption', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'local-load-test-only-secret-not-for-production-2026');
    vi.stubEnv('AUDIT_DB_PATH', ':memory:');
    vi.stubEnv('AUDIT_PERSISTENCE_REQUIRED', 'false');
    vi.stubEnv('TRUST_PROXY', 'false');
    vi.resetModules();
    const { createExpressApp } = await import('../index.js');
    server = createExpressApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    const durations: number[] = [];
    const statuses: number[] = [];
    const started = performance.now();
    await Promise.all(Array.from({ length: 10 }, async () => {
      for (let index = 0; index < 20; index++) {
        const start = performance.now();
        const response = await get(server!, '/api/health');
        durations.push(performance.now() - start);
        statuses.push(response.status);
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'HEALTHY',
          aiProvider: { ok: true, model: 'mock' },
          auditPersistence: { durable: false },
        });
        expect(response.headers['ratelimit-remaining']).toBeUndefined();
      }
    }));
    const elapsedMs = performance.now() - started;
    durations.sort((a, b) => a - b);
    expect(statuses).toHaveLength(200);
    expect(elapsedMs).toBeLessThan(30000);
    console.info(JSON.stringify({
      test: 'local-health-load', requests: statuses.length, concurrency: 10,
      errors: statuses.filter(status => status !== 200).length,
      elapsedMs: Math.round(elapsedMs),
      requestsPerSecond: Math.round(statuses.length * 1000 / elapsedMs),
      p50Ms: Math.round(durations[99]), p95Ms: Math.round(durations[189]),
      maxMs: Math.round(durations[199]), provider: 'mock', storage: ':memory:',
    }));
  }, 30000);
});
