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
  | 'ADMIN'
  // 沙盒核准：僅授予 REQUIRE_AUTH=true 且非 production 之 guest 沙盒訪客，
  // 用於讓沙盒體驗流程得以推進 SDLC 階段門閥；絕不等同人工審批，且不得據以執行上線或系統管理。
  | 'SANDBOX_APPROVE';

export type Role =
  | 'ANALYST'
  | 'GENERATOR'
  | 'VERIFIER'
  | 'APPROVER'
  | 'DEPLOYER'
  | 'ADMIN'
  // 沙盒角色：僅存在於非 production 之 REQUIRE_AUTH 沙盒環境，恆不含 APPROVE / DEPLOY / ADMIN
  | 'SANDBOX';

export type ActorType = 'HUMAN' | 'AI' | 'SYSTEM';

/** SDLC 階段門閥名稱前綴（sdlcOrchestrator.ts 建立 Human Gate 錯誤訊息時使用） */
export const SDLC_STAGE_GATE_NAME_PREFIX = '階段門閥 ';

/** 沙盒訪客永遠不得滿足之門閥要求角色（正式上線與系統管理授權） */
const SANDBOX_FORBIDDEN_APPROVAL_ROLES: Role[] = ['DEPLOYER', 'ADMIN'];

const HTTP_ROLE_TO_WORKFLOW_ROLE: Record<string, Role> = {
  admin: 'ADMIN',
  deployer: 'DEPLOYER',
  lawyer: 'APPROVER',
  paralegal: 'GENERATOR',
  client: 'ANALYST',
  sandbox: 'SANDBOX',
  system: 'GENERATOR',
  ANALYST: 'ANALYST',
  GENERATOR: 'GENERATOR',
  VERIFIER: 'VERIFIER',
  APPROVER: 'APPROVER',
  DEPLOYER: 'DEPLOYER',
  ADMIN: 'ADMIN',
  SANDBOX: 'SANDBOX',
};

/**
 * 沙盒核准授予書 (Sandbox Approval Grant)
 * 僅由伺服器端於 REQUIRE_AUTH=true 且非 production 之 guest 沙盒環境主動簽發，
 * 明確記載本次核准走的是「沙盒核准」路徑而非人工審批。
 */
export interface SandboxApprovalGrant {
  scope: 'SDLC_SANDBOX';
  /**
   * 授予沙盒的環境。
   * 正式環境亦可能授予（當管理者明確設定 ALLOW_GUEST_MODE=true），
   * 因為安全性由角色權限結構保證，而非由環境判斷保證。
   */
  environment: 'NON_PRODUCTION' | 'PRODUCTION';
  grantedBy: 'REQUIRE_AUTH_SANDBOX_POLICY' | 'ALLOW_GUEST_MODE_POLICY';
  guestSessionId: string;
}

/** 具名型別守衛：僅接受完整且合法的沙盒核准授予書 */
export function isSandboxApprovalGrant(value: unknown): value is SandboxApprovalGrant {
  if (!isStringRecord(value)) return false;
  if (value['scope'] !== 'SDLC_SANDBOX') return false;
  if (typeof value['guestSessionId'] !== 'string') return false;

  // 環境與授予來源必須成對：正式環境只可能由 ALLOW_GUEST_MODE 政策授予，
  // 非正式環境只可能由 REQUIRE_AUTH 沙盒政策授予。
  // 逐項獨立接受會讓偽造者得以把任意一項換掉而不被察覺。
  const 環境 = value['environment'];
  const 授予來源 = value['grantedBy'];
  if (環境 === 'PRODUCTION') {
    return 授予來源 === 'ALLOW_GUEST_MODE_POLICY';
  }
  if (環境 === 'NON_PRODUCTION') {
    return 授予來源 === 'REQUIRE_AUTH_SANDBOX_POLICY';
  }
  return false;
}

/** 具名型別守衛：僅接受一般物件（排除 null 與陣列） */
function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 辨識 guest 沙盒訪客身分
 * 條件同時成立才算數：角色必須為最低權限的 client，且使用者代碼為 guest 前綴、
 * 租戶為固定沙盒租戶，或租戶與使用者代碼相同（guest token 簽發時即採此隔離邊界）。
 */
export function isGuestSandboxIdentity(identity: unknown): boolean {
  if (!isStringRecord(identity)) return false;
  if (identity['role'] !== 'client') return false;
  const id = typeof identity['id'] === 'string' ? identity['id'] : '';
  const tenantId = typeof identity['tenantId'] === 'string' ? identity['tenantId'] : '';
  return id.startsWith('guest_') || tenantId === 'sandbox-tenant' || (tenantId.length > 0 && tenantId === id);
}

/** 沙盒核准是否適用於指定門閥：僅限 SDLC 階段門閥，其他 Human Gate（如 P9 Final Gate）不受影響 */
function isSandboxApprovableGate(context: ApprovalContext, gateName: string): boolean {
  return context.role === 'SANDBOX'
    && context.actorType === 'HUMAN'
    && gateName.startsWith(SDLC_STAGE_GATE_NAME_PREFIX)
    && isSandboxApprovalGrant(context.sandboxGrant);
}


function mapRoleToWorkflowRole(value: unknown): Role {
  if (typeof value !== 'string' || !HTTP_ROLE_TO_WORKFLOW_ROLE[value]) {
    throw new AppError('UNAUTHORIZED_ACTOR', `未知的身份角色：${String(value)}`, 401);
  }
  return HTTP_ROLE_TO_WORKFLOW_ROLE[value];
}

function resolveTrustedActorType(trustedActor: { actorType?: unknown; type?: unknown; role?: unknown }): ActorType {
  const explicitType = trustedActor.actorType || trustedActor.type;
  if (explicitType === 'HUMAN' || explicitType === 'AI' || explicitType === 'SYSTEM') {
    return explicitType;
  }
  throw new AppError('UNAUTHORIZED_ACTOR', '缺少可信 actor type，拒絕建立 ApprovalContext。', 401);
}


export interface ApprovalContext {
  actorId: string;
  actorType: ActorType;
  role: Role;
  name: string;
  source: string;
  timestamp: string;
  /**
   * 沙盒核准授予書；僅由伺服器端沙盒政策簽發，AI 身分或 production 環境永不持有。
   * 沙盒核准不等同人工審批，故不得據以取得 APPROVE / DEPLOY / ADMIN。
   */
  sandboxGrant?: SandboxApprovalGrant;
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ANALYST: ['READ', 'ANALYZE'],
  GENERATOR: ['READ', 'ANALYZE', 'GENERATE'],
  VERIFIER: ['READ', 'ANALYZE', 'VERIFY'],
  APPROVER: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'APPROVE'],
  DEPLOYER: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'APPROVE', 'DEPLOY'],
  ADMIN: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'APPROVE', 'DEPLOY', 'ADMIN'],
  // 沙盒角色恆不含 APPROVE / DEPLOY / ADMIN，僅具備流程執行與沙盒核准所需之權限
  SANDBOX: ['READ', 'ANALYZE', 'GENERATE', 'VERIFY', 'SANDBOX_APPROVE']
};
const ROLE_RANK: Record<Role, number> = {
  ANALYST: 0,
  GENERATOR: 1,
  VERIFIER: 1,
  APPROVER: 2,
  DEPLOYER: 3,
  ADMIN: 4,
  SANDBOX: 1
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
    // 沙盒核准路徑：僅限 REQUIRE_AUTH=true 且非 production 之 guest 沙盒訪客，且僅限 SDLC 階段門閥。
    // 此路徑核發的是 SANDBOX_APPROVE 而非 APPROVE，故不構成人工審批，稽核紀錄須明確標示為沙盒核准。
    if (isSandboxApprovableGate(context, gateName)) {
      this.assertPermission(context, 'SANDBOX_APPROVE', `沙盒核准階段門閥 ${gateName}`);
      return;
    }

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
  public static assertRoleForApproval(context: ApprovalContext, requiredRole: Role, gateName: string): void {
    if (context.role === 'SANDBOX' && isSandboxApprovalGrant(context.sandboxGrant)) {
      if (context.actorType !== 'HUMAN') {
        throw new AppError(
          'AI_GATE_APPROVAL_FORBIDDEN',
          `沙盒核准拒絕：[${gateName}] 不得由非人類實體 [${context.actorType}] 執行。`,
          403,
          { actorId: context.actorId, actorType: context.actorType }
        );
      }
      if (SANDBOX_FORBIDDEN_APPROVAL_ROLES.includes(requiredRole)) {
        throw new AppError(
          'PERMISSION_DENIED',
          `權限拒絕：門閥 [${gateName}] 要求角色 [${requiredRole}]，沙盒訪客身分僅供流程體驗，嚴禁執行正式上線或系統管理授權。`,
          403,
          { actorId: context.actorId, role: context.role, requiredRole, gateName, approvalPath: 'SANDBOX_GUEST' }
        );
      }
      return;
    }

    if (ROLE_RANK[context.role] < ROLE_RANK[requiredRole]) {
      throw new AppError(
        'PERMISSION_DENIED',
        `權限拒絕：門閥 [${gateName}] 要求角色 [${requiredRole}]，目前角色為 [${context.role}]。`,
        403,
        { actorId: context.actorId, role: context.role, requiredRole, gateName }
      );
    }
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
      actorType: resolveTrustedActorType(trustedActor),
      role: mapRoleToWorkflowRole(trustedActor.role),
      name: trustedActor.name || 'Unknown',
      source: 'TRUSTED_AUTH_PROVIDER',
      timestamp: new Date().toISOString()
    };
  }

  // Development 模式：允許測試身份注入
  const actorId = (req.headers && req.headers['x-actor-id']) || (req.body && req.body.actorId) || 'user_client_default';
  const actorTypeValue = (req.headers && req.headers['x-actor-type']) || (req.body && req.body.actorType) || 'HUMAN';
  const actorType: ActorType = actorTypeValue === 'AI' || actorTypeValue === 'SYSTEM' ? actorTypeValue : 'HUMAN';
  const role = mapRoleToWorkflowRole((req.headers && req.headers['x-user-role']) || (req.body && req.body.role) || 'APPROVER');
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

/**
 * 沙盒環境判定：REQUIRE_AUTH=true 且非 production
 * 此為唯一允許簽發沙盒核准授予書的環境；production 一律 fail-closed，不存在沙盒路徑。
 */
export function isGuestSandboxEnvironment(env: Record<string, string | undefined> = process.env): boolean {
  if (env['REQUIRE_AUTH'] !== 'true') return false;

  // 非正式環境維持原行為。
  if (env['NODE_ENV'] !== 'production') return true;

  // 正式環境：先前一律視為非沙盒，結果是正式站上每個訪客的
  // SDLC 交付工作台都是死的——「AI 執行本階段交付」固定回報
  // 「角色 [ANALYST] 無權執行 [GENERATE]」，而 ANALYST 只有 READ/ANALYZE。
  // 首頁卻仍把它列為主要功能。
  //
  // 安全性不由此環境判斷保證，而由角色權限結構保證：
  // SANDBOX 的權限清單為 READ/ANALYZE/GENERATE/VERIFY/SANDBOX_APPROVE，
  // 結構上不可能取得 APPROVE / DEPLOY / ADMIN；且沙盒核准還需
  // actorType=HUMAN、SDLC 階段門閥前綴與有效的 sandboxGrant 才成立。
  // 稽核紀錄亦以 approvalPath=SANDBOX_GUEST 明確區隔於人工審批。
  //
  // 因此以「管理者是否明確開啟訪客模式」為判準：
  // 未設定 ALLOW_GUEST_MODE 時 /api/auth/guest 會回 403，
  // 訪客根本拿不到權杖，此路徑不可達——fail-closed 仍然成立。
  return env['ALLOW_GUEST_MODE'] === 'true';
}

/**
 * 建立具沙盒感知之 ApprovalContext
 *
 * 邊界說明：
 * - production：行為完全不變，僅採信任身分（fail-closed）。
 * - 未啟用 REQUIRE_AUTH 之開發模式：行為完全不變，沿用可注入測試身分之開發分支。
 * - REQUIRE_AUTH=true 且非 production（沙盒）：強制採信任身分（不得信任 client 自報之角色標頭），
 *   並將 guest 訪客降級為 SANDBOX 角色 + 沙盒核准授予書，使其可合法執行 SDLC 階段與推進階段門閥，
 *   但恆無法取得 APPROVE / DEPLOY / ADMIN；非 guest 身分（如律師、服務帳號）維持原角色不變。
 */
export function extractSandboxAwareApprovalContext(
  req: unknown,
  env: Record<string, string | undefined> = process.env
): ApprovalContext {
  const isProduction = env['NODE_ENV'] === 'production';
  const requireTrustedIdentity = isProduction || env['REQUIRE_AUTH'] === 'true';
  const context = extractApprovalContextFromRequest(req, requireTrustedIdentity);

  if (!isGuestSandboxEnvironment(env)) return context;

  const trustedIdentity = isStringRecord(req) ? req['user'] : undefined;
  if (!isStringRecord(trustedIdentity) || !isGuestSandboxIdentity(trustedIdentity)) return context;

  const guestSessionId = typeof trustedIdentity['id'] === 'string' ? trustedIdentity['id'] : context.actorId;

  return {
    ...context,
    role: 'SANDBOX',
    name: `${context.name}（沙盒訪客）`,
    source: 'SANDBOX_GUEST_POLICY',
    sandboxGrant: {
      scope: 'SDLC_SANDBOX',
      environment: env['NODE_ENV'] === 'production' ? 'PRODUCTION' : 'NON_PRODUCTION',
      grantedBy: env['NODE_ENV'] === 'production' ? 'ALLOW_GUEST_MODE_POLICY' : 'REQUIRE_AUTH_SANDBOX_POLICY',
      guestSessionId
    }
  };
}
