export type CaseWorkflowStage =
  | 'INGEST'
  | 'DEIDENTIFIED'
  | 'TRIAGED'
  | 'ANALYZED'
  | 'RETRIEVED'
  | 'DRAFTED'
  | 'VERIFIED'
  | 'HUMAN_APPROVED'
  | 'FINALIZED';

const transitions: Record<CaseWorkflowStage, CaseWorkflowStage[]> = {
  INGEST: ['DEIDENTIFIED'],
  DEIDENTIFIED: ['TRIAGED'],
  TRIAGED: ['ANALYZED'],
  ANALYZED: ['RETRIEVED', 'DRAFTED'],
  RETRIEVED: ['DRAFTED'],
  DRAFTED: ['VERIFIED'],
  VERIFIED: ['HUMAN_APPROVED'],
  HUMAN_APPROVED: ['FINALIZED'],
  FINALIZED: []
};

export function canTransitionCase(from: CaseWorkflowStage, to: CaseWorkflowStage): boolean {
  return transitions[from]?.includes(to) || false;
}

export function assertCaseTransition(from: CaseWorkflowStage, to: CaseWorkflowStage): void {
  if (!canTransitionCase(from, to)) throw new Error(`案件流程不得由 ${from} 跳轉至 ${to}`);
}
