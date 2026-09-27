// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

/**
 * 記錄「存在但未啟用」的防護程式碼，以及已啟用者的確認。
 *
 * 2026-09-27 更新：熔斷機制已接上 AI 生成路徑
 * （`legalGenerationPipeline.ts` 以 `executeWithResilience` + `aiBreaker` 包裹
 * `provider.generate`），並由 `circuitBreaker.test.ts` 的 13 項行為契約把關。
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
  it('熔斷機制已接上 AI 生成路徑', () => {
    const 被引用 = 正式碼.some(f =>
      f !== path.join(SERVER, 'services/circuitBreaker.ts') &&
      /circuitBreaker|executeWithResilience|aiBreaker/.test(readFileSync(f, 'utf8'))
    );
    expect(被引用, '熔斷機制已接線——若要移除，請先更新本說明').toBe(true);

    // 確認接線點確實包住 AI 生成呼叫，且不重複重試
    const pipeline = readFileSync(path.join(SERVER, 'services/legalGenerationPipeline.ts'), 'utf8');
    expect(pipeline, 'AI 生成未經熔斷保護').toMatch(/executeWithResilience\([\s\S]{0,300}provider\.generate/);
    expect(pipeline, '重試被重複執行（withTransientRetry 與熔斷器同時重試）')
      .toMatch(/maxRetries:\s*0/);
  });

  it('熔斷器本身有行為契約測試把關', () => {
    const 測試 = readFileSync(path.join(SERVER, 'services/circuitBreaker.test.ts'), 'utf8');
    expect(測試, '熔斷器缺少狀態機與執行器測試').toMatch(/CircuitBreaker 狀態機/);
    expect(測試, '熔斷器缺少 executeWithResilience 測試').toMatch(/executeWithResilience/);
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
