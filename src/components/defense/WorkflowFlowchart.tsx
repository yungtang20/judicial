import React from 'react';
import type { MineScanResult, DefenseTriageResult, GeneratedPleadingResult } from '../../types';
import { Button } from '../ui/Button';
import { ProcessingIndicator } from '../ui/ProcessingIndicator';

type WorkflowStage = 'INGEST' | 'B_POINT' | 'PHASE_2' | 'PHASE_3' | 'OUTPUT';

export interface WorkflowFlowchartProps {
  currentStage: WorkflowStage;
  setCurrentStage: (stage: WorkflowStage) => void;
  triageResult: DefenseTriageResult | null;
  mineScanResult: MineScanResult | null;
  lawyerPleading: GeneratedPleadingResult | null;
  personalPleading: GeneratedPleadingResult | null;
  isProcessing: boolean;
}

const stages: Array<{ id: WorkflowStage; title: string; description: string }> = [
  { id: 'INGEST', title: '案情與陳述輸入', description: '整理當事人陳述與案件背景' },
  { id: 'B_POINT', title: '事實與風險分類', description: '判斷事實完整度與防禦方向' },
  { id: 'PHASE_2', title: '律師溝通與證據問卷', description: '補充關鍵事實並確認溝通策略' },
  { id: 'PHASE_3', title: '不利自認風險檢查', description: '檢查陳述中的不利自認與自證己罪風險' },
  { id: 'OUTPUT', title: '書狀產出與引用檢核', description: '檢視書狀與法律引用查核結果' },
];

export const WorkflowFlowchart: React.FC<WorkflowFlowchartProps> = ({
  currentStage,
  setCurrentStage,
  triageResult,
  mineScanResult,
  lawyerPleading,
  personalPleading,
  isProcessing,
}) => {
  const hasPleading = Boolean(lawyerPleading || personalPleading);
  const enabled: Record<WorkflowStage, boolean> = {
    INGEST: true,
    B_POINT: Boolean(triageResult),
    PHASE_2: Boolean(triageResult),
    PHASE_3: Boolean(mineScanResult),
    OUTPUT: hasPleading,
  };
  const completed: Record<WorkflowStage, boolean> = {
    INGEST: Boolean(triageResult),
    B_POINT: Boolean(triageResult),
    PHASE_2: Boolean(mineScanResult || hasPleading),
    PHASE_3: Boolean(mineScanResult && hasPleading),
    OUTPUT: hasPleading,
  };
  const availableStages = stages.filter(stage => enabled[stage.id]);
  const currentIndex = availableStages.findIndex(stage => stage.id === currentStage);
  const current = stages.find(stage => stage.id === currentStage) || stages[0];
  const previous = currentIndex > 0 ? availableStages[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < availableStages.length - 1 ? availableStages[currentIndex + 1] : null;

  return (
    <section className="mt-6 space-y-3 border-t border-slate-800/80 pt-5" aria-label="雙軌防禦工作流程">
      <ProcessingIndicator
        status={isProcessing ? 'processing' : completed[current.id] ? 'done' : 'idle'}
        label={`目前步驟：${current.title}`}
        detail={current.description}
      />

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" disabled={!previous} onClick={() => previous && setCurrentStage(previous.id)}>
          上一步
        </Button>
        <Button variant="secondary" size="sm" disabled={!next} onClick={() => next && setCurrentStage(next.id)}>
          下一步
        </Button>
      </div>

      <details className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-[var(--space-3)]">
        <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text-muted)]">查看或回到其他步驟</summary>
        <div className="mt-[var(--space-3)] space-y-[var(--space-2)]">
          {stages.map(stage => (
            <div key={stage.id} className="grid grid-cols-[1fr_auto] items-center gap-[var(--space-2)]">
              <ProcessingIndicator
                status={stage.id === currentStage && isProcessing ? 'processing' : completed[stage.id] ? 'done' : 'idle'}
                label={stage.title}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={!enabled[stage.id] || stage.id === currentStage}
                onClick={() => setCurrentStage(stage.id)}
                aria-current={stage.id === currentStage ? 'step' : undefined}
              >
                {stage.id === currentStage ? '目前' : '前往'}
              </Button>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
};
