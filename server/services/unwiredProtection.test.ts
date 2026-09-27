// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

/**
 * 記錄「存在但未啟用」的防護程式碼。
 *
 * 實測：掃描未被使用的匯出，發現三處——
 *
 * 1. `server/services/circuitBreaker.ts` **整個檔案未被任何程式碼引用**。
 *    熔斷機制從未啟用：外部 AI／司法院／RAG 服務失敗時，
 *    沒有熔斷保護，只有 `withTransientRetry` 的重試。
 *
 * 2. `server/schemas/index.ts` 的 `validateBody` 與三個 Schema 未被引用。
 *    路由各自以 `precheckLegalInput`、`validateAgentChatInput` 做驗證，
 *    結構驗證（型別、長度）這一層並不存在。
 *    實測 10 萬字元的判決書全文會被接受並送往 AI（耗時 25.7 秒、消耗真實額度），
 *    目前僅由 1MB 的 body 限制與每 15 分鐘 300 次的速率限制兜底。
 *
 * 3. `requireTenantScope`（路由守衛中介層工廠）未被引用。
 *    這**不是**隔離缺口——`server/routes/sdlc.ts` 直接呼叫
 *    `verifyTenantOwnership` 並有 mass-assignment 防禦；
 *    未使用的只是便利包裝。
 *
 * 為什麼要記錄而不是直接刪除或接上：
 * 未啟用的防護程式碼比沒有更危險——它讓維護者以為那條路徑有保護。
 * 這個測試的用途是讓「目前沒有熔斷」成為可查證的事實，
 * 而不是默默留著一份看起來很有用的實作。
 */
const SERVER = path.resolve(__dirname, '..');

function 收集(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist'].includes(entry) || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) 收集(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

const 正式碼 = 收集(SERVER).filter(f => !f.includes('.test.') && !f.includes('.spec.'));

describe('未啟用的防護程式碼', () => {
  it('熔斷機制目前未接線——不得讓人以為已有熔斷保護', () => {
    const 被引用 = 正式碼.some(f =>
      f !== path.join(SERVER, 'services/circuitBreaker.ts') &&
      /circuitBreaker|executeWithResilience|judicialBreaker|aiBreaker|ragBreaker/.test(readFileSync(f, 'utf8'))
    );
    // 若此斷言失敗，代表熔斷機制已接線，應更新本說明並接上實際的測試
    expect(被引用, '熔斷機制已接線——請更新本說明並為其加上測試').toBe(false);
  });

  it('結構驗證 schema 目前未接線', () => {
    const 被引用 = 正式碼.some(f =>
      f !== path.join(SERVER, 'schemas/index.ts') &&
      /validateBody|AnalyzeJudgmentSchema|ToolboxGenerateSchema|SyllogismSchema/.test(readFileSync(f, 'utf8'))
    );
    expect(被引用, '結構驗證 schema 已接線——請更新本說明').toBe(false);
  });

  it('租戶隔離實際由路由直接強制，不依賴未使用的守衛工廠', () => {
    // 這一條是「有接線」的正向確認：確保隔離機制本身沒問題
    const sdlc = readFileSync(path.join(SERVER, 'routes/sdlc.ts'), 'utf8');
    expect(sdlc, 'SDLC 路由未強制租戶歸屬').toMatch(/verifyTenantOwnership/);
    expect(sdlc, 'SDLC 路由缺少 mass-assignment 防禦').toMatch(/Mass Assignment/);
  });

  it('請求主體大小與速率限制存在（熔斷缺席時的最後一道防線）', () => {
    const index = readFileSync(path.join(SERVER, 'index.ts'), 'utf8');
    expect(index, '未設定請求主體大小限制').toMatch(/express\.json\(\{\s*limit:/);
    const security = readFileSync(path.join(SERVER, 'middleware/security.ts'), 'utf8');
    expect(security, '未設定 API 速率限制').toMatch(/rateLimit\(/);
  });
});
