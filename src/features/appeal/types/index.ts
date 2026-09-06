import { IssueRow, EvidenceRow, PrecedentItem } from "../../../types";

export type { IssueRow, EvidenceRow, PrecedentItem };

export type AppealOutputTab = 'petition' | 'issues_table' | 'evidences_table';
export type TlrSearchType = 'hybrid' | 'keyword' | 'phrase';
export type JudicialModalTab = 'tlr' | 'official';
export type TargetJudicialField = 'first' | 'second';

export interface AppealMetadata {
  appealDateIso: string;
  appealDateRoc: string;
  appellantName: string;
  appellantId: string;
  appellantAddress: string;
  appellantPhone: string;
  appelleeName: string;
  appelleeId: string;
  appelleeAddress: string;
  courtName: string;
  caseNumber: string;
  originalJudgmentDate: string;
}

export interface AppealWorkflowStep {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
}
