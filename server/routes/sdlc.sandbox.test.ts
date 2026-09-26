import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockProvider } = vi.hoisted(() => ({
  mockProvider: {
    name: 'MockAIProvider',
    generate: async () => ({
      text: '按民法第184條第1項前段規定，侵權行為損害賠償請求權成立要件完備，本件事實清楚無疑。'
    }),
    generateStructured: async () => ({}),
    healthCheck: async () => ({ ok: true, message: 'Mock ready', model: 'mock-model' })
  }
}));

vi.mock('../../src/ai/providers/providerRegistry', () => ({ defaultAIProvider: mockProvider }));

import guestAuthRouter from './guestAuth.js';
import { sdlcRouter } from './sdlc.js';
import { authenticate } from '../middleware/auth.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.js';
import { defaultAuditLogger } from '../../src/domain/workflow/auditEvent';
import { defaultSdlcRepository } from '../../src/domain/workflow/repository';
import { SdlcStageId } from '../../src/domain/sdlc/types';

const SANDBOX_JWT_SECRET = 'sandbox-guest-route-test-secret-with-sufficient-entropy';

async function request(app: Express, path: string, init: RequestInit = {}): Promise<Response> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

/** REQUIRE_AUTH=true 且非 production：瀏覽器必須持 guest token，SDLC 走沙盒路徑 */
function createSandboxApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(guestAuthRouter);
  app.use(authenticate());
  app.use(tenantScopeMiddleware);
  app.use('/api/sdlc', sdlcRouter);
  return app;
}

async function issueGuestToken(app: Express): Promise<string> {
  const response = await request(app, '/api/auth/guest', { method: 'POST' });
  expect(response.status).toBe(200);
  const body = await response.json() as { token: string };
  return body.token;
}

function apiCall(token: string, payload: Record<string, unknown>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  };
}

describe('SDLC guest sandbox (REQUIRE_AUTH=true, non-production)', () => {
  let app: Express;
  let token: string;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('REQUIRE_AUTH', 'true');
    vi.stubEnv('JWT_SECRET', SANDBOX_JWT_SECRET);
    defaultSdlcRepository.clear();
    defaultAuditLogger.clear();
    app = createSandboxApp();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('executes an SDLC stage and advances the stage gate without PERMISSION_DENIED', async () => {
    token = await issueGuestToken(app);
    const projectId = 'sandbox_stage_run';

    const created = await request(app, '/api/sdlc/project', apiCall(token, { projectId, title: '沙盒測試案件' }));
    expect(created.status).toBe(200);

    const executed = await request(app, '/api/sdlc/execute-stage', apiCall(token, {
      projectId,
      stageId: '01_plan',
      humanInput: '確認委託人請求返還借款100萬'
    }));
    expect(executed.status).toBe(200);
    const executedBody = await executed.json() as { success: boolean; artifactContent: string };
    expect(executedBody.success).toBe(true);
    expect(executedBody.artifactContent).not.toBe('');

    const advanced = await request(app, '/api/sdlc/advance-gate', apiCall(token, {
      projectId,
      stageId: '01_plan',
      decisionNote: '沙盒體驗：同意進入設計階段'
    }));
    expect(advanced.status).toBe(200);
    const advancedBody = await advanced.json() as {
      project: { currentStageId: SdlcStageId; gates: Record<string, { passed: boolean; decidedBy: string }> };
    };
    expect(advancedBody.project.currentStageId).toBe('02_design');
    expect(advancedBody.project.gates['01_plan']?.passed).toBe(true);
    expect(advancedBody.project.gates['01_plan']?.decidedBy).toContain('沙盒訪客');
    expect(advancedBody.project.gates['01_plan']?.decidedBy).toContain('SANDBOX');
  });

  it('leaves an audit trail that marks the release as a sandbox approval, not a human sign-off', async () => {
    token = await issueGuestToken(app);
    const projectId = 'sandbox_audit_trail';

    await request(app, '/api/sdlc/project', apiCall(token, { projectId }));
    await request(app, '/api/sdlc/execute-stage', apiCall(token, { projectId, stageId: '01_plan', humanInput: '沙盒稽核測試' }));
    await request(app, '/api/sdlc/advance-gate', apiCall(token, { projectId, stageId: '01_plan' }));

    const sandboxEvents = defaultAuditLogger.getByWorkflow(projectId)
      .filter((event) => event.eventType === 'GATE_REQUESTED');

    expect(sandboxEvents.length).toBeGreaterThan(0);
    const [sandboxEvent] = sandboxEvents;
    expect(sandboxEvent?.metadata?.approvalPath).toBe('SANDBOX_GUEST');
    expect(sandboxEvent?.metadata?.sandboxGrant).toMatchObject({
      scope: 'SDLC_SANDBOX',
      environment: 'NON_PRODUCTION',
      grantedBy: 'REQUIRE_AUTH_SANDBOX_POLICY'
    });
    expect(sandboxEvent?.actorId).toMatch(/^guest_/);
  });

  it('still blocks the sandbox guest from the DEPLOYER level deploy gate', async () => {
    token = await issueGuestToken(app);
    const projectId = 'sandbox_deploy_blocked';

    await request(app, '/api/sdlc/project', apiCall(token, { projectId }));
    for (const stageId of ['01_plan', '02_design', '03_build', '04_test', '05_deploy'] as SdlcStageId[]) {
      const executed = await request(app, '/api/sdlc/execute-stage', apiCall(token, {
        projectId,
        stageId,
        humanInput: `沙盒階段 ${stageId}`
      }));
      expect(executed.status).toBe(200);

      const advanced = await request(app, '/api/sdlc/advance-gate', apiCall(token, { projectId, stageId }));
      if (stageId === '05_deploy') {
        expect(advanced.status).toBe(403);
        const rejected = await advanced.json() as { code: string };
        expect(rejected.code).toBe('PERMISSION_DENIED');
      } else {
        expect(advanced.status).toBe(200);
      }
    }

    const rejections = defaultAuditLogger.getByWorkflow(projectId)
      .filter((event) => event.eventType === 'GATE_REJECTED' && event.stageId === '05_deploy');
    expect(rejections.length).toBeGreaterThan(0);
    expect(rejections[0]?.metadata?.approvalPath).toBe('SANDBOX_GUEST');
    expect(rejections[0]?.metadata?.reason).toBe('PERMISSION_DENIED');
  });

  it('rejects requests without credentials instead of falling back to a privileged sandbox identity', async () => {
    const response = await request(app, '/api/sdlc/execute-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'sandbox_no_credential', stageId: '01_plan' })
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
