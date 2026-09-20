import { describe, expect, it } from 'vitest';
import type { FinalGateReport } from '../../types/compliance';
import {
  createPleadingDeliveryAuthorization,
  evaluatePleadingDelivery,
  isCourtPleadingToolCategory,
  verifyPleadingDeliveryAuthorization
} from './pleadingExportGate';
import { LEGAL_TOOL_TITLES } from '../legalToolTitles';

function readyReport(): FinalGateReport {
  return {
    status: 'READY',
    evaluatorVersion: '1.0.0',
    gateInputFingerprint: 'a'.repeat(64),
    blockers: [],
    auditItems: Array.from({ length: 20 }, (_, index) => ({
      id: `Q${String(index + 1).padStart(2, '0')}` as `Q${string}`,
      question: `Question ${index + 1}`,
      status: 'ANSWERED' as const,
      answer: index === 16 ? 'READY' : index === 17 ? false : true,
      evidence: ['test']
    })),
    complianceFindings: [],
    reviewerReport: {
      draftId: 'draft-1',
      caseInputId: 'case-1',
      ruleProfileId: 'profile-1',
      ruleProfileVersion: '1.0.0'
    } as FinalGateReport['reviewerReport'],
    independentReReviewReport: {} as FinalGateReport['independentReReviewReport'],
    exportPolicy: 'READY_ONLY'
  };
}

describe('P9 pleading export gate', () => {
  it.each([
    'JUDICIAL_CIVIL_TEMPLATE',
    'JUDICIAL_CRIMINAL_TEMPLATE',
    'JUDICIAL_ADMIN_TEMPLATE',
    'JUDICIAL_FAMILY_TEMPLATE',
    'JUDICIAL_EXECUTION_TEMPLATE',
    'CIVIL_COMPLAINT_GENERAL',
    'PAYMENT_ORDER_PETITION',
    'CRIMINAL_COMPLAINT_TRAFFIC',
    'SPOUSAL_RIGHT_INFRINGEMENT',
    'CRIMINAL_COMPLAINT',
    'CRIMINAL_COMPLAINT_FRAUD',
    'CRIMINAL_COMPLAINT_DEFAMATION',
    'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT',
    'CRIMINAL_COMPLAINT_THEFT',
    'CRIMINAL_COMPLAINT_ASSAULT',
    'CRIMINAL_COMPLAINT_INTIMIDATION',
    'CRIMINAL_COMPLAINT_PRIVACY',
    'CRIMINAL_SUPPLEMENTARY_CIVIL',
    'DOMESTIC_VIOLENCE_PROTECTION_ORDER',
    'CIVIL_TORT_SEXUAL_ASSAULT',
    'CIVIL_PET_DISPUTE',
    'CIVIL_TORT_GENERAL',
    'UNIVERSAL_AI_PLEADING',
    'WAIVER_OF_INHERITANCE',
    'GUARDIANSHIP_PETITION',
    'ASSISTANCE_PETITION',
    'PROMISSORY_NOTE_RULING',
    'EXECUTION_SALARY_ATTACHMENT',
    'EXECUTION_BANK_REAL_ESTATE'
    ,'PROVISIONAL_ATTACHMENT'
  ])('classifies %s as a court pleading without title heuristics', category => {
    expect(isCourtPleadingToolCategory(category)).toBe(true);
  });

  it('gates every legacy category whose canonical server title is a pleading', () => {
    const pleadingTitle = /(起訴狀|告訴狀|聲請狀)$/;
    const ungated = Object.entries(LEGAL_TOOL_TITLES)
      .filter(([, title]) => pleadingTitle.test(title.replace(/（.*$/, '')))
      .map(([category]) => category)
      .filter(category => !isCourtPleadingToolCategory(category));

    expect(ungated).toEqual([]);
  });

  it('blocks every delivery action when P9 authorization is missing', () => {
    for (const action of ['RETURN', 'COPY', 'DOWNLOAD_TEXT', 'DOWNLOAD_WORD', 'PRINT'] as const) {
      expect(evaluatePleadingDelivery('CIVIL_COMPLAINT_GENERAL', undefined, action)).toMatchObject({
        required: true,
        allowed: false,
        code: 'P9_FINAL_GATE_REQUIRED'
      });
    }
  });

  it('allows all delivery actions only after a complete READY P9 report', async () => {
    const authorization = await createPleadingDeliveryAuthorization(readyReport(), 'approved document');
    for (const action of authorization.authorizedActions) {
      expect((await verifyPleadingDeliveryAuthorization(
        'CIVIL_COMPLAINT_GENERAL', authorization, action, 'approved document'
      )).allowed).toBe(true);
    }
  });

  it.each([
    ['BLOCKED', 'NOT_EXPORTABLE'],
    ['BLOCKED_WITH_HUMAN_OVERRIDE', 'HUMAN_DEPLOY_REQUIRED_FOR_OVERRIDE']
  ] as const)('rejects %s reports', async (status, exportPolicy) => {
    const report = readyReport();
    report.status = status;
    report.exportPolicy = exportPolicy;
    await expect(createPleadingDeliveryAuthorization(report, 'document')).rejects.toThrow('not READY');
  });

  it('rejects READY reports with a missing audit answer or blocker', async () => {
    const unknownAudit = readyReport();
    unknownAudit.auditItems[4] = { ...unknownAudit.auditItems[4], status: 'UNKNOWN' };
    await expect(createPleadingDeliveryAuthorization(unknownAudit, 'document')).rejects.toThrow('not READY');

    const blocker = readyReport();
    blocker.blockers.push({
      id: 'TEST', fingerprint: 'fingerprint', source: 'AUDIT', status: 'UNKNOWN',
      message: 'blocked', overrideEligible: false
    });
    await expect(createPleadingDeliveryAuthorization(blocker, 'document')).rejects.toThrow('not READY');
  });

  it('rejects duplicate, extra, or status-inconsistent P9 audit answers', async () => {
    const duplicate = readyReport();
    duplicate.auditItems[19] = { ...duplicate.auditItems[0] };
    await expect(createPleadingDeliveryAuthorization(duplicate, 'document')).rejects.toThrow('not READY');

    const inconsistent = readyReport();
    inconsistent.auditItems[16] = { ...inconsistent.auditItems[16], answer: 'BLOCKED' };
    await expect(createPleadingDeliveryAuthorization(inconsistent, 'document')).rejects.toThrow('not READY');
  });

  it('rejects replay of a READY authorization against modified or different text', async () => {
    const authorization = await createPleadingDeliveryAuthorization(readyReport(), 'approved document');

    await expect(verifyPleadingDeliveryAuthorization(
      'CIVIL_COMPLAINT_GENERAL', authorization, 'RETURN', 'modified document'
    )).resolves.toMatchObject({ allowed: false, code: 'P9_FINAL_GATE_NOT_READY' });
  });

  it('does not require the pleading gate for an explicitly non-court document', () => {
    expect(evaluatePleadingDelivery('DEMAND_LETTER_GENERAL')).toMatchObject({
      required: false,
      allowed: true
    });
  });
});
