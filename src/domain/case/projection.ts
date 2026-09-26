import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import type { CaseWorkflowStage } from './workflow';
import type { PrecedentItem } from '../../types';

export interface UnifiedCaseProjection {
  facts: string;
  workflowStateId: string;
  caseType?: string;
  triageResult: unknown;
  analysisResult: unknown;
  candidateCitations: PrecedentItem[];
  workflowStage: CaseWorkflowStage;
}

function projectCandidateCitations(state: LegalWorkflowState): PrecedentItem[] {
  return (state.rag?.precedents || []).map(precedent => ({
    id: `unified-${precedent.caseNumber}`,
    type: '裁判',
    citation: precedent.caseNumber,
    summary: precedent.summary,
    applicationReason: state.syllogism?.conclusion || '統一導診分析候選來源，尚未完成人工確認。',
    selected: false,
    sourceProvider: precedent.sourceUrl ? 'tw-legal-rag' : 'local',
    sourceUrl: precedent.sourceUrl,
    sourceStatus: 'RETRIEVED_UNREAD',
    sourceId: precedent.caseNumber
  }));
}

export function projectUnifiedWorkflowToCase(state: LegalWorkflowState): UnifiedCaseProjection {
  return {
    facts: state.userNarrative,
    workflowStateId: state.id,
    caseType: state.router?.caseType || state.router?.category,
    triageResult: state.router || null,
    analysisResult: state.currentStep === 'COMPLETED'
      ? {
          workflowStateId: state.id,
          syllogism: state.syllogism || null,
          verification: state.verification || null
        }
      : null,
    candidateCitations: projectCandidateCitations(state),
    workflowStage: state.currentStep === 'COMPLETED' ? 'ANALYZED' : 'TRIAGED'
  };
}
