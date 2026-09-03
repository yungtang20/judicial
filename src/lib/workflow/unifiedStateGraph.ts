/**
 * 統一入口自動化工作流狀態機核心定義 (Unified StateGraph)
 *
 * 節點流轉圖：
 * [UnifiedEntry] (用戶輸入事實或文本)
 *       │
 *       ▼
 * [RouterNode] ── (強制輸出 JSON: domain, chapter, cause, is_sensitive, is_complete, missing_elements)
 *       │
 *       ├─────────────────────────────────┐
 *       │ (條件邊界 1)                     │ (條件邊界 2)
 *       ▼                                 ▼
 * [is_sensitive == true]            [is_complete == false]
 * [SafetyProtectionNode]             [QuestioningNode]
 * (啟動保護專線/驗傷保全指引)        (同理心動態追問 + 快捷補充選項)
 *       │                                 │
 *       │ (用戶安全確認 / 略過)           │ (用戶補充事實後重返 RouterNode)
 *       ▼                                 ▼
 * [RAGNode] (根據 domain/cause/事實 動態檢索中華民國法定構成要件與實務見解)
 *       │
 *       ▼
 * [SyllogismNode] (嚴格三段論涵攝：大前提、小前提、要件逐項比對、法律結論)
 *       │
 *       ▼
 * [VerificationGateNode] (合併 External Document Checker：真實法規防偽校驗、司法院裁判書交叉檢核)
 *       │
 *       ▼
 * [FinalWorkflowOutput] (產生具備檢核綠標、訴訟策略與下一步指引之終審報告)
 */

import { CitationVerificationResult } from '../../types';
import { ExternalCitationResult } from '../externalCitationVerifier';

export type WorkflowStepId = 
  | 'ENTRY'
  | 'ROUTER'
  | 'QUESTIONING'
  | 'SAFETY_PROTECTION'
  | 'RAG_RETRIEVAL'
  | 'SYLLOGISM'
  | 'VERIFICATION_GATE'
  | 'COMPLETED';

export interface WorkflowRouterData {
  domain: string; // 刑事/民事/家事/行政
  chapter: string; // 罪章或專節領域
  cause: string; // 案由或罪名
  is_sensitive: boolean; // 是否涉及性侵害、家暴、跟蹤騷擾或隱私安全
  is_complete: boolean; // 人、事、時、地、證據要素是否充足
  missing_elements: string[]; // 缺少的要素清單
}

export interface WorkflowQuestioningData {
  rawMessage: string;
  suggestedOptions: string[];
}

export interface WorkflowSafetyData {
  emergencyHotlines: Array<{ label: string; number: string; desc: string }>;
  preservationTips: string[];
  immediateSteps: string[];
  acknowledged: boolean;
}

export interface WorkflowRagData {
  searchQuery: string;
  legalElements: string; // 大前提構成要件摘錄
  statuteCitations: string[];
  precedents: Array<{
    caseNumber: string;
    courtName: string;
    summary: string;
    sourceUrl?: string;
  }>;
}

export interface WorkflowSyllogismData {
  majorPremise: string; // 1. 大前提
  minorPremise: string; // 2. 小前提
  subsumption: string; // 3. 涵攝
  conclusion: string; // 4. 結論
  fullAnalysis: string;
}

export interface WorkflowVerificationData {
  totalChecked: number;
  ghostCount: number;
  results: CitationVerificationResult[];
  sanitizedText: string;
  externalCitations?: ExternalCitationResult[];
  passGate: boolean;
  warningNotice?: string;
}

export interface LegalWorkflowState {
  id: string;
  createdAt: number;
  updatedAt: number;
  currentStep: WorkflowStepId;
  userNarrative: string; // 用戶輸入或追加之案情文字
  factHistory: string[]; // 事實修訂與補充歷史
  router?: WorkflowRouterData;
  questioning?: WorkflowQuestioningData;
  safety?: WorkflowSafetyData;
  rag?: WorkflowRagData;
  syllogism?: WorkflowSyllogismData;
  verification?: WorkflowVerificationData;
  error?: string;
}

/**
 * 預設初始狀態工廠函數
 */
export function createInitialWorkflowState(initialText: string = ''): LegalWorkflowState {
  return {
    id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentStep: 'ENTRY',
    userNarrative: initialText,
    factHistory: initialText.trim() ? [initialText.trim()] : []
  };
}
