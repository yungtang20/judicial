// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { WorkflowFlowchart } from '../defense/WorkflowFlowchart';
import { UnifiedProgress } from '../unified/UnifiedProgress';
import { Badge } from './Badge';
import { Button } from './Button';
import { ProcessingIndicator } from './ProcessingIndicator';

describe('shared UI components', () => {
  it('forwards native button attributes and preserves the requested type', () => {
    render(<Button type="submit" aria-label="送出" disabled>送出</Button>);
    const button = screen.getByRole('button', { name: '送出' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
  });

  it('maps badges to semantic status tokens', () => {
    render(<Badge tone="warning">提醒</Badge>);
    expect(screen.getByText('提醒')).toHaveStyle({
      color: 'var(--color-status-warning)',
      backgroundColor: 'var(--color-status-warning-bg)',
    });
  });

  it('keeps processing detail collapsed by default', () => {
    const { container } = render(<ProcessingIndicator status="processing" label="處理中" detail="內部細節" />);
    expect(screen.getByRole('status')).toHaveTextContent('處理中');
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});

describe('workflow progress presentation', () => {
  it('reports a completed fail-closed result as an error instead of ongoing work', () => {
    const workflowState = {
      currentStep: 'COMPLETED',
      verification: { passGate: false, warningNotice: '需要人工確認' },
    } as LegalWorkflowState;
    render(<UnifiedProgress workflowState={workflowState} isSubmitting={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent('需要人工確認');
  });

  it('allows navigation only to stages backed by existing workflow data', () => {
    const setCurrentStage = vi.fn();
    render(
      <WorkflowFlowchart
        currentStage="B_POINT"
        setCurrentStage={setCurrentStage}
        triageResult={{ decision: 'TRACK_2_RISK' } as any}
        mineScanResult={null}
        lawyerPleading={null}
        personalPleading={null}
        isProcessing={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(setCurrentStage).toHaveBeenCalledWith('PHASE_2');
  });
});
