import type { EvidenceRow, IssueRow } from '../types';

interface ActiveCaseFormSource {
  facts?: string;
  issues?: IssueRow[];
  evidences?: EvidenceRow[];
}

export function buildActiveCaseFormInputs(activeCase: ActiveCaseFormSource): Record<string, string> {
  const evidenceList = (activeCase.evidences || [])
    .filter(evidence => evidence.investigationItem?.trim())
    .map(evidence => [
      evidence.code?.trim() && `${evidence.code.trim()}：`,
      evidence.investigationItem.trim(),
      evidence.provenFact?.trim() && `（待證事實：${evidence.provenFact.trim()}）`
    ].filter(Boolean).join(''))
    .join('\n');

  return {
    ...(activeCase.facts?.trim() ? { incidentDetails: activeCase.facts.trim() } : {}),
    ...(activeCase.issues?.length ? { issueSummary: activeCase.issues.map(issue => issue.title).join('\n') } : {}),
    ...(evidenceList ? { evidenceList } : {})
  };
}
