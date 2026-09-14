import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { UnifiedNav, canCarryWorkflowResult } from './UnifiedNav';
import { SettingsModal } from './SettingsModal';

function workflowState(status: 'PASS' | 'NEEDS_REVIEW' | 'FAIL'): LegalWorkflowState {
  return {
    id: 'test', createdAt: 1, updatedAt: 1, currentStep: 'COMPLETED', factHistory: [],
    userNarrative: '使用者提供的案件事實',
    router: { domain: '民事', chapter: 'CIVIL', cause: '損害賠償', is_sensitive: false, is_complete: true, missing_elements: [] },
    syllogism: { majorPremise: 'AI 產生且尚待查驗的法律大前提', minorPremise: '案件事實', subsumption: '比對', conclusion: '初步結論', fullAnalysis: '分析' },
    verification: { totalChecked: 1, ghostCount: status === 'FAIL' ? 1 : 0, results: [], sanitizedText: '分析', passGate: status === 'PASS', verificationStatus: status },
  };
}

function renderNav(state: LegalWorkflowState) {
  const props = {
    workflowState: state,
    handleSelectTool: vi.fn(),
    saveCrossFeatureContext: vi.fn(),
    setShowDocTypeModal: vi.fn(),
  };
  render(<UnifiedNav {...props} />);
  return props;
}

describe('UnifiedNav', () => {
  it('allows complete NEEDS_REVIEW analysis to be carried without generating', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const props = renderNav(workflowState('NEEDS_REVIEW'));

    expect(screen.getByText('可帶入待查驗內容，點擊後才生成')).toBeInTheDocument();
    const draftButton = screen.getByRole('button', { name: /產生文書草稿/ });
    expect(draftButton).toBeEnabled();
    fireEvent.click(draftButton);
    expect(props.setShowDocTypeModal).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /實用法務書狀/ }));
    expect(props.saveCrossFeatureContext).toHaveBeenCalledWith(expect.objectContaining({
      facts: '使用者提供的案件事實',
      verificationStatus: 'NEEDS_REVIEW',
    }));
    expect(props.saveCrossFeatureContext).not.toHaveBeenCalledWith(expect.objectContaining({
      issuesSummary: expect.anything(),
    }));
    expect(props.handleSelectTool).toHaveBeenCalledWith('litigation', 'toolbox', expect.any(Object));
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps PASS navigation enabled and carries the verified issue summary', () => {
    const props = renderNav(workflowState('PASS'));
    fireEvent.click(screen.getByRole('button', { name: /法庭爭點整理表/ }));
    expect(props.saveCrossFeatureContext).toHaveBeenCalledWith(expect.objectContaining({
      issuesSummary: 'AI 產生且尚待查驗的法律大前提',
      verificationStatus: 'PASS',
    }));
  });

  it('selects a document type without starting generation', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const handleSelectTool = vi.fn();
    const saveCrossFeatureContext = vi.fn();
    render(
      <SettingsModal
        showDocTypeModal
        setShowDocTypeModal={vi.fn()}
        workflowState={workflowState('NEEDS_REVIEW')}
        handleSelectTool={handleSelectTool}
        saveCrossFeatureContext={saveCrossFeatureContext}
        showCustomPresetModal={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /存證信函/ }));
    expect(saveCrossFeatureContext).toHaveBeenCalledWith(expect.objectContaining({
      facts: '使用者提供的案件事實',
      verificationStatus: 'NEEDS_REVIEW',
    }));
    expect(handleSelectTool).toHaveBeenCalledWith('litigation', undefined, expect.objectContaining({
      initialTab: 'toolbox',
      facts: '使用者提供的案件事實',
    }));
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([
    ['FAIL', workflowState('FAIL')],
    ['error', { ...workflowState('NEEDS_REVIEW'), error: '分析失敗' }],
    ['incomplete', { ...workflowState('NEEDS_REVIEW'), router: { ...workflowState('NEEDS_REVIEW').router!, is_complete: false } }],
    ['legacy unknown', { ...workflowState('NEEDS_REVIEW'), verification: { ...workflowState('NEEDS_REVIEW').verification!, verificationStatus: undefined } }],
  ])('keeps %s analysis blocked', (_label, state) => {
    expect(canCarryWorkflowResult(state as LegalWorkflowState)).toBe(false);
    renderNav(state as LegalWorkflowState);
    expect(screen.getByRole('button', { name: /產生文書草稿/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /實用法務書狀/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /法庭爭點整理表/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /判決剖析與上訴/ })).toBeDisabled();
  });
});
