import React from 'react';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { ProcessingIndicator, type ProcessingIndicatorProps } from '../ui/ProcessingIndicator';

export interface UnifiedProgressProps {
  workflowState: LegalWorkflowState | null;
  isSubmitting: boolean;
}

export const UnifiedProgress: React.FC<UnifiedProgressProps> = ({ workflowState, isSubmitting }) => {
  let status: ProcessingIndicatorProps['status'] = 'idle';
  let label = '尚未開始分析';

  if (workflowState?.error) {
    status = 'error';
    label = workflowState.error;
  } else if (workflowState?.verification?.passGate) {
    status = 'done';
    label = '分析完成';
  } else if (workflowState?.currentStep === 'COMPLETED') {
    status = 'error';
    label = workflowState.verification?.warningNotice || '分析結果未通過真確性檢核，請人工確認';
  } else if (workflowState?.currentStep === 'QUESTIONING' && !isSubmitting) {
    label = '等待補充關鍵案情';
  } else if (isSubmitting || workflowState) {
    status = 'processing';
    label = !workflowState?.router
      ? '正在分析案情內容…'
      : !workflowState.rag
        ? '正在檢索相關法條…'
        : !workflowState.syllogism
          ? '正在核對法定要件…'
          : '正在執行真確性檢核…';
  }

  const detail = [
    `輸入文本：${workflowState ? '完成' : '等待'}`,
    `智慧分流：${workflowState?.router ? '完成' : '等待'}`,
    `要件比對：${workflowState?.router?.is_complete ? '完成' : workflowState?.currentStep === 'QUESTIONING' ? '等待補充' : '等待'}`,
    `法規要件：${workflowState?.rag ? '完成' : '等待'}`,
    `三段論涵攝：${workflowState?.syllogism ? '完成' : '等待'}`,
    `真確性檢核：${workflowState?.verification ? (workflowState.verification.passGate ? '通過' : '需人工確認') : '等待'}`,
  ].join('\n');

  return <ProcessingIndicator status={status} label={label} detail={detail} />;
};
