/**
 * AI 原生 SDLC (AI-Native Software / Legal Delivery Lifecycle) 核心領域型別定義
 * 依據「模型只是執行層，流程才是系統骨架」架構原則設計
 */

export type SdlcStageId = '01_plan' | '02_design' | '03_build' | '04_test' | '05_deploy' | '06_maintain';

export type StageStatus = 'pending' | 'in_progress' | 'awaiting_human_gate' | 'completed' | 'failed' | 'iterating';

export type ExecutionMode = 'REAL' | 'DEMO' | 'MOCK' | 'FALLBACK';

export interface SdlcArtifact {
  id: string;
  stageId: SdlcStageId;
  name: string;
  category: 'intent' | 'spec' | 'plan' | 'code_or_doc' | 'test_report' | 'release_record' | 'incident_log';
  content: string;
  summary: string;
  createdAt: string;
  version: number;
  executionMode?: ExecutionMode;
  metadata?: Record<string, unknown>;
}

export interface HumanDecisionGate {
  stageId: SdlcStageId;
  gateName: string;
  riskDescription: string;
  requiredCheckpoints: string[];
  passed: boolean;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface SdlcStageDefinition {
  id: SdlcStageId;
  stepNumber: string;
  name: string;
  englishName: string;
  corePurpose: string;
  inputs: {
    label: string;
    description: string;
    items: string[];
  };
  outputs: {
    label: string;
    description: string;
    items: string[];
  };
  humanRiskPrompt: string;
}

export interface SdlcProjectState {
  projectId: string;
  title: string;
  legalDomain: string;
  currentStageId: SdlcStageId;
  stageStatuses: Record<SdlcStageId, StageStatus>;
  artifacts: Record<SdlcStageId, SdlcArtifact[]>;
  gates: Record<SdlcStageId, HumanDecisionGate>;
  iterationsCount: number;
  executionMode?: ExecutionMode;
  feedbackHistory: Array<{
    timestamp: string;
    fromStage: SdlcStageId;
    targetStage: SdlcStageId;
    reason: string;
    suggestedAdjustments: string;
  }>;
  updatedAt: string;
}

export const SDLC_STAGES: SdlcStageDefinition[] = [
  {
    id: '01_plan',
    stepNumber: '01',
    name: '計劃與立項',
    englishName: 'Plan',
    corePurpose: '明確訴訟意圖、權益目標與時效邊界',
    inputs: {
      label: '輸入 (Inputs)',
      description: '業務目標、約束與邊界、歷史數據',
      items: ['業務/訴訟目標', '法律約束與時效邊界', '案件背景與歷史數據']
    },
    outputs: {
      label: '輸出 (Outputs)',
      description: '意圖 (Intent)、範圍與成功標準',
      items: ['意圖 (Intent)', '範圍與成功標準', '時效風險評估']
    },
    humanRiskPrompt: '確認訴訟請求之合法性與當事人真實意願，核實是否已逾法定消滅時效。'
  },
  {
    id: '02_design',
    stepNumber: '02',
    name: '方案與設計',
    englishName: 'Design',
    corePurpose: '法律三段論架構、請求權基礎與爭點契約設計',
    inputs: {
      label: '輸入 (Inputs)',
      description: '意圖、領域知識、技術/法律約束',
      items: ['意圖 (Intent)', '領域實務見解與法理', '訴訟技術與管轄約束']
    },
    outputs: {
      label: '輸出 (Outputs)',
      description: '規格 (Spec)、架構與接口契約',
      items: ['規格 (Spec / 爭點清單)', '請求權基礎與架構契約', '攻防三段論體系']
    },
    humanRiskPrompt: '檢驗大前提法規依據是否明確，確認請求權基礎競合與排他之訴訟策略。'
  },
  {
    id: '03_build',
    stepNumber: '03',
    name: '實現與構建',
    englishName: 'Build',
    corePurpose: '依規格與三段論生成完整起訴狀/答辯狀與證據清冊',
    inputs: {
      label: '輸入 (Inputs)',
      description: '規格、架構、任務計劃',
      items: ['規格 (Spec)', '架構契約', '具狀編撰計劃']
    },
    outputs: {
      label: '輸出 (Outputs)',
      description: '可運行代碼/具狀文稿、構建產物',
      items: ['可具狀之訴訟文書文稿', '證據編號清單與引用對照表', '格式化結構產物']
    },
    humanRiskPrompt: '核對事實敘述是否與委託人提供之客觀事證完全吻合，避免自認不利事由。'
  },
  {
    id: '04_test',
    stepNumber: '04',
    name: '測試與驗證',
    englishName: 'Test',
    corePurpose: '全篇引註真偽檢核 (Anti-Ghost) 與六大地雷防禦掃描',
    inputs: {
      label: '輸入 (Inputs)',
      description: '代碼/文稿與構建產物、測試策略、測試用例',
      items: ['訴訟文稿與構建產物', '防幽靈引用測試策略', '六大敗訴地雷測試用例']
    },
    outputs: {
      label: '輸出 (Outputs)',
      description: '測試報告、缺陷與風險清單',
      items: ['引註真偽檢驗報告 (Anti-Ghost)', '地雷與法律漏洞風險清單', '格式合規審查摘要']
    },
    humanRiskPrompt: '逐條複核未收錄之高等/最高法院字號，確認判決意旨未被斷章取義或扭曲。'
  },
  {
    id: '05_deploy',
    stepNumber: '05',
    name: '發布與交付',
    englishName: 'Deploy',
    corePurpose: '律師簽章確認、用印格式化與法院具狀交付發布',
    inputs: {
      label: '輸入 (Inputs)',
      description: '部署/交付計劃、變更清單、驗收標準',
      items: ['交付與遞狀計劃', '文稿修正變更清單', '司法驗收與裁判規格標準']
    },
    outputs: {
      label: '輸出 (Outputs)',
      description: '運行版本、發布記錄',
      items: ['最終定版訴狀 (Release Ready)', '用印與遞狀發布記錄', '法院繕本追蹤卡']
    },
    humanRiskPrompt: '關鍵風險仍由人判斷！本階段必須取得執業律師或當事人正式簽名確認後方可送達法院。'
  },
  {
    id: '06_maintain',
    stepNumber: '06',
    name: '運維與改進',
    englishName: 'Maintain',
    corePurpose: '開庭審理追蹤、補正裁定分析、上訴答辯與經驗閉環反饋',
    inputs: {
      label: '輸入 (Inputs)',
      description: '運行數據、告警與反饋、用戶反饋',
      items: ['開庭筆錄與裁判數據', '對造抗辯告警與反饋', '當事人與法官庭詢記錄']
    },
    outputs: {
      label: '輸出 (Outputs)',
      description: '事故記錄、改進建議與計劃',
      items: ['訴訟攻防事故/爭點偏移記錄', '次審上訴改進建議', '閉環反饋回流至立項/設計']
    },
    humanRiskPrompt: '依裁判主文與理由，分析判決違背法令或認定事實不當之處，啟動反饋回流迭代。'
  }
];
