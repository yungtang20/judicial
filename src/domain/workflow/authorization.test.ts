import { describe, expect, it } from 'vitest';
import {
  AuthorizationPolicy,
  ApprovalContext,
  extractApprovalContextFromRequest,
  extractSandboxAwareApprovalContext,
  isGuestSandboxEnvironment,
  isGuestSandboxIdentity,
  isSandboxApprovalGrant,
  ROLE_PERMISSIONS
} from './authorization';
import { AppError } from './errors';

describe('AuthorizationPolicy & Role Permissions', () => {
  it('prohibits ANALYST from approving gates or deploying', () => {
    expect(AuthorizationPolicy.hasPermission('ANALYST', 'APPROVE')).toBe(false);
    expect(AuthorizationPolicy.hasPermission('ANALYST', 'DEPLOY')).toBe(false);
    expect(AuthorizationPolicy.hasPermission('ANALYST', 'READ')).toBe(true);

    const analystContext: ApprovalContext = {
      actorId: 'user_analyst_01',
      actorType: 'HUMAN',
      role: 'ANALYST',
      name: '初階法務助理',
      source: 'TEST',
      timestamp: new Date().toISOString()
    };

    expect(() => {
      AuthorizationPolicy.assertPermission(analystContext, 'APPROVE', '核准立項');
    }).toThrow(AppError);
  });

  it('prohibits GENERATOR from approving gates or deploying', () => {
    expect(AuthorizationPolicy.hasPermission('GENERATOR', 'APPROVE')).toBe(false);
    expect(AuthorizationPolicy.hasPermission('GENERATOR', 'DEPLOY')).toBe(false);
    expect(AuthorizationPolicy.hasPermission('GENERATOR', 'GENERATE')).toBe(true);

    const generatorContext: ApprovalContext = {
      actorId: 'user_generator_01',
      actorType: 'HUMAN',
      role: 'GENERATOR',
      name: '法務專員',
      source: 'TEST',
      timestamp: new Date().toISOString()
    };

    expect(() => {
      AuthorizationPolicy.assertPermission(generatorContext, 'APPROVE', '審批門閥');
    }).toThrow(AppError);

    expect(() => {
      AuthorizationPolicy.assertPermission(generatorContext, 'DEPLOY', '發布具狀');
    }).toThrow(AppError);
  });

  it('strictly forbids AI from executing APPROVE, DEPLOY, or ADMIN', () => {
    const aiContext: ApprovalContext = {
      actorId: 'gemini_agent_01',
      actorType: 'AI',
      role: 'ADMIN', // 即使被惡意偽造為 ADMIN 角色
      name: 'Gemini Autonomous Agent',
      source: 'AGENT_PROMPT',
      timestamp: new Date().toISOString()
    };

    expect(() => {
      AuthorizationPolicy.assertHumanGateApprover(aiContext, '立項門閥');
    }).toThrowError(/必須由人類審查員/);

    expect(() => {
      AuthorizationPolicy.assertPermission(aiContext, 'APPROVE', '審批門閥');
    }).toThrowError(/AI Agent 嚴格禁止執行/);

    expect(() => {
      AuthorizationPolicy.assertPermission(aiContext, 'DEPLOY', '發布具狀');
    }).toThrowError(/AI Agent 嚴格禁止執行/);
  });

  it('allows qualified HUMAN APPROVER to approve gates', () => {
    const approverContext: ApprovalContext = {
      actorId: 'lawyer_partner_01',
      actorType: 'HUMAN',
      role: 'APPROVER',
      name: '資深合夥律師',
      source: 'PORTAL',
      timestamp: new Date().toISOString()
    };

    expect(() => {
      AuthorizationPolicy.assertHumanGateApprover(approverContext, '01_plan Gate');
    }).not.toThrow();
  });

  it('allows higher privileged roles to satisfy stage contracts', () => {
    const approverContext: ApprovalContext = {
      actorId: 'lawyer_partner_01',
      actorType: 'HUMAN',
      role: 'APPROVER',
      name: '資深合夥律師',
      source: 'TEST',
      timestamp: new Date().toISOString()
    };
    const adminContext: ApprovalContext = { ...approverContext, role: 'ADMIN' };

    expect(() => AuthorizationPolicy.assertRoleForApproval(approverContext, 'APPROVER', '01_plan Gate')).not.toThrow();
    expect(() => AuthorizationPolicy.assertRoleForApproval(approverContext, 'DEPLOYER', '05_deploy Gate')).toThrowError(/要求角色 \[DEPLOYER\]/);
    expect(() => AuthorizationPolicy.assertRoleForApproval(adminContext, 'DEPLOYER', '05_deploy Gate')).not.toThrow();
  });
});

describe('Production Identity Boundary (extractApprovalContextFromRequest)', () => {
  it('rejects client supplied identity in production if missing trusted actor', () => {
    const req = {
      headers: {
        'x-actor-type': 'HUMAN',
        'x-user-role': 'ADMIN'
      }
    };
    
    expect(() => {
      extractApprovalContextFromRequest(req, true);
    }).toThrowError('Production 模式禁止使用 Client 提供的未經授權身分');
  });

  it('accepts trusted identity in production', () => {
    const req = {
      user: {
        id: 'trusted_01',
        type: 'HUMAN',
        role: 'APPROVER',
        name: 'Trust Auth'
      }
    };
    
    const ctx = extractApprovalContextFromRequest(req, true);
    expect(ctx.actorId).toBe('trusted_01');
    expect(ctx.actorType).toBe('HUMAN');
    expect(ctx.role).toBe('APPROVER');
    expect(ctx.source).toBe('TRUSTED_AUTH_PROVIDER');
  });

  it('maps lowercase HTTP roles to the canonical workflow role', () => {
    const lawyerContext = extractApprovalContextFromRequest({
      user: { id: 'lawyer_01', type: 'HUMAN', role: 'lawyer', name: '值班律師' }
    }, true);
    const systemContext = extractApprovalContextFromRequest({
      user: { id: 'system_01', type: 'SYSTEM', role: 'system', name: '排程服務' }
    }, true);

    expect(lawyerContext.actorType).toBe('HUMAN');
    expect(lawyerContext.role).toBe('APPROVER');
    expect(systemContext.actorType).toBe('SYSTEM');
    expect(systemContext.role).toBe('GENERATOR');
  });

  it('rejects a trusted actor without an explicit type', () => {
    expect(() => extractApprovalContextFromRequest({ user: { id: 'unknown_01', role: 'admin' } }, true))
      .toThrowError(/缺少可信 actor type/);
  });

  it('allows client supplied identity in development mode', () => {
    const req = {
      headers: {
        'x-actor-type': 'HUMAN',
        'x-user-role': 'ADMIN'
      },
      body: {
        decidedBy: 'Test Lawyer'
      }
    };
    
    const ctx = extractApprovalContextFromRequest(req, false);
    expect(ctx.actorType).toBe('HUMAN');
    expect(ctx.role).toBe('ADMIN');
    expect(ctx.name).toBe('Test Lawyer');
    expect(ctx.source).toBe('HTTP_API_DEV_MOCK');
  });
});

const SANDBOX_ENV: Record<string, string> = { REQUIRE_AUTH: 'true', NODE_ENV: 'test' };

function createSandboxContext(overrides: Partial<ApprovalContext> = {}): ApprovalContext {
  return {
    actorId: 'guest_sandbox_01',
    actorType: 'HUMAN',
    role: 'SANDBOX',
    name: 'Sandbox Guest（沙盒訪客）',
    source: 'SANDBOX_GUEST_POLICY',
    timestamp: '2026-01-01T00:00:00.000Z',
    sandboxGrant: {
      scope: 'SDLC_SANDBOX',
      environment: 'NON_PRODUCTION',
      grantedBy: 'REQUIRE_AUTH_SANDBOX_POLICY',
      guestSessionId: 'guest_sandbox_01'
    },
    ...overrides
  };
}

describe('Sandbox Role Permission Matrix (guest sandbox, non-production)', () => {
  it('grants execution permissions to the sandbox role but never APPROVE, DEPLOY or ADMIN', () => {
    const permissions = ROLE_PERMISSIONS.SANDBOX;

    expect(permissions).toContain('GENERATE');
    expect(permissions).toContain('VERIFY');
    expect(permissions).toContain('SANDBOX_APPROVE');
    expect(permissions).not.toContain('APPROVE');
    expect(permissions).not.toContain('DEPLOY');
    expect(permissions).not.toContain('ADMIN');
    expect(AuthorizationPolicy.hasPermission('SANDBOX', 'APPROVE')).toBe(false);
    expect(AuthorizationPolicy.hasPermission('SANDBOX', 'DEPLOY')).toBe(false);
    expect(AuthorizationPolicy.hasPermission('SANDBOX', 'ADMIN')).toBe(false);
  });

  it('denies explicit APPROVE, DEPLOY and ADMIN permission requests from the sandbox role', () => {
    const context = createSandboxContext();

    for (const permission of ['APPROVE', 'DEPLOY', 'ADMIN'] as const) {
      expect(() => AuthorizationPolicy.assertPermission(context, permission, `沙盒 ${permission}`))
        .toThrowError(/權限不足/);
    }
    expect(() => AuthorizationPolicy.assertPermission(context, 'GENERATE', '沙盒階段執行')).not.toThrow();
  });

  it('advances SDLC stage gates through the explicit sandbox approval path', () => {
    const context = createSandboxContext();

    expect(() => AuthorizationPolicy.assertHumanGateApprover(context, '階段門閥 01_plan')).not.toThrow();
    expect(() => AuthorizationPolicy.assertRoleForApproval(context, 'APPROVER', '階段門閥 01_plan')).not.toThrow();
  });

  it('never lets the sandbox approval path satisfy a deploy or admin stage gate', () => {
    const context = createSandboxContext();

    expect(() => AuthorizationPolicy.assertRoleForApproval(context, 'DEPLOYER', '階段門閥 05_deploy'))
      .toThrowError(/沙盒訪客身分僅供流程體驗/);
    expect(() => AuthorizationPolicy.assertRoleForApproval(context, 'ADMIN', '階段門閥 05_deploy'))
      .toThrowError(/沙盒訪客身分僅供流程體驗/);
  });

  it('does not extend sandbox approval to non-SDLC human gates', () => {
    const context = createSandboxContext();

    expect(() => AuthorizationPolicy.assertHumanGateApprover(context, 'P9 Final Gate Override'))
      .toThrowError(/必須由人類審查員|權限不足/);
  });

  it('fails closed when the sandbox role carries no valid grant or is driven by an AI actor', () => {
    expect(() => AuthorizationPolicy.assertHumanGateApprover(createSandboxContext({ sandboxGrant: undefined }), '階段門閥 01_plan'))
      .toThrowError(/權限不足/);
    expect(() => AuthorizationPolicy.assertHumanGateApprover(createSandboxContext({ actorType: 'AI' }), '階段門閥 01_plan'))
      .toThrowError(/必須由人類審查員/);
    expect(() => AuthorizationPolicy.assertRoleForApproval(createSandboxContext({ actorType: 'AI' }), 'APPROVER', '階段門閥 01_plan'))
      .toThrowError(/不得由非人類實體/);
  });

  it('rejects malformed sandbox grants', () => {
    expect(isSandboxApprovalGrant(undefined)).toBe(false);
    expect(isSandboxApprovalGrant({ ...createSandboxContext().sandboxGrant, environment: 'PRODUCTION' })).toBe(false);
    expect(isSandboxApprovalGrant({ ...createSandboxContext().sandboxGrant, grantedBy: 'CLIENT_HEADER' })).toBe(false);
    expect(isSandboxApprovalGrant(createSandboxContext().sandboxGrant)).toBe(true);
  });
});

describe('Sandbox Environment Detection & Context Extraction', () => {
  const guestRequest = {
    user: { id: 'guest_abc123', role: 'client', tenantId: 'guest_abc123', name: 'Sandbox Guest', actorType: 'HUMAN' },
    headers: { 'x-user-role': 'ADMIN' },
    body: { role: 'ADMIN' }
  };

  it('only treats REQUIRE_AUTH with a non-production runtime as the sandbox environment', () => {
    expect(isGuestSandboxEnvironment(SANDBOX_ENV)).toBe(true);
    expect(isGuestSandboxEnvironment({ REQUIRE_AUTH: 'true', NODE_ENV: 'production' })).toBe(false);
    expect(isGuestSandboxEnvironment({ REQUIRE_AUTH: 'false', NODE_ENV: 'test' })).toBe(false);
    expect(isGuestSandboxEnvironment({ NODE_ENV: 'test' })).toBe(false);
  });

  it('downgrades guest identities to the sandbox role and issues a sandbox grant', () => {
    const context = extractSandboxAwareApprovalContext(guestRequest, SANDBOX_ENV);

    expect(context.role).toBe('SANDBOX');
    expect(context.actorType).toBe('HUMAN');
    expect(context.actorId).toBe('guest_abc123');
    expect(context.source).toBe('SANDBOX_GUEST_POLICY');
    expect(context.name).toContain('沙盒訪客');
    expect(context.sandboxGrant).toEqual({
      scope: 'SDLC_SANDBOX',
      environment: 'NON_PRODUCTION',
      grantedBy: 'REQUIRE_AUTH_SANDBOX_POLICY',
      guestSessionId: 'guest_abc123'
    });
  });

  it('ignores client supplied role headers once trusted identity is required', () => {
    const context = extractSandboxAwareApprovalContext(guestRequest, SANDBOX_ENV);

    expect(context.role).not.toBe('ADMIN');
    expect(AuthorizationPolicy.hasPermission(context.role, 'ADMIN')).toBe(false);
  });

  it('keeps non-guest trusted identities at their own role inside the sandbox environment', () => {
    const context = extractSandboxAwareApprovalContext(
      { user: { id: 'lawyer_01', role: 'lawyer', tenantId: 'tenant_a', name: '值班律師', actorType: 'HUMAN' } },
      SANDBOX_ENV
    );

    expect(context.role).toBe('APPROVER');
    expect(context.sandboxGrant).toBeUndefined();
  });

  it('leaves production behaviour untouched and fail-closed', () => {
    const productionEnv: Record<string, string> = { REQUIRE_AUTH: 'true', NODE_ENV: 'production' };

    const context = extractSandboxAwareApprovalContext(guestRequest, productionEnv);
    expect(context.role).toBe('ANALYST');
    expect(context.sandboxGrant).toBeUndefined();

    expect(() => extractSandboxAwareApprovalContext({ headers: guestRequest.headers }, productionEnv))
      .toThrowError('Production 模式禁止使用 Client 提供的未經授權身分');
  });

  it('leaves the plain development mode branch untouched', () => {
    const context = extractSandboxAwareApprovalContext(
      { headers: { 'x-user-role': 'ADMIN' }, body: { decidedBy: 'Test Lawyer' } },
      { NODE_ENV: 'test' }
    );

    expect(context.role).toBe('ADMIN');
    expect(context.source).toBe('HTTP_API_DEV_MOCK');
    expect(context.sandboxGrant).toBeUndefined();
  });
});

describe('Guest Sandbox Identity Recognition', () => {
  it('accepts only lowest-privilege client identities inside a sandbox tenant boundary', () => {
    expect(isGuestSandboxIdentity({ id: 'guest_abc', role: 'client', tenantId: 'guest_abc' })).toBe(true);
    expect(isGuestSandboxIdentity({ id: 'guest_abc', role: 'client', tenantId: 'sandbox-tenant' })).toBe(true);
  });

  it('refuses privileged or unrelated identities', () => {
    expect(isGuestSandboxIdentity({ id: 'lawyer_01', role: 'lawyer', tenantId: 'tenant_a' })).toBe(false);
    expect(isGuestSandboxIdentity({ id: 'staff_01', role: 'admin', tenantId: 'tenant_a' })).toBe(false);
    expect(isGuestSandboxIdentity({ id: 'client_01', role: 'client', tenantId: 'tenant_a' })).toBe(false);
    expect(isGuestSandboxIdentity(undefined)).toBe(false);
  });
});
