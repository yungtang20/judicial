import { describe, expect, it } from 'vitest';
import { executeCanonicalPleadingPipeline } from './canonicalPleadingPipeline.js';
import { getCourtPleadingConfig } from '../../src/lib/rules/courtPleadingRuleProfiles.js';

describe('Canonical Pleading Pipeline Integration Tests', () => {
  describe('CRIMINAL_COMPLAINT_SEXUAL_ASSAULT (性侵害告訴狀)', () => {
    it('provides correct court configuration with privacy protection', () => {
      const config = getCourtPleadingConfig('CRIMINAL_COMPLAINT_SEXUAL_ASSAULT');
      expect(config).not.toBeNull();
      expect(config?.documentTitle).toBe('刑事告訴狀（妨害性自主）');
      expect(config?.caseType).toBe('criminal');
      expect(config?.pleadingType).toBe('complaint');
      expect(config?.styleProfile).toBe('criminal_complaint');
      expect(config?.claimantRole).toBe('告訴人（代號保護）');
      expect(config?.respondentRole).toBe('被告');
      expect(config?.proceeding).toBe('妨害性自主告訴案件');

      const refFiles = config?.legalReferences.map(r => r.sourceReference);
      expect(refFiles).toContain('legal_references/criminal_procedure_242.md');
      expect(refFiles).toContain('legal_references/sexual_assault_prevention_12.md');
      expect(refFiles).toContain('legal_references/criminal_law_221.md');
    });

    it('successfully executes P4-P9 pipeline and enforces residence privacy', async () => {
      const result = await executeCanonicalPleadingPipeline('CRIMINAL_COMPLAINT_SEXUAL_ASSAULT', {
        courtName: '臺灣臺北地方檢察署',
        defendantName: '張大明',
        defendantAddress: '臺北市中正區重慶南路一段1號',
        facts: '被告於民國113年於不詳地點，涉嫌違反告訴人意願強制性交得逞。',
        evidenceDetails: '受理各類性侵害案件驗傷診斷書、通訊對話紀錄截圖'
      });

      // 檢查書狀標題與授權 Token
      expect(result.documentTitle).toContain('刑事告訴狀（妨害性自主）');
      expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
      expect(result.pleadingDeliveryAuthorization.exportPolicy).toBe('READY_ONLY');
      expect(result.pleadingDeliveryAuthorization.authorizedActions).toContain('DOWNLOAD_TEXT');

      // 檢查隱私防護：書狀內含代號與密封文字，絕不洩漏被害人真實住址
      expect(result.documentText).toContain('告訴人（代號保護）');
      expect(result.documentText).toContain('代號年籍詳卷附身分保密對照表（依法密封）');
      expect(result.documentText).not.toContain('（實際住居所依法留存檢察署身分密封袋');

      // 檢查法源與檢查清單
      const sources = result.legalSources.map(s => s.sourceReference);
      expect(sources).toContain('legal_references/sexual_assault_prevention_12.md');
      expect(sources).toContain('legal_references/criminal_law_221.md');

      // 檢查合規清單全數通過
      const failedChecks = result.complianceChecklist.filter(c => !c.passed);
      expect(failedChecks).toHaveLength(0);
    });
  });

  describe('CRIMINAL_SUPPLEMENTARY_CIVIL (刑事附帶民事訴訟起訴狀)', () => {
    it('provides correct configuration with civil quasi-procedure rules', () => {
      const config = getCourtPleadingConfig('CRIMINAL_SUPPLEMENTARY_CIVIL');
      expect(config).not.toBeNull();
      expect(config?.documentTitle).toBe('刑事附帶民事訴訟起訴狀');
      expect(config?.caseType).toBe('civil');
      expect(config?.pleadingType).toBe('complaint');
      expect(config?.styleProfile).toBe('civil_complaint');
      expect(config?.claimantRole).toBe('原告（刑事被害人）');
      expect(config?.respondentRole).toBe('被告（刑事被告）');

      const refFiles = config?.legalReferences.map(r => r.sourceReference);
      expect(refFiles).toContain('legal_references/civil_procedure_116.md');
      expect(refFiles).toContain('legal_references/civil_procedure_117.md');
      expect(refFiles).toContain('legal_references/criminal_procedure_487.md');
      expect(refFiles).toContain('legal_references/criminal_procedure_492.md');
    });

    it('successfully executes P4-P9 pipeline for supplementary civil complaint', async () => {
      const result = await executeCanonicalPleadingPipeline('CRIMINAL_SUPPLEMENTARY_CIVIL', {
        courtName: '臺灣臺北地方法院刑事庭',
        plaintiffName: '李小美',
        defendantName: '王大同',
        claimAmount: '500000',
        facts: '被告因傷害案件業經起訴，原告受有醫療費用及精神慰撫金之損害。',
        evidenceDetails: '診斷證明書、醫療收據影本'
      });

      expect(result.documentTitle).toContain('刑事附帶民事訴訟起訴狀');
      expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
      expect(result.pleadingDeliveryAuthorization.exportPolicy).toBe('READY_ONLY');
      expect(result.pleadingDeliveryAuthorization.authorizedActions).toContain('DOWNLOAD_TEXT');
      expect(result.documentText).toContain('原告（刑事被害人）');
      expect(result.documentText).toContain('被告（刑事被告）');
      expect(result.documentText).toContain('500000');

      const sources = result.legalSources.map(s => s.sourceReference);
      expect(sources).toContain('legal_references/criminal_procedure_487.md');
      expect(sources).toContain('legal_references/criminal_procedure_492.md');

      const failedChecks = result.complianceChecklist.filter(c => !c.passed);
      expect(failedChecks).toHaveLength(0);
    });
  });

  describe('SPOUSAL_RIGHT_INFRINGEMENT (侵害配偶權起訴狀)', () => {
    it('successfully executes P4-P9 pipeline using standard civil pleading profile', async () => {
      const result = await executeCanonicalPleadingPipeline('SPOUSAL_RIGHT_INFRINGEMENT', {
        courtName: '臺灣臺北地方法院',
        plaintiffName: '王小華',
        defendantName: '陳大文',
        claimAmount: '600000',
        facts: '被告明知原告配偶為有婦之夫，仍多次相約幽會發生不當交往行為，共同侵害原告基於配偶關係之身分法益。',
        evidenceDetails: '通訊軟體對話紀錄、出遊照片影本'
      });

      expect(result.documentTitle).toContain('民事起訴狀（侵害配偶權損害賠償）');
      expect(result.pleadingDeliveryAuthorization.finalGateStatus).toBe('READY');
      expect(result.pleadingDeliveryAuthorization.exportPolicy).toBe('READY_ONLY');
      expect(result.documentText).toContain('原告');
      expect(result.documentText).toContain('被告');
      expect(result.documentText).toContain('600000');

      const blockingChecks = result.complianceChecklist.filter(c => !c.passed && c.rule.includes('REQUIRED'));
      expect(blockingChecks).toHaveLength(0);
    });
  });

  describe('Fail-Closed Boundary (未支援類別明確拒絕)', () => {
    it.each([
      'JUDICIAL_ADMIN_TEMPLATE',
      'JUDICIAL_EXECUTION_TEMPLATE'
    ])('explicitly refuses unsupported category %s with Fail-Closed error', async (categoryKey) => {
      await expect(
        executeCanonicalPleadingPipeline(categoryKey, {})
      ).rejects.toThrow(`此類別（${categoryKey}）尚未支援 P4-P9 確定性管線`);
    });
  });
});
