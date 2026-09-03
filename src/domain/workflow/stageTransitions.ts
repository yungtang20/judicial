/**
 * Deterministic State Machine & Transition Policy
 * 嚴格定義 6 階段線性推進轉移表與校驗邏輯，禁止任意跳關
 */

import { SdlcStageId } from '../sdlc/types';
import { AppError } from './errors';

export const ALLOWED_STAGE_TRANSITIONS: Record<SdlcStageId, SdlcStageId | null> = {
  '01_plan': '02_design',
  '02_design': '03_build',
  '03_build': '04_test',
  '04_test': '05_deploy',
  '05_deploy': '06_maintain',
  '06_maintain': null // 末端階段，需透過合法 Feedback Loop 回流
};

export function canTransition(
  currentStage: SdlcStageId,
  targetStage: SdlcStageId
): boolean {
  const allowedNext = ALLOWED_STAGE_TRANSITIONS[currentStage];
  return allowedNext === targetStage;
}

export function assertTransition(
  currentStage: SdlcStageId,
  targetStage: SdlcStageId,
  context?: { reason?: string }
): void {
  if (!canTransition(currentStage, targetStage)) {
    throw new AppError(
      'INVALID_STAGE_TRANSITION',
      `禁止非法階段轉移：無法從 [${currentStage}] 直接推進至 [${targetStage}]。只允許依序推進至 [${ALLOWED_STAGE_TRANSITIONS[currentStage] || '無'}]。`,
      409,
      {
        currentStage,
        targetStage,
        allowedTarget: ALLOWED_STAGE_TRANSITIONS[currentStage],
        reason: context?.reason
      }
    );
  }
}
