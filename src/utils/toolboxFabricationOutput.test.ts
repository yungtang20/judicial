import { describe, it, expect } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';

/**
 * 使用者未填寫任何資料時，產出的書狀不得包含捏造的案件事實。
 *
 * 實測：刑事告訴狀模板在未填資料時會產出
 * 「0912-345-678」「A123456789」「113年3月12日下午2時30分」
 * 與「致告訴人受有左側脛骨骨折及多處挫傷等傷害」等內容。
 * 這些會被律師直接提交法院。
 */
describe('未填資料時的書狀產出', () => {
  it('刑事車禍告訴狀不得出現捏造的電話、身分證、日期與受傷敘述', () => {
    const doc = buildFallbackToolboxResult('CRIMINAL_COMPLAINT_TRAFFIC', {}).documentText;
    expect(doc).not.toMatch(/0912-345-678/);
    expect(doc).not.toMatch(/A123456789/);
    expect(doc).not.toMatch(/113年3月12日/);
    expect(doc).not.toMatch(/脛骨骨折|多處挫傷/);
    // 未填寫之處應以明確的待填標記呈現，讓使用者知道要自行完成
    expect(doc).toContain('（待填寫）');
  });

  it('借據不得出現捏造的金額與到期日', () => {
    const doc = buildFallbackToolboxResult('IOU_PROMISSORY_NOTE_GENERATOR', {}).documentText;
    expect(doc).not.toMatch(/500,000/);
    expect(doc).not.toMatch(/民國113年12月31日/);
    expect(doc).toContain('（待填寫）');
  });

  it('使用者有填資料時必須優先採用使用者提供的內容', () => {
    const doc = buildFallbackToolboxResult('IOU_PROMISSORY_NOTE_GENERATOR', {
      creditorName: '王小明',
      debtorName: '李大華',
      loanAmount: '880,000',
      repaymentDate: '民國115年6月30日'
    }).documentText;
    expect(doc).toContain('王小明');
    expect(doc).toContain('李大華');
    expect(doc).toContain('880,000');
    expect(doc).not.toContain('（待填寫）');
  });

  it('角色標籤仍保留，不因修正而消失', () => {
    const doc = buildFallbackToolboxResult('CRIMINAL_COMPLAINT_TRAFFIC', {}).documentText;
    expect(doc).toContain('告訴人');
    expect(doc).toContain('被告');
  });
});
