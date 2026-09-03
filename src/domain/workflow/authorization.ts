/**
 * Permission & Authorization Policy
 * 嚴格定義角色、權限與審批身分上下文 (ApprovalContext)，杜絕前端偽造與 AI 越權
 */

import { AppError } from './errors';

export type Permission =
  | 'READ'
  | 'ANALYZE'
  | 'GENERATE'
  | 'VERIFY'
  | 'APPROVE'
  | 'DEPLOY'
  | 'ADMIN';

export type Role =
  | 'ANALYST'
  | 'GENERATOR'
  | 'VERIFIER'
  | 'APPROVER'
  | 'DEPLOYER'
  | 'ADMIN';

export type ActorType = 'HUMAN' | 'AI' | 'SYSTEM';

export interface ApprovalContext {
  actorId: string;
  actorType: ActorType;
  role: Role;
  name: string;
  source: string;
  timestamp: string;
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ANALYST: ['READ', 'ANALYZE'],
  GENERATOR: ['READ', 'ANALYZE', 'GENERATE'],
  VERIFIER: ['READ', 'ANALYZE', 'VERIFY'],
  APPROVER: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'APPROVE'],
  DEPLOYER: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'APPROVE', 'DEPLOY'],
  ADMIN: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'APPROVE', 'DEPLOY', 'ADMIN']
};

export class AuthorizationPolicy {
  public static hasPermission(role: Role, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  public static assertPermission(
    context: ApprovalContext,
    requiredPermission: Permission,
    actionDescription: string
  ): void {
    // 規則 1：AI 不得執行 APPROVE, DEPLOY, ADMIN
    if (context.actorType === 'AI') {
      if (['APPROVE', 'DEPLOY', 'ADMIN'].includes(requiredPermission)) {
        throw new AppError(
          'AI_GATE_APPROVAL_FORBIDDEN',
          `權限拒絕：AI Agent 嚴格禁止執行 [${requiredPermission}] 操作（${actionDescription}）。`,
          403,
          { actorId: context.actorId, actorType: context.actorType, requiredPermission }
        );
      }
    }

    // 規則 2：角色權限檢查
    const permissions = ROLE_PERMISSIONS[context.role] || [];
    if (!permissions.includes(requiredPermission)) {
      throw new AppError(
        'PERMISSION_DENIED',
        `權限不足：角色 [${context.role}] 無權執行 [${requiredPermission}]（${actionDescription}）。`,
        403,
        {
          actorId: context.actorId,
          role: context.role,
          requiredPermission,
          availablePermissions: permissions
        }
      );
    }
  }

  public static assertHumanGateApprover(context: ApprovalContext, gateName: string): void {
    if (context.actorType !== 'HUMAN') {
      throw new AppError(
        'AI_GATE_APPROVAL_FORBIDDEN',
        `Human Gate 審批拒絕：[${gateName}] 必須由人類審查員（執業律師或當事人）簽核，檢測到非法實體型態 [${context.actorType}]。`,
        403,
        { actorId: context.actorId, actorType: context.actorType }
      );
    }

    this.assertPermission(context, 'APPROVE', `審批門閥 ${gateName}`);
  }
}

/**
 * 建立 AuthenticatedActorContext 的明確界線
 * @param req Express Request object (any)
 * @param isProd 是否為 Production 環境
 */
export function extractApprovalContextFromRequest(req: any, isProd: boolean): ApprovalContext {
  // Production 模式：禁止信任 Client 自報之 header 與 body
  if (isProd) {
    // 假設未來會有真正的 Auth Middleware 注入 req.user
    const trustedActor = req.user;
    if (!trustedActor) {
      throw new AppError(
        'UNAUTHORIZED_ACTOR',
        'Production 模式禁止使用 Client 提供的未經授權身分。缺少 Trusted Identity。',
        401
      );
    }
    
    return {
      actorId: trustedActor.id,
      actorType: trustedActor.type as ActorType,
      role: trustedActor.role as Role,
      name: trustedActor.name || 'Unknown',
      source: 'TRUSTED_AUTH_PROVIDER',
      timestamp: new Date().toISOString()
    };
  }

  // Development 模式：允許測試身份注入
  const actorId = (req.headers && req.headers['x-actor-id']) || (req.body && req.body.actorId) || 'user_client_default';
  const actorType = ((req.headers && req.headers['x-actor-type']) || (req.body && req.body.actorType) || 'HUMAN') as ActorType;
  const role = ((req.headers && req.headers['x-user-role']) || (req.body && req.body.role) || 'APPROVER') as Role;
  const name = (req.body && req.body.decidedBy) || (req.body && req.body.userName) || '測試用律師 (Dev Mode)';

  return {
    actorId,
    actorType,
    role,
    name,
    source: 'HTTP_API_DEV_MOCK',
    timestamp: new Date().toISOString()
  };
}
