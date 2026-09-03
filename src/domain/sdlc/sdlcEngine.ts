/**
 * AI 原生 SDLC 核心狀態機引擎 (SDLC State Machine & Artifact Repository)
 */

import {
  SdlcStageId,
  StageStatus,
  SdlcArtifact,
  HumanDecisionGate,
  SdlcProjectState,
  SDLC_STAGES
} from './types';

export function createInitialSdlcProject(
  projectId: string,
  title: string,
  legalDomain: string = 'CIVIL'
): SdlcProjectState {
  const stageStatuses: Record<SdlcStageId, StageStatus> = {
    '01_plan': 'in_progress',
    '02_design': 'pending',
    '03_build': 'pending',
    '04_test': 'pending',
    '05_deploy': 'pending',
    '06_maintain': 'pending'
  };

  const artifacts: Record<SdlcStageId, SdlcArtifact[]> = {
    '01_plan': [],
    '02_design': [],
    '03_build': [],
    '04_test': [],
    '05_deploy': [],
    '06_maintain': []
  };

  const gates: Record<SdlcStageId, HumanDecisionGate> = {
    '01_plan': {
      stageId: '01_plan',
      gateName: '立項意圖審查 (Intent Approval Gate)',
      riskDescription: '確認訴訟請求權威性、法定消滅時效無逾期風險、當事人訴訟能力。',
      requiredCheckpoints: ['時效未消滅核實', '管轄法院確認', '訴訟利益大於裁判成本'],
      passed: false
    },
    '02_design': {
      stageId: '02_design',
      gateName: '三段論架構審查 (Spec & Architecture Gate)',
      riskDescription: '審查大前提法條適格性、小前提要件事實對應無疏漏。',
      requiredCheckpoints: ['法條請求權基礎確立', '舉證責任分配明確', '抗辯事由預防設計'],
      passed: false
    },
    '03_build': {
      stageId: '03_build',
      gateName: '文稿與事證吻合審查 (Draft Integrity Gate)',
      riskDescription: '確保生成之書狀內容無不利於己之虛假或矛盾自認。',
      requiredCheckpoints: ['原被告訴之聲明完備', '證物編號甲乙證吻合', '不含推測性不利自認'],
      passed: false
    },
    '04_test': {
      stageId: '04_test',
      gateName: '引註真偽與地雷掃描 (Anti-Ghost & Quality Gate)',
      riskDescription: '法條實效性通過、判決字號無AI幽靈捏造、避開六大敗訴地雷。',
      requiredCheckpoints: ['現行法規引用通過 heuristic 檢查', '判決字號格式與實質可溯', '排除無權處分等六大地雷'],
      passed: false
    },
    '05_deploy': {
      stageId: '05_deploy',
      gateName: '律師定版用印發布 (Human Review & Release Gate)',
      riskDescription: '關鍵風險仍由人判斷！需取得正式簽署並核發送達收據。',
      requiredCheckpoints: ['委託人/律師最終簽章核可', '繕本份數與證物附件齊全', '法院規費核算無誤'],
      passed: false
    },
    '06_maintain': {
      stageId: '06_maintain',
      gateName: '判決反饋與閉環改進 (Feedback Loop Gate)',
      riskDescription: '審閱庭期爭點與判決書，將裁判見解回流至模型知識庫與下一審級。',
      requiredCheckpoints: ['裁判主文理由拆解入庫', '上訴二十日不變期間控管', '策略偏差事故紀錄歸檔'],
      passed: false
    }
  };

  return {
    projectId,
    title,
    legalDomain,
    currentStageId: '01_plan',
    stageStatuses,
    artifacts,
    gates,
    iterationsCount: 0,
    feedbackHistory: [],
    updatedAt: new Date().toISOString()
  };
}

export function advanceSdlcStage(
  state: SdlcProjectState,
  currentStageId: SdlcStageId,
  humanDecidedBy?: string,
  decisionNote?: string
): SdlcProjectState {
  const stageIndex = SDLC_STAGES.findIndex(s => s.id === currentStageId);
  if (stageIndex === -1) return state;

  const nextStage = SDLC_STAGES[stageIndex + 1];
  const newState: SdlcProjectState = {
    ...state,
    stageStatuses: {
      ...state.stageStatuses,
      [currentStageId]: 'completed'
    },
    gates: {
      ...state.gates,
      [currentStageId]: {
        ...state.gates[currentStageId],
        passed: true,
        decidedBy: humanDecidedBy || '資深法律顧問/承辦律師',
        decidedAt: new Date().toISOString(),
        decisionNote: decisionNote || '已由人工完成關鍵風險核可並放行至下一交付階段'
      }
    },
    updatedAt: new Date().toISOString()
  };

  if (nextStage) {
    newState.currentStageId = nextStage.id;
    newState.stageStatuses[nextStage.id] = 'in_progress';
  }

  return newState;
}

export function triggerSdlcFeedbackLoop(
  state: SdlcProjectState,
  fromStage: SdlcStageId,
  targetStage: SdlcStageId,
  reason: string,
  suggestedAdjustments: string
): SdlcProjectState {
  return {
    ...state,
    currentStageId: targetStage,
    stageStatuses: {
      ...state.stageStatuses,
      [fromStage]: 'iterating',
      [targetStage]: 'in_progress'
    },
    iterationsCount: state.iterationsCount + 1,
    feedbackHistory: [
      {
        timestamp: new Date().toISOString(),
        fromStage,
        targetStage,
        reason,
        suggestedAdjustments
      },
      ...state.feedbackHistory
    ],
    updatedAt: new Date().toISOString()
  };
}

export function addSdlcArtifact(
  state: SdlcProjectState,
  stageId: SdlcStageId,
  artifact: Omit<SdlcArtifact, 'id' | 'createdAt' | 'version' | 'stageId'>
): SdlcProjectState {
  const newArtifact: SdlcArtifact = {
    ...artifact,
    id: `art_${stageId}_${Date.now()}`,
    stageId,
    createdAt: new Date().toISOString(),
    version: (state.artifacts[stageId]?.length || 0) + 1
  };

  return {
    ...state,
    artifacts: {
      ...state.artifacts,
      [stageId]: [...(state.artifacts[stageId] || []), newArtifact]
    },
    updatedAt: new Date().toISOString()
  };
}
