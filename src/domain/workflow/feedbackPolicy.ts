/**
 * Continuous Feedback Policy & Artifact Model
 * 定義受治理的閉環回流路徑與不可篡改之 FeedbackArtifact
 */

import { SdlcStageId } from '../sdlc/types';
import { AppError } from './errors';
import { ActorType } from './authorization';

export interface FeedbackArtifact {
  id: string;
  projectId: string;
  fromStage: SdlcStageId;
  targetStage: SdlcStageId;
  reason: string;
  suggestedAdjustments: string;
  requestedBy: {
    actorId: string;
    actorType: ActorType;
    role: string;
  };
  createdAt: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
}

/**
 * 法律與工程工作流合法反饋路徑表 (Whitelisted Feedback Graph)
 */
export const ALLOWED_FEEDBACK_ROUTES: Record<SdlcStageId, SdlcStageId[]> = {
  '01_plan': [], // 起始階段無回流前置
  '02_design': ['01_plan'], // 設計階段可回流至立項重修意圖
  '03_build': ['02_design', '01_plan'], // 構建遇阻可回流至設計或立項
  '04_test': ['03_build', '02_design'], // 測試失敗回流至構建修稿或設計重構
  '05_deploy': ['03_build', '02_design'], // 交付核可失敗回流至文稿重印或策略調整
  '06_maintain': ['01_plan', '02_design', '03_build'] // 歷審裁判事故回流至重啟立項或二審重構
};

export class FeedbackPolicy {
  public static isAllowedFeedback(fromStage: SdlcStageId, targetStage: SdlcStageId): boolean {
    const allowedTargets = ALLOWED_FEEDBACK_ROUTES[fromStage] || [];
    return allowedTargets.includes(targetStage);
  }

  public static assertFeedback(
    fromStage: SdlcStageId,
    targetStage: SdlcStageId,
    reason: string,
    requestedBy: { actorId: string; actorType: ActorType; role: string }
  ): void {
    if (!reason || reason.trim().length < 5) {
      throw new AppError(
        'INVALID_FEEDBACK_TRANSITION',
        '觸發反饋回流失敗：必須提供至少 5 字之具體裁判事故或技術原因。',
        400,
        { fromStage, targetStage }
      );
    }

    if (requestedBy.actorType as string === 'AI') {
      throw new AppError(
        'UNAUTHORIZED_ACTOR',
        'AI Agent 禁止直接觸發結構性 Feedback 狀態回流，必須由人類決策者或治理系統發起。',
        403
      );
    }

    if (!this.isAllowedFeedback(fromStage, targetStage)) {
      throw new AppError(
        'INVALID_FEEDBACK_TRANSITION',
        `非法反饋回流：禁止從 [${fromStage}] 任意跳躍至 [${targetStage}]。合法目標階段為: [${ALLOWED_FEEDBACK_ROUTES[fromStage].join(', ') || '無'}]`,
        409,
        {
          fromStage,
          targetStage,
          allowedTargets: ALLOWED_FEEDBACK_ROUTES[fromStage]
        }
      );
    }
  }

  public static createFeedbackArtifact(
    projectId: string,
    fromStage: SdlcStageId,
    targetStage: SdlcStageId,
    reason: string,
    suggestedAdjustments: string,
    requestedBy: { actorId: string; actorType: ActorType; role: string }
  ): FeedbackArtifact {
    this.assertFeedback(fromStage, targetStage, reason, requestedBy);

    return {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      fromStage,
      targetStage,
      reason,
      suggestedAdjustments,
      requestedBy,
      createdAt: new Date().toISOString(),
      status: 'APPLIED'
    };
  }
}
