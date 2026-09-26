import { describe, it, expect } from 'vitest';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';
import { buildFallbackToolboxResult } from '../utils/toolboxFallbacks';

/**
 * 支付命令聲請狀的欄位與產出必須一致。
 *
 * 實測發現：欄位標籤為「利息起算日」但實際綁定 interestRate（週年利率），
 * 產生器更完全忽略該值並寫死「週年利率百分之五」；loanDate 與 dueDate
 * 雖被產生器引用，卻不在表單欄位中，使用者無從填寫。
 * 結果是產出的書狀含有使用者從未提供的利率與日期。
 */
describe('支付命令聲請狀欄位與產出一致性', () => {
  const schema = TOOL_FIELD_SCHEMAS.PAYMENT_ORDER_PETITION;
  const keys = schema.map(f => f.key);

  it('利率欄位標籤與其綁定的 key 一致', () => {
    const rate = schema.find(f => f.key === 'interestRate');
    expect(rate).toBeDefined();
    expect(rate!.label).toContain('利率');
    expect(rate!.label).not.toContain('起算日');
  });

  it('產生器引用的日期欄位都在表單中', () => {
    // 產生器會用到 loanDate 與 dueDate，使用者必須有機會填寫
    expect(keys).toContain('loanDate');
    expect(keys).toContain('dueDate');
  });

  it('產出的書狀採用使用者填寫的利率', () => {
    const doc = buildFallbackToolboxResult('PAYMENT_ORDER_PETITION', {
      creditorName: '甲', debtorName: '乙', debtAmount: '120,000',
      interestRate: '3.5', loanDate: '113年1月10日', dueDate: '113年7月10日'
    }).documentText;
    expect(doc).toContain('百分之3.5');
    expect(doc).not.toContain('百分之五');
  });

  it('產出的書狀採用使用者填寫的日期', () => {
    const doc = buildFallbackToolboxResult('PAYMENT_ORDER_PETITION', {
      creditorName: '甲', debtorName: '乙', debtAmount: '120,000',
      interestRate: '3.5', loanDate: '113年1月10日', dueDate: '113年7月10日'
    }).documentText;
    expect(doc).toContain('113年1月10日');
    expect(doc).toContain('113年7月10日');
  });

  it('利息起算點與書狀自身敘述一致（已到期則自清償期日起算）', () => {
    const doc = buildFallbackToolboxResult('PAYMENT_ORDER_PETITION', {
      creditorName: '甲', debtorName: '乙', debtAmount: '120,000',
      interestRate: '3.5', loanDate: '113年1月10日', dueDate: '113年7月10日'
    }).documentText;
    // 原模板寫「自支付命令送達翌日起」，與第二段「清償期屆至後屢次催告」矛盾
    expect(doc).toContain('自民國 113年7月10日 起至清償日止');
    expect(doc).not.toContain('支付命令送達翌日起');
  });
});
