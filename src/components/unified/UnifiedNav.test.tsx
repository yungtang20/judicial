import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedNav } from './UnifiedNav';

describe('UnifiedNav', () => {
  it('passes router-backed case issue context with every typed handoff', () => {
    const handleSelectTool = vi.fn();
    const saveCrossFeatureContext = vi.fn();
    const workflowState = {
      id: 'workflow-1',
      userNarrative: '完整案件事實',
      inputType: 'facts',
      currentStep: 'COMPLETED',
      error: null,
      router: {
        is_complete: true,
        domain: '民事',
        caseType: '借貸契約',
        cause: '借貸關係是否成立'
      },
      verification: { passGate: true, verificationStatus: 'PASS' },
      syllogism: { majorPremise: '借貸契約成立之法律要件' },
    };

    render(
      <UnifiedNav
        workflowState={workflowState}
        handleSelectTool={handleSelectTool}
        saveCrossFeatureContext={saveCrossFeatureContext}
        setShowDocTypeModal={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /法庭爭點整理表/ }));

    expect(handleSelectTool).toHaveBeenCalledWith(
      'litigation',
      'issues',
      expect.objectContaining({
        domain: '民事',
        cause: '借貸關係是否成立',
        scenarioKeywords: '借貸關係是否成立',
        facts: '完整案件事實',
        issuesSummary: '借貸關係是否成立；案件類型：借貸契約',
        sourceTool: 'unified'
      })
    );
    expect(saveCrossFeatureContext).toHaveBeenCalledWith(expect.objectContaining({
      domain: '民事',
      cause: '借貸關係是否成立',
      scenarioKeywords: '借貸關係是否成立',
      issuesSummary: '借貸關係是否成立；案件類型：借貸契約',
      sourceTool: 'unified'
    }));
  });

  it('passes the same typed handoff when opening the legal guide', () => {
    const handleSelectTool = vi.fn();
    const workflowState = {
      id: 'workflow-guide',
      userNarrative: '完整案件事實',
      inputType: 'facts',
      currentStep: 'COMPLETED',
      router: {
        is_complete: true,
        domain: '民事',
        caseType: '租賃契約',
        cause: '押金返还範圍'
      },
      verification: { passGate: true, verificationStatus: 'PASS' },
      syllogism: { majorPremise: '租賃契約與押金返还之法律規則' }
    };

    render(
      <UnifiedNav
        workflowState={workflowState}
        handleSelectTool={handleSelectTool}
        saveCrossFeatureContext={vi.fn()}
        setShowDocTypeModal={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /生活法律導診/ }));

    const handoff = handleSelectTool.mock.calls[0][2];
    expect(handoff).toMatchObject({ domain: '民事', sourceTool: 'unified' });
    expect(handoff.cause).toBe(workflowState.router.cause);
    expect(handoff.scenarioKeywords).toBe(workflowState.router.cause);
    expect(handoff.issuesSummary).toContain('案件類型：租賃契約');
  });
});
