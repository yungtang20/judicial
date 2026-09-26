import { describe, expect, it } from 'vitest';
import { generateVerifiedDocument } from '../../lib/generatedDocumentPipeline';
import { canTransitionCase } from './workflow';
import { createServer } from 'node:http';
import { createExpressApp } from '../../../server/index';
import { useCaseStore } from '../../store/useCaseStore';
import { canonicalizeRoute } from '../../types/navigation';
import { createInitialWorkflowState } from '../../lib/workflow/unifiedStateGraph';

describe('case lifecycle flow', () => {
  it('runs ingest through canonical case transitions, document approval, and human gate', async () => {
    const stages = ['INGEST', 'DEIDENTIFIED', 'TRIAGED', 'ANALYZED', 'RETRIEVED', 'DRAFTED', 'VERIFIED', 'HUMAN_APPROVED'] as const;
    useCaseStore.getState().resetCase();
    stages.slice(0, -1).forEach((stage, index) => {
      expect(canTransitionCase(stage, stages[index + 1])).toBe(true);
      useCaseStore.getState().transitionStage(stages[index + 1]);
    });
    const result = await generateVerifiedDocument(() => '依民法第184條第1項前段規定，請求損害賠償。');
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
    useCaseStore.getState().addDocument({
      id: 'lifecycle-document',
      kind: 'PLEADING',
      title: '測試書狀',
      text: result.documentText,
      status: 'VERIFIED',
      sourceTool: 'lifecycle-e2e',
      createdAt: new Date().toISOString(),
      verification: result.antiGhostVerification
    });
    useCaseStore.getState().confirmDocument('lifecycle-document', '人工確認完成');
    const active = useCaseStore.getState().cases['active-case'];
    expect(active.workflowStage).toBe('HUMAN_APPROVED');
    expect(active.approvals).toEqual(expect.arrayContaining([expect.objectContaining({ artifactId: 'lifecycle-document' })]));
  });

  it('switches canonical case state while preserving prior artifacts, and clears them only on reset', () => {
    const first = createInitialWorkflowState('案件 A');
    first.id = 'workflow-a';
    first.currentStep = 'COMPLETED';
    first.router = { domain: '民事', chapter: '債', cause: '借貸', is_sensitive: false, is_complete: true, missing_elements: [] };
    useCaseStore.getState().applyUnifiedWorkflow(first);
    useCaseStore.getState().updateIssues([{ id: 'a', title: 'A 爭點', originalHolding: '', appealArgument: '', legalBasis: '', legalStrength: 'NEED_SUPPLEMENT' }]);

    const second = createInitialWorkflowState('案件 B');
    second.id = 'workflow-b';
    second.router = { domain: '民事', chapter: '債', cause: '租賃', is_sensitive: false, is_complete: true, missing_elements: [] };
    useCaseStore.getState().applyUnifiedWorkflow(second);

    const active = useCaseStore.getState().cases['active-case'];
    expect(active.facts).toBe('案件 B');
    expect(active.workflowStateId).toBe('workflow-b');
    // 切換案件不得無預警地刪除前一案的爭點；清除只能由使用者的明確動作觸發。
    expect(active.issues).toEqual([expect.objectContaining({ id: 'a', title: 'A 爭點' })]);

    useCaseStore.getState().resetCase();
    expect(useCaseStore.getState().cases['active-case'].issues).toEqual([]);
    const handoff = canonicalizeRoute('litigation', 'issues', {
      facts: '案件 B',
      issuesSummary: '租賃爭點',
      sourceTool: 'unified',
    }).handoff;
    expect(handoff).toMatchObject({ facts: '案件 B', issuesSummary: '租賃爭點', sourceTool: 'unified' });
  });

  it('rejects an unread TLR citation at the real appeal and toolbox routes', async () => {
    const server = createServer(createExpressApp());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const unread = { id: 'j1', type: '裁判', citation: '最高法院112年度台上字第9號', summary: '', applicationReason: '', selected: true, sourceProvider: 'tw-legal-rag', sourceStatus: 'RETRIEVED_UNREAD', sourceId: 'j1' };
    const post = (path: string, body: unknown) => fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try {
      const appeal = await post('/api/generate-appeal-petition', { selectedPrecedents: [unread] });
      const toolbox = await post('/api/toolbox/generate', { toolId: 'CIVIL_TORT_GENERAL', params: { selectedPrecedents: [unread] } });
      expect(appeal.status).toBe(422);
      expect((await appeal.json()).code).toBe('CITATION_FULLTEXT_REQUIRED');
      expect(toolbox.status).toBe(422);
      expect((await toolbox.json()).code).toBe('CITATION_FULLTEXT_REQUIRED');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
