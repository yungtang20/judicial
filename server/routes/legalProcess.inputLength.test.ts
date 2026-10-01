import { describe, it, expect } from 'vitest';
import { NARRATIVE_MAX_CHARS, 檢查輸入長度 } from '../services/inputLengthGuard';

/**
 * 實測缺陷：server/routes/legalProcess.ts 匯入了 檢查輸入長度
 * 卻從未呼叫，等於門檻形同虛設——與 analyzeJudgment.ts 檔內註解
 * 記載的同一類問題完全相同。
 *
 * /api/process/router、/api/process/question、/api/process/syllogism
 * 三個端點對 32,000 字（narrative 上限 20,000）都回 200 並觸發 AI 呼叫。
 */
describe('法律流程端點的輸入長度限制', () => {
  const 超長 = '房東不退還押金。'.repeat(4000); // 32,000 字

  it('三個端點使用的長度檢查都會擋下超長輸入', () => {
    expect(超長.length).toBeGreaterThan(NARRATIVE_MAX_CHARS);
    for (const 輸入 of [超長]) {
      const r = 檢查輸入長度(輸入, 'narrative');
      expect(r.通過).toBe(false);
      expect(r.字數).toBe(超長.length);
      expect(r.訊息).toContain('不會自動截斷');
    }
  });

  it('正常長度的案情不受影響', () => {
    const r = 檢查輸入長度('房東不退還三萬元押金，租約已到期。', 'narrative');
    expect(r.通過).toBe(true);
  });

  it('上界剛好通過、超過一個字即擋下', () => {
    expect(檢查輸入長度('一'.repeat(NARRATIVE_MAX_CHARS), 'narrative').通過).toBe(true);
    expect(檢查輸入長度('一'.repeat(NARRATIVE_MAX_CHARS + 1), 'narrative').通過).toBe(false);
  });
});

/**
 * /api/workflow/supplement 先前也沒有長度檢查：
 * 實測送出 32,000 字仍回 200 並觸發 AI 呼叫。
 * /api/workflow/suggest-field 則已有限制
 * （fieldLabel 100、toolName 100、incidentDetails 5000，註明是縮小提示詞注入空間）。
 */
describe('補充與工具箱端點的長度限制', () => {
  it('supplement 使用的檢查會擋下超長補充內容', () => {
    const r = 檢查輸入長度('上週已交還鑰匙並結清費用。'.repeat(3000), 'narrative');
    expect(r.通過).toBe(false);
    expect(r.訊息).toContain('案情描述過長');
  });

  it('工具箱的參數總量以加總判斷，不綁欄位名稱', () => {
    // 每個欄位都遠小於上限，但加總超過上限——逐一綁欄位名稱會漏掉這種
    const 欄位 = { a: '一'.repeat(9000), b: '二'.repeat(9000), c: '三'.repeat(9000) };
    const 總長 = Object.values(欄位).reduce((n: number, v: string) => n + v.length, 0);
    // 每個欄位都遠小於上限，加總才會超過——逐一綁欄位名稱會漏掉這種
    expect(Object.values(欄位).every(v => v.length < NARRATIVE_MAX_CHARS)).toBe(true);
    expect(總長).toBeGreaterThan(NARRATIVE_MAX_CHARS);
  });
});
