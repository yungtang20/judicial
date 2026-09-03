import { EvidenceRow, IssueRow, PrecedentItem } from '../../types';
import { CaseWorkflowStage } from './workflow';

export type CaseArtifactStatus = 'DRAFT' | 'VERIFIED' | 'NEEDS_HUMAN_REVIEW' | 'HUMAN_APPROVED';

export interface CaseDocumentArtifact {
  id: string;
  kind: string;
  title: string;
  text: string;
  status: CaseArtifactStatus;
  sourceTool: string;
  createdAt: string;
  verification?: Record<string, unknown>;
}

export interface CaseContext {
  schemaVersion: 1;
  caseId: string;
  workflowStage: CaseWorkflowStage;
  facts: string;
  caseType?: string;
  issues: IssueRow[];
  evidences: EvidenceRow[];
  candidateCitations: PrecedentItem[];
  deadlines: Array<{ id: string; label: string; value: string; source: string }>;
  documents: CaseDocumentArtifact[];
  triageResult?: unknown;
  analysisResult?: unknown;
  approvals?: Array<{ artifactId: string; reviewerLabel: string; note: string; decidedAt: string }>;
  updatedAt: string;
}
