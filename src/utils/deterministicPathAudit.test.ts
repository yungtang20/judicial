import { describe, it, expect } from 'vitest';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';
import { hasDeterministicToolboxTemplate, buildFallbackToolboxResult } from '../utils/toolboxFallbacks';
import { verifyGeneratedDocument } from '../lib/generatedDocumentPipeline';
import { precheckLegalInput } from '../lib/legalInputPrecheck';

/**
 * 本機端到端驗證：模擬正式路由的確定性路徑。
 *
 * 正式站的路由是：確定性模板 → verifyGeneratedDocumentWithOfficialSources
 * → assertGeneratedDocumentVerified。本機沒有官方查核服務，因此這裡驗證
 * 「本機引用查核 + 輸入預檢」這一層能否通過，用來篩出仍然會被擋下的類別。
 */
describe('確定性路徑本機可通過性', () => {
  const SAMPLE: Record<string, Record<string, string>> = {
    DEMAND_LETTER_DEBT: { senderName: '王大明', recipientName: '李小華', amount: '600,000', reason: '借款屢催不還', senderAddress: '臺北市中山區', recipientAddress: '新北市中和區' },
    DEMAND_LETTER_RENT_DEFAULT: { senderName: '王大明', recipientName: '房東', amount: '100,000', reason: '租金欠繳', senderAddress: '臺北市', recipientAddress: '新北市' },
    PROMISSORY_NOTE: { creditorName: '王大明', debtorName: '李小華', debtAmount: '500,000', noteDate: '112年5月1日', noteDueDate: '112年11月1日', interestRate: '6' },
    COURT_FEE_CALCULATOR: { claimAmount: '500000' },
    SEVERANCE_PAY_CALCULATOR: { salary: '48000', yearsOfService: '5', hireDate: '108年1月1日' },
    STATUTE_LIMITATIONS_CALCULATOR: { claimType: 'contract', lastOnerousAct: '2020-01-01' },
    USED_CAR_SALE_CONTRACT: { sellerName: '王大明', buyerName: '李小華', vehiclePrice: '500000' },
    RESIDENTIAL_LEASE_CONTRACT: { landlordName: '王大明', tenantName: '李小華', monthlyRent: '25000', leaseAddress: '臺北市大安區' },
    DIVORCE_AGREEMENT: { husbandName: '王大明', wifeName: '李小華' },
    SELF_WRITTEN_WILL: { testatorName: '王大明' }
  };

  const covered = LEGAL_TOOLS.filter(tool => hasDeterministicToolboxTemplate(tool.id));

  it('工具箱中大多數書狀類別都有確定性模板', () => {
    expect(covered.length).toBeGreaterThanOrEqual(20);
  });

  it('逐項報告本機引用查核結果，找出仍會被擋下的類別', () => {
    const report: Array<{ id: string; ok: boolean; reason: string }> = [];
    for (const tool of covered) {
      const params = SAMPLE[tool.id] || { name: '王大明', amount: '100,000' };
      const precheck = precheckLegalInput(JSON.stringify(params));
      if (precheck.status === 'reject') {
        report.push({ id: tool.id, ok: false, reason: '輸入預檢擋下' });
        continue;
      }
      try {
        const out = buildFallbackToolboxResult(tool.id, params);
        if (!out.documentText || out.documentText.trim().length < 20) {
          report.push({ id: tool.id, ok: false, reason: '產出為空' });
          continue;
        }
        const v = verifyGeneratedDocument(out.documentText);
        const passed = v.antiGhostVerification.verificationPassed;
        report.push({
          id: tool.id,
          ok: passed,
          reason: passed
            ? `通過（檢核 ${v.antiGhostVerification.totalCitationsChecked} 處）`
            : `引用未驗證（幽靈 ${v.antiGhostVerification.ghostCitationsFound} 處，檢核 ${v.antiGhostVerification.totalCitationsChecked} 處）`
        });
      } catch (err) {
        report.push({ id: tool.id, ok: false, reason: `拋錯：${(err as Error).message.slice(0, 60)}` });
      }
    }
    const failing = report.filter(r => !r.ok);
    console.log('本機引用查核通過：', report.filter(r => r.ok).length, '/', report.length);
    for (const f of failing) console.log('  未通過', f.id, '-', f.reason);
    // 這條斷言刻意只要求「大多數」，因為部分類別的模板引用了
    // 本機 24 條種子以外的真實法條，需要官方查核升級才能通過，
    // 那屬於逐項修模板的範疇，不在此斷言。
    expect(report.filter(r => r.ok).length).toBeGreaterThanOrEqual(Math.floor(report.length * 0.6));
  });
});
