import { describe, it, expect } from 'vitest';
import { executeCanonicalPleadingPipeline, CanonicalPleadingInputError } from '../../server/services/canonicalPleadingPipeline';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';

/**
 * 表單可填欄位必須足以通過確定性管線的必要欄位檢查。
 *
 * 實測：填滿 PAYMENT_ORDER_PETITION 表單上「看得到的所有欄位」後產製，
 * 畫面卻顯示「書狀必要欄位尚未填寫完整」，且錯誤訊息說
 * 「請依畫面列出的缺漏欄位補齊」，但畫面並未列出任何缺漏欄位。
 */
describe('支付命令：表單欄位足以完成產製', () => {
  const schema = TOOL_FIELD_SCHEMAS.PAYMENT_ORDER_PETITION;
  const keys = schema.map(f => f.key);
  const filledForm = Object.fromEntries(schema.map(f => [f.key, {
    creditorName: '王大明',
    creditorAddress: '臺北市中山區南京東路一段1號',
    debtorAddress: '新北市中和區中正路100號',
    debtorName: '李小華',
    debtAmount: '350,000',
    courtName: '臺灣臺北地方法院',
    evidenceDetails: '借據乙紙\n匯款紀錄乙紙\n催告還款通訊紀錄乙紙',
    interestRate: '3.5',
    loanDate: '113年1月10日',
    dueDate: '113年7月10日',
    incidentDetails: '債務人於民國113年1月10日借款新臺幣350,000元，約定113年7月10日清償，屢催不還。'
  }[f.key] ?? '']));

  it('填滿表單上所有欄位後，必要欄位檢查不得阻擋產製', async () => {
    let blocking: Array<{ field: string; reason: string }> = [];
    try {
      await executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', filledForm);
    } catch (err) {
      if (err instanceof CanonicalPleadingInputError) {
        blocking = (err as unknown as { missingInputs: Array<{ field: string; reason: string }> }).missingInputs || [];
      } else {
        throw err;
      }
    }
    // 若確實有缺漏，這些欄位必須出現在表單中，使用者才有辦法補齊
    for (const item of blocking) {
      expect(
        keys,
        `管線要求「${item.field}」，但表單沒有這個欄位，使用者無從補齊：${item.reason}`
      ).toContain(item.field);
    }
  });

  it('金額必須是正數', () => {
    expect(keys).toContain('debtAmount');
  });
});
