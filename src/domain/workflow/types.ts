/**
 * Workflow State Machine and Stage Contract Types
 * 嚴格定義法律工作流程之 Deterministic 狀態轉移與 Stage 契約
 */

export type WorkflowState =
  | 'RECEIVED'
  | 'PRECHECKED'
  | 'CLASSIFIED'
  | 'RETRIEVED'
  | 'ANALYZED'
  | 'GENERATED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'NEEDS_REVIEW'
  | 'FAILED'
  | 'REPAIRING'
  | 'RETESTING';

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  reason?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StageContract<TInput = any, TOutput = any> {
  name: string;
  description: string;
  allowedPreviousStates: WorkflowState[];
  targetStateOnSuccess: WorkflowState;
  targetStateOnFailure: WorkflowState;
  validateInput: (input: TInput) => { valid: boolean; errors?: string[] };
  validateOutput: (output: TOutput) => { valid: boolean; errors?: string[] };
  retryable: boolean;
  maxRetries: number;
}

export interface Artifact {
  id: string;
  workflowId: string;
  type: 'intent' | 'spec' | 'analysis' | 'draft' | 'verification' | 'decision';
  content: string | Record<string, any>;
  createdAt: string;
  author: 'user' | 'agent' | 'validator' | 'system';
}
