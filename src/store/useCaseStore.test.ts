import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveCase, useCaseStore } from './useCaseStore';
import { decryptCaseContext, encryptCaseContext } from '../domain/case/persistence';

describe('useCaseStore', () => {
  beforeEach(() => {
    useCaseStore.setState({
      activeCaseId: 'active-case',
      cases: {
        'active-case': {
          schemaVersion: 1,
          caseId: 'active-case',
          workflowStage: 'INGEST',
          facts: '',
          issues: [],
          evidences: [],
          candidateCitations: [],
          deadlines: [],
          documents: [],
          updatedAt: new Date(0).toISOString()
        }
      }
    });
  });

  it('keeps retrieved citations fail-closed until full text is read', () => {
    const citation = { id: 'rag-1', type: '裁判', citation: '最高法院112年度台上字第9號', summary: '', applicationReason: '', selected: true, sourceProvider: 'tw-legal-rag' as const, sourceStatus: 'RETRIEVED_UNREAD' as const, sourceId: 'rag-1' };
    useCaseStore.getState().saveRetrievedCitations([citation]);
    expect(getActiveCase(useCaseStore.getState()).candidateCitations[0]?.sourceStatus).toBe('RETRIEVED_UNREAD');
    useCaseStore.getState().markCitationFulltextRead('rag-1', 'https://example.test/rag-1');
    expect(getActiveCase(useCaseStore.getState()).candidateCitations[0]?.sourceStatus).toBe('FULLTEXT_READ');
  });

  it('encrypts and decrypts a case export with a passphrase', async () => {
    const context = getActiveCase(useCaseStore.getState());
    const payload = await encryptCaseContext(context, 'correct horse battery');
    const restored = await decryptCaseContext(payload, 'correct horse battery');
    expect(restored.caseId).toBe(context.caseId);
    await expect(decryptCaseContext(payload, 'wrong passphrase')).rejects.toThrow();
  });

  it('shares triage, analysis and generated artifacts through one active case', () => {
    const issue = { id: 'i1', title: '爭點', originalHolding: '原審', appealArgument: '指摘' };
    const evidence = { id: 'e1', code: '1', relatedIssue: '爭點', investigationItem: '調查', investigationTarget: '證人', targetAddress: '詳卷', provenFact: '待證事實' };
    const citation = { id: 'c1', type: '判決', citation: '最高法院112年度台上字第1號', summary: '要旨', applicationReason: '適用', selected: true };

    useCaseStore.getState().saveTriage('去識別案件事實', { caseType: 'CIVIL', recommendedToolId: 'CIVIL_TORT_GENERAL' });
    useCaseStore.getState().saveAnalysis({ judgmentSummary: '摘要' }, { facts: '裁判事實', caseType: 'CIVIL', issues: [issue], evidences: [evidence], citations: [citation] });
    useCaseStore.getState().saveRetrievedCitations([{ ...citation, sourceProvider: 'tw-legal-rag', sourceStatus: 'RETRIEVED_UNREAD' }]);
    useCaseStore.getState().addDocument({ id: 'doc1', kind: 'APPEAL_PETITION', title: '上訴理由狀', text: '文件', status: 'VERIFIED', sourceTool: 'test', createdAt: new Date().toISOString() });

    const active = getActiveCase(useCaseStore.getState());
    expect(active.facts).toBe('裁判事實');
    expect(active.issues).toEqual([issue]);
    expect(active.evidences).toEqual([evidence]);
    expect(active.candidateCitations[0]?.sourceStatus).toBe('RETRIEVED_UNREAD');
    expect(active.documents).toHaveLength(1);
    expect(active.workflowStage).toBe('VERIFIED');

    useCaseStore.getState().markCitationFulltextRead('c1', 'https://example.test/judgment');
    useCaseStore.getState().confirmDocument('doc1', '已核對事實、期限及引用');
    const approved = getActiveCase(useCaseStore.getState());
    expect(approved.candidateCitations[0]?.sourceStatus).toBe('FULLTEXT_READ');
    expect(approved.documents[0]?.status).toBe('HUMAN_APPROVED');
    expect(approved.workflowStage).toBe('HUMAN_APPROVED');
    expect(approved.approvals).toHaveLength(1);
  });
});
