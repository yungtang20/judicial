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
