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
