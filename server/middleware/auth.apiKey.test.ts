import { describe, expect, it, afterEach, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { authenticate } from './auth.js';
import { tenantScopeMiddleware } from './tenantScope.js';

const originalEnv = {
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  SYSTEM_API_KEY: process.env.SYSTEM_API_KEY,
  API_KEYS: process.env.API_KEYS,
};

function response() {
  return { status: () => response(), json: () => response() } as unknown as Response;
}

function authenticateWithApiKey(key: string, tenantHeader?: string) {
  const req = {
    method: 'GET',
    path: '/api/sdlc/project',
    headers: { 'x-api-key': key, ...(tenantHeader ? { 'x-tenant-id': tenantHeader } : {}) },
  } as unknown as Request;
  const res = response();
  const next = vi.fn();
  authenticate({ required: true })(req, res, next);
  tenantScopeMiddleware(req, res, next as NextFunction);
  return req;
}

describe('API key tenant authority', () => {
  afterEach(() => {
    if (originalEnv.ADMIN_API_KEY === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = originalEnv.ADMIN_API_KEY;
    if (originalEnv.SYSTEM_API_KEY === undefined) delete process.env.SYSTEM_API_KEY;
    else process.env.SYSTEM_API_KEY = originalEnv.SYSTEM_API_KEY;
    if (originalEnv.API_KEYS === undefined) delete process.env.API_KEYS;
    else process.env.API_KEYS = originalEnv.API_KEYS;
  });

  it('binds SYSTEM_API_KEY and API_KEYS to their issued tenant and ignores X-Tenant-Id', () => {
    process.env.SYSTEM_API_KEY = 'system-test-key';
    process.env.API_KEYS = 'default-test-key';
    delete process.env.ADMIN_API_KEY;

    const systemReq = authenticateWithApiKey('system-test-key', 'victim-tenant');
    expect(systemReq.user).toMatchObject({ role: 'system', tenantId: 'system-service-tenant', actorType: 'SYSTEM' });
    expect(systemReq.tenantContext).toMatchObject({ tenantId: 'system-service-tenant', isSystemAdmin: false });

    const defaultReq = authenticateWithApiKey('default-test-key', 'victim-tenant');
    expect(defaultReq.user).toMatchObject({ role: 'system', tenantId: 'default-tenant', actorType: 'SYSTEM' });
    expect(defaultReq.tenantContext).toMatchObject({ tenantId: 'default-tenant', isSystemAdmin: false });
  });

  it('keeps ADMIN_API_KEY as the explicit cross-tenant admin authority', () => {
    process.env.ADMIN_API_KEY = 'admin-test-key';
    delete process.env.SYSTEM_API_KEY;
    delete process.env.API_KEYS;

    const req = authenticateWithApiKey('admin-test-key');
    expect(req.user).toMatchObject({ role: 'admin', tenantId: 'system-admin-tenant', actorType: 'SYSTEM' });
    expect(req.tenantContext).toMatchObject({ isSystemAdmin: true });
  });
});
