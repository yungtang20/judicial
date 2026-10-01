import { describe, it, expect } from 'vitest';
import { NARRATIVE_MAX_CHARS, DOCUMENT_MAX_CHARS, 檢查輸入長度 } from '../services/inputLengthGuard';

/**
 * 實測缺陷：/api/workflow/execute 完全沒有呼叫檢查輸入長度。
 * 送出 48,000 字（narrative 上限 20,000）仍回 200 並逕行分析，
 * 超長輸入會直接送進 AI 請求。
 *
 * 這與 analyzeJudgment.ts 檔內註解記載的同一類問題相同：
 * 「本檔先前已匯入檢查輸入長度卻從未呼叫，等於門檻形同虛設」。
 *
 * 統一入口是使用量最大的路徑，門檻不一致尤其明顯。
 */
describe('統一入口的輸入長度限制', () => {
  it('超過劇情上限會被擋下，且訊息說明如何處理', () => {
    const 超長 = '房東不退還押金。'.repeat(4000);
    expect(超長.length).toBeGreaterThan(NARRATIVE_MAX_CHARS);
    const r = 檢查輸入長度(超長, 'narrative');
    expect(r.通過).toBe(false);
    expect(r.訊息).toContain('案情描述過長');
    expect(r.訊息).toContain('不會自動截斷');
  });

  it('劇情在上限內會通過', () => {
    const r = 檢查輸入長度('房東不退還三萬元押金。'.repeat(100), 'narrative');
    expect(r.通過).toBe(true);
  });

  it('判決書用較寬的文件上限，不該被劇情上限擋下', () => {
    const 內容 = '判決書內容。'.repeat(4800); // 約 28,800 字
    expect(內容.length).toBeGreaterThan(NARRATIVE_MAX_CHARS);
    expect(內容.length).toBeLessThan(DOCUMENT_MAX_CHARS);
    expect(檢查輸入長度(內容, 'document').通過).toBe(true);
  });

  it('非字串輸入視為 0 字，不會讓流程爆掉', () => {
    expect(檢查輸入長度(undefined, 'narrative').通過).toBe(true);
    expect(檢查輸入長度(null, 'narrative').通過).toBe(true);
    expect(檢查輸入長度(123, 'narrative').通過).toBe(true);
  });
});
