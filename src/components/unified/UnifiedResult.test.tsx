import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { UnifiedResult, canUseWorkflowResult } from './UnifiedResult';

const baseState: LegalWorkflowState = {
  id: 'test', createdAt: 1, updatedAt: 1, currentStep: 'COMPLETED', factHistory: [], userNarrative: '測試案情',
  router: { domain: '民事', chapter: 'CIVIL_TORT_GENERAL', cause: '侵權行為', is_sensitive: false, is_complete: true, missing_elements: [] },
  rag: { searchQuery: '民法第184條', legalElements: '侵權要件', statuteCitations: ['民法第184條', '民法第195條'], precedents: [] },
  syllogism: { majorPremise: '法律規則', minorPremise: '案件事實', subsumption: '要件比對', conclusion: '得請求損害賠償。', fullAnalysis: '完整分析內容' },
  verification: {
    totalChecked: 1, ghostCount: 0, results: [], sanitizedText: '完整分析內容', passGate: true, verificationStatus: 'PASS',
    officialEvidence: [{ citation: '民法第184條', type: 'STATUTE', status: 'VALID', source: '全國法規資料庫', sourceUrl: 'https://law.moj.gov.tw/', checkedAt: '2026-09-11', claimSupportStatus: 'SUPPORTED' }],
  },
};

const handlers = {
  isCopied: false,
  handleCopyAnalysis: vi.fn(),
  exportAsHtml: vi.fn(),
  exportAsText: vi.fn(),
  printReport: vi.fn(),
};

describe('UnifiedResult', () => {
  it('shows a verified result first, deduplicates evidence, and keeps reasoning collapsed', () => {
    render(<UnifiedResult workflowState={baseState} {...handlers} />);

    expect(screen.getByText('分析結論')).toBeInTheDocument();
    expect(screen.getByText('已確認支持本結論')).toBeInTheDocument();
    expect(screen.getByText(/民法第195條/)).toBeInTheDocument();
    expect(screen.getAllByText('民法第184條')).toHaveLength(1);
    const details = screen.getByText('深入了解分析依據').closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText('深入了解分析依據'));
    expect(details.open).toBe(true);
    expect(screen.getByRole('button', { name: '複製' })).toBeEnabled();
  });

  it('shows failed citations and disables result actions', () => {
    const failed: LegalWorkflowState = {
      ...baseState,
      verification: {
        ...baseState.verification!, passGate: false, verificationStatus: 'FAIL', ghostCount: 1,
        results: [{ verified: false, citationText: '民法第9999條', type: 'STATUTE', officialTitle: '', officialSourceUrl: '', isGhostOrFake: true, hallucinationRisk: 'FAKE_GHOST_CITATION', correctionSuggestion: '查無此條文' }],
        officialEvidence: [{ citation: '民法第184條', type: 'STATUTE', status: 'VALID', source: '全國法規資料庫', sourceUrl: 'https://law.moj.gov.tw/', checkedAt: '2026-09-11', claimSupportStatus: 'NEEDS_REVIEW' }],
      },
    };

    render(<UnifiedResult workflowState={failed} {...handlers} />);
    expect(screen.getByText('需先修正的引用')).toBeInTheDocument();
    expect(screen.getByText(/民法第9999條/)).toBeInTheDocument();
    expect(screen.getByText('來源存在，但未確認支持本主張')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '複製' })).toBeDisabled();
  });

  it('fails closed when a legacy result lacks the explicit verification status', () => {
    const legacy = { ...baseState, verification: { ...baseState.verification!, verificationStatus: undefined } };
    expect(canUseWorkflowResult(legacy)).toBe(false);
  });
});
