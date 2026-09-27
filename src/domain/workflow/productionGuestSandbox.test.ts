// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  AuthorizationPolicy,
  ROLE_PERMISSIONS,
  isGuestSandboxEnvironment,
  type ApprovalContext
} from './authorization';

/**
 * 正式環境的訪客沙盒必須維持 fail-closed。
 *
 * 修正背景：SDLC 交付工作台在正式站上恆為死路——訪客身分為 ANALYST，
 * 而 ANALYST 只有 READ／ANALYZE，無法 GENERATE，因此「AI 執行本階段交付」
 * 固定失敗。改以 ALLOW_GUEST_MODE 為沙盒判準後，正式環境的訪客可執行階段。
 *
 * 安全性不因此改變：SANDBOX 角色的權限清單結構上不含
 * APPROVE／DEPLOY／ADMIN。以下逐一驗證這個性質在正式環境下仍成立。
 */
const 正式訪客 = (): ApprovalContext => ({
  actorId: 'guest_test',
  actorType: 'HUMAN',
  role: 'SANDBOX',
  name: '訪客（沙盒訪客）',
  source: 'SANDBOX_GUEST_POLICY',
  timestamp: new Date().toISOString(),
  sandboxGrant: {
    scope: 'SDLC_SANDBOX',
    environment: 'PRODUCTION',
    grantedBy: 'ALLOW_GUEST_MODE_POLICY',
    guestSessionId: 'guest_test'
  }
});

describe('正式環境訪客沙盒的權限邊界', () => {
  it('SANDBOX 角色結構上不可能取得 APPROVE／DEPLOY／ADMIN', () => {
    const 權限 = ROLE_PERMISSIONS.SANDBOX;
    expect(權限).not.toContain('APPROVE');
    expect(權限).not.toContain('DEPLOY');
    expect(權限).not.toContain('ADMIN');
  });

  it('可執行階段交付所需的 GENERATE', () => {
    expect(ROLE_PERMISSIONS.SANDBOX).toContain('GENERATE');
  });

  it('正式環境的訪客不得執行 APPROVE／DEPLOY／ADMIN', () => {
    const ctx = 正式訪客();
    for (const 權限 of ['APPROVE', 'DEPLOY', 'ADMIN'] as const) {
      expect(() => AuthorizationPolicy.assertPermission(ctx, 權限, '訪客嘗試'))
        .toThrowError(/權限不足|AI Agent 嚴格禁止執行/);
    }
  });

  it('非 SDLC 階段門閥不得以沙盒核准放行', () => {
    const ctx = 正式訪客();
    // 沙盒核准僅限 SDLC 階段門閥；其他 Human Gate 仍須人工審批
    expect(() => AuthorizationPolicy.assertHumanGateApprover(ctx, 'P9 Final Gate'))
      .toThrowError();
  });

  it('AI 身分即使在正式環境也不得核准', () => {
    const ctx: ApprovalContext = { ...正式訪客(), actorType: 'AI' };
    expect(() => AuthorizationPolicy.assertHumanGateApprover(ctx, '01_plan Gate')).toThrowError();
  });

  it('未開啟訪客模式時，正式環境不進入沙盒', () => {
    expect(isGuestSandboxEnvironment({ REQUIRE_AUTH: 'true', NODE_ENV: 'production' })).toBe(false);
    expect(isGuestSandboxEnvironment({
      REQUIRE_AUTH: 'true', NODE_ENV: 'production', ALLOW_GUEST_MODE: 'false'
    })).toBe(false);
  });

  it('未啟用 REQUIRE_AUTH 時一律不進入沙盒', () => {
    expect(isGuestSandboxEnvironment({
      NODE_ENV: 'production', ALLOW_GUEST_MODE: 'true'
    })).toBe(false);
  });
});
