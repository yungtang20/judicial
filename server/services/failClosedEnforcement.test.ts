import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * fail-closed 保證必須真的在中央管線強制執行，而不是只寫在註解裡。
 *
 * 實測：`server/routes/appeal.ts` 曾保留一行註解宣稱
 * 「verifyGeneratedDocument 與三段論法由 defaultLegalGenerationPipeline 集中強制」，
 * 但同一個檔案把 `verifyGeneratedDocument` 匯入了卻從未使用。
 *
 * 註解會隨著程式碼演進而失效，**宣稱不等於事實**。
 * 這裡把該宣稱轉為可驗證的對象，並順帶防止「用註解代替檢查」的情形。
 *
 * 與先前「防護測試存在不等於防護有效」是同一個道理。
 */
const SERVER = path.resolve(__dirname, '..', '..', 'server');

describe('文件驗證必須在中央管線強制執行', () => {
  const 管線 = readFileSync(path.join(SERVER, 'services/legalGenerationPipeline.ts'), 'utf8');

  it('管線必須實際呼叫文件驗證', () => {
    expect(管線, '中央管線未引用 verifyGeneratedDocument')
      .toMatch(/verifyGeneratedDocument/);
  });

  it('管線必須實際呼叫 fail-closed 斷言', () => {
    // 必須先剝除註解再比對：管線第 231 行的說明註解本身就寫著
    // 「assertGeneratedDocumentVerified (Verify & Fail-Closed)」，
    // 不剝除會把註解誤認為實際呼叫——這正是本專案反覆清理的那類盲點。
    const 程式碼 = 管線
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
    const 有呼叫 = /(?:const|let|var)\s+\w+\s*=\s*assertGeneratedDocumentVerified\s*\(/.test(程式碼)
      || /return\s+assertGeneratedDocumentVerified\s*\(/.test(程式碼)
      || /await\s+assertGeneratedDocumentVerified\s*\(/.test(程式碼);
    expect(有呼叫, '中央管線未實際呼叫 assertGeneratedDocumentVerified，產生結果可能未經檢核即交付').toBe(true);
  });

  it('管線必須匯出官方來源驗證能力', () => {
    expect(管線).toMatch(/verifyGeneratedDocumentWithOfficialSources/);
  });

  it('路由不得以註解代替實際的驗證呼叫', () => {
    // 先前 appeal.ts 匯入了 verifyGeneratedDocument 卻從未使用，
    // 只留一行註解宣稱驗證由中央管線負責。
    const 路由檔 = ['routes/appeal.ts', 'routes/defense.ts', 'routes/unifiedWorkflow.ts'];
    for (const 檔 of 路由檔) {
      const src = readFileSync(path.join(SERVER, 檔), 'utf8');
      // 匯入了卻只出現一次（僅在 import 敘述中），即代表從未使用
      const 出現次數 = (src.match(/verifyGeneratedDocument/g) || []).length;
      const 匯入了但未使用 = /import\s*\{[^}]*verifyGeneratedDocument/.test(src) && 出現次數 === 1;
      expect(匯入了但未使用, `${檔} 匯入了 verifyGeneratedDocument 卻未使用——應移除匯入或實際呼叫`).toBe(false);
    }
  });

  it('路由不得保留帶捏造預設值的死碼解構', () => {
    // defense.ts 曾帶著假案號、假法院、假當事人姓名作為未使用的預設值。
    // 雖因該路徑恆回 409 而未流入輸出，但等同在法律工具中埋下陷阱。
    const src = readFileSync(path.join(SERVER, 'routes/defense.ts'), 'utf8');
    const 解構區塊 = src.slice(src.indexOf('/api/defense/generate-pleading'));
    const 帶預設 = /caseNo\s*[:=]\s*['"][^'"]*\d{3}年度/.test(解構區塊)
      || /opponentName\s*[:=]\s*['"][^'"]+['"]/.test(解構區塊);
    expect(帶預設, 'generate-pleading 路由仍保留捏造的案件預設值').toBe(false);
  });
});
