import { describe, expect, it } from 'vitest';
import { AuthorizationPolicy, ApprovalContext, extractApprovalContextFromRequest } from './authorization';
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
