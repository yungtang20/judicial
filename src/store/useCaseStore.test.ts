import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveCase, useCaseStore } from './useCaseStore';
import { decryptCaseContext, encryptCaseContext } from '../domain/case/persistence';
import { createInitialWorkflowState } from '../lib/workflow/unifiedStateGraph';

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

  it('does not downgrade a full-text citation when search returns it again', () => {
    const base = { id: 'rag-2', type: '裁判', citation: '最高法院112年度台上字第9號', summary: '', applicationReason: '', selected: true, sourceProvider: 'tw-legal-rag' as const, sourceId: 'rag-2' };
    useCaseStore.getState().saveRetrievedCitations([{ ...base, sourceStatus: 'RETRIEVED_UNREAD' as const }]);
    useCaseStore.getState().markCitationFulltextRead('rag-2', 'https://example.test/rag-2');
    useCaseStore.getState().saveRetrievedCitations([{ ...base, sourceStatus: 'RETRIEVED_UNREAD' as const }]);
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

  it('keeps prior artifacts when the unified workflow id changes and only resetCase clears them', () => {
    const oldWorkflow = createInitialWorkflowState('舊案件事實');
    oldWorkflow.currentStep = 'COMPLETED';
    useCaseStore.getState().applyUnifiedWorkflow(oldWorkflow);
    const oldCase = getActiveCase(useCaseStore.getState());
    useCaseStore.setState({
      cases: {
        'active-case': {
          ...oldCase,
          workflowStage: 'HUMAN_APPROVED',
          caseType: 'CRIMINAL',
          issues: [{ id: 'old-issue', title: '舊爭點', originalHolding: '', appealArgument: '' }],
          evidences: [{ id: 'old-evidence', code: '1', relatedIssue: '舊爭點', investigationItem: '', investigationTarget: '', targetAddress: '', provenFact: '' }],
          candidateCitations: [{ id: 'old-citation', type: '判決', citation: '舊判決', summary: '', applicationReason: '', selected: true }],
          deadlines: [{ id: 'old-deadline', label: '舊期限', value: '2026-01-01', source: '舊案件' }],
          documents: [{ id: 'old-document', kind: 'APPEAL_PETITION', title: '舊文件', text: '', status: 'VERIFIED', sourceTool: 'test', createdAt: new Date(0).toISOString() }],
          approvals: [{ artifactId: 'old-document', reviewerLabel: '舊承辦人', note: '', decidedAt: new Date(0).toISOString() }],
          analysisResult: { workflowStateId: oldWorkflow.id }
        }
      }
    });

    const newWorkflow = createInitialWorkflowState('新案件事實');
    newWorkflow.currentStep = 'QUESTIONING';
    useCaseStore.getState().applyUnifiedWorkflow(newWorkflow);

    const freshCase = getActiveCase(useCaseStore.getState());
    expect(freshCase.workflowStateId).toBe(newWorkflow.id);
    expect(freshCase.facts).toBe('新案件事實');
    expect(freshCase.caseType).toBe('CRIMINAL');
    // 切換到新工作流時，舊案的爭點、引用、期限、已產製文件與人工核准紀錄一律保留。
    // 過往在這裡直接覆蓋為空白，等於無預警地刪掉使用者唯一一份已核准產物。
    expect(freshCase.issues).toEqual([expect.objectContaining({ id: 'old-issue' })]);
    expect(freshCase.evidences).toEqual([expect.objectContaining({ id: 'old-evidence' })]);
    expect(freshCase.candidateCitations).toEqual([
      expect.objectContaining({ id: 'old-citation', citation: '舊判決' })
    ]);
    expect(freshCase.deadlines).toEqual([expect.objectContaining({ id: 'old-deadline' })]);
    expect(freshCase.documents).toEqual([expect.objectContaining({ id: 'old-document' })]);
    expect(freshCase.approvals).toEqual([expect.objectContaining({ artifactId: 'old-document' })]);
    expect(freshCase.analysisResult).toBeNull();
    expect(freshCase.workflowStage).toBe('TRIAGED');

    // 使用者明確執行「開立新案件」時，才允許連同產物一起清除。
    useCaseStore.getState().resetCase();
    const cleared = getActiveCase(useCaseStore.getState());
    expect(cleared.documents).toEqual([]);
    expect(cleared.approvals).toEqual([]);
    expect(cleared.candidateCitations).toEqual([]);
    expect(useCaseStore.getState().workflowState).toBeNull();
  });

  it('preserves same-workflow derived state while merging the projection', () => {
    const workflow = createInitialWorkflowState('同一案件事實');
    workflow.currentStep = 'COMPLETED';
    useCaseStore.getState().applyUnifiedWorkflow(workflow);
    const projected = getActiveCase(useCaseStore.getState());
    useCaseStore.setState({
      cases: {
        'active-case': {
          ...projected,
          issues: [{ id: 'same-issue', title: '同一爭點', originalHolding: '', appealArgument: '' }],
          candidateCitations: [{ id: 'same-citation', type: '判決', citation: '同一判決', summary: '', applicationReason: '', selected: true, sourceStatus: 'FULLTEXT_READ' }]
        }
      }
    });

    useCaseStore.getState().applyUnifiedWorkflow(workflow);

    const sameCase = getActiveCase(useCaseStore.getState());
    expect(sameCase.workflowStateId).toBe(workflow.id);
    expect(sameCase.issues).toHaveLength(1);
    expect(sameCase.candidateCitations[0]?.sourceStatus).toBe('FULLTEXT_READ');
    expect(sameCase.workflowStage).toBe('ANALYZED');
  });

  it('clears all canonical case data when a new case is opened', () => {
    useCaseStore.getState().saveTriage('舊案件事實', { caseType: 'CIVIL' });
    useCaseStore.getState().updateIssues([{ id: 'old-issue', title: '舊爭點', originalHolding: '', appealArgument: '' }]);
    useCaseStore.getState().updateEvidences([{ id: 'old-evidence', code: '1', relatedIssue: '舊爭點', investigationItem: '', investigationTarget: '', targetAddress: '', provenFact: '' }]);

    useCaseStore.getState().resetCase();

    const freshCase = getActiveCase(useCaseStore.getState());
    expect(freshCase.facts).toBe('');
    expect(freshCase.caseType).toBeUndefined();
    expect(freshCase.issues).toEqual([]);
    expect(freshCase.evidences).toEqual([]);
    expect(freshCase.candidateCitations).toEqual([]);
    expect(freshCase.deadlines).toEqual([]);
    expect(freshCase.documents).toEqual([]);
    expect(freshCase.approvals).toEqual([]);
    expect(freshCase.workflowStateId).toBeUndefined();
    expect(freshCase.workflowStage).toBe('INGEST');
  });
});
