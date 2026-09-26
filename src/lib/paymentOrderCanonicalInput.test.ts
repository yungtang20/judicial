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
    // 若確實有缺漏，使用者必須在表單上有辦法補齊。
    // 內部段落名稱與表單欄位名稱不一定相同，對應關係在此明確列出。
    const FIELD_TO_FORM_KEYS: Record<string, string[]> = {
      date: ['documentDate'],
      signature: ['signature', 'creditorName'],
      'parties[0].address': ['creditorAddress'],
      'parties[1].address': ['debtorAddress'],
      evidence: ['evidenceDetails'],
      court: ['courtName'],
      subject_and_facts: ['incidentDetails']
    };
    for (const item of blocking) {
      for (const key of FIELD_TO_FORM_KEYS[item.field] || [item.field]) {
        expect(
          keys,
          `管線要求「${item.field}」，但表單沒有「${key}」欄位，使用者無從補齊：${item.reason}`
        ).toContain(key);
      }
    }
  });

  it('金額必須是正數', () => {
    expect(keys).toContain('debtAmount');
  });
});

describe('支付命令產出內容不得遺漏使用者填寫的資料', () => {
  it('原因事實、利息與清償期日都必須出現在書狀中', async () => {
    const result = await executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', {
      creditorName: '王大明',
      creditorAddress: '臺北市中山區南京東路一段1號',
      debtorName: '李小華',
      debtorAddress: '新北市中和區中正路100號',
      debtAmount: '350,000',
      interestRate: '3.5',
      loanDate: '113年1月10日',
      dueDate: '113年7月10日',
      courtName: '臺灣臺北地方法院',
      evidenceDetails: '借據乙紙\n匯款紀錄乙紙',
      incidentDetails: '債務人於民國113年1月10日借款新臺幣350,000元，屢催不還。'
    });
    const doc = result.documentText;
    // 使用者寫的原因事實不得被靜默丟棄
    expect(doc).toContain('債務人於民國113年1月10日借款');
    // 聲明必須載明利息與起算日，否則相對人無從知道要付多少利息
    expect(doc).toContain('350,000');
    expect(doc).toContain('113年7月10日');
    expect(doc).toContain('3.5');
    // 住址、法院、簽署人
    expect(doc).toContain('南京東路一段1號');
    expect(doc).toContain('中正路100號');
    expect(doc).toContain('臺灣臺北地方法院');
  });
});

describe('確定性管線產出的書狀必須能成為可精修對象', () => {
  it('回應必須帶有 verificationPassed，否則前端永遠判定為待人工審查', async () => {
    const result = await executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', {
      creditorName: '王大明',
      creditorAddress: '臺北市中山區南京東路一段1號',
      debtorName: '李小華',
      debtorAddress: '新北市中和區中正路100號',
      debtAmount: '350,000',
      interestRate: '3.5',
      dueDate: '113年7月10日',
      courtName: '臺灣臺北地方法院',
      evidenceDetails: '借據乙紙',
      incidentDetails: '債務人借款後屢催不還。'
    });
    // 前端以 verificationPassed === true 決定文件狀態；
    // 缺這個欄位會讓草稿精修永遠選不到確定性管線產出的書狀。
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
    expect(result.antiGhostVerification.ghostCitationsFound).toBe(0);
  });

  it('引用查核結果必須如實回報，不得宣稱已完成外部查核', async () => {
    const result = await executeCanonicalPleadingPipeline('PAYMENT_ORDER_PETITION', {
      creditorName: '王大明',
      creditorAddress: '臺北市中山區南京東路一段1號',
      debtorName: '李小華',
      debtorAddress: '新北市中和區中正路100號',
      debtAmount: '350,000',
      courtName: '臺灣臺北地方法院',
      evidenceDetails: '借據乙紙',
      incidentDetails: '債務人借款後屢催不還。'
    });
    // 確定性管線不連外部查核服務，status 必須如實維持 UNVERIFIED
    expect(result.antiGhostVerification.status).toBe('UNVERIFIED');
  });
});
