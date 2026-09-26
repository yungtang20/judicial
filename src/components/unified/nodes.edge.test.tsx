import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CitationNode } from './CitationNode';
import { VerificationNode } from './VerificationNode';
import { createInitialWorkflowState } from '../../lib/workflow/unifiedStateGraph';

vi.mock('../../lib/legalChapterLabels', async () => {
  const actual = await vi.importActual<typeof import('../../lib/legalChapterLabels')>('../../lib/legalChapterLabels');
  return { ...actual, formatLegalChapter: () => '債編', formatVerificationStatus: (s?: string | null) => String(s ?? '') };
});

const base = () => {
  const state = createInitialWorkflowState('測試案情');
  state.router = { domain: '民事', chapter: '債', cause: '租賃', is_sensitive: false, is_complete: true, missing_elements: [] };
  state.syllogism = { majorPremise: 'a', minorPremise: 'b', subsumption: 'c', conclusion: 'd', fullAnalysis: 'e' };
  return state;
};

const shared = { setIsNode4Open: vi.fn(), setIsNode5Open: vi.fn() };

describe('CitationNode 邊界資料', () => {
  it('rag 存在但所有陣列為空時不得拋錯，應顯示 0 筆', () => {
    const state = base();
    state.rag = { searchQuery: '', legalElements: '', statuteCitations: [], precedents: [] };
    render(<CitationNode {...shared} workflowState={state} />);
    expect(screen.getByText(/法規 0 筆 · 判例 0 筆/)).toBeInTheDocument();
  });

  it('rag 完全不存在時整段不渲染', () => {
    const state = base();
    expect(state.rag).toBeUndefined();
    const { container } = render(<CitationNode {...shared} workflowState={state} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('officialEvidence 含缺欄位或空字串的條目時不得拋錯', () => {
    const state = base();
    state.rag = {
      searchQuery: 'q',
      legalElements: 'e',
      statuteCitations: ['民法第184條', ''],
      precedents: [],
      officialEvidence: [
        { citation: '民法第184條', type: 'STATUTE', status: 'VERIFIED', source: '', sourceUrl: '', checkedAt: '' },
        { citation: '', type: 'STATUTE', status: 'UNAVAILABLE', source: '', sourceUrl: '', checkedAt: '' }
      ]
    };
    expect(() => render(<CitationNode {...shared} workflowState={state} />)).not.toThrow();
    expect(screen.getByText(/法規 2 筆/)).toBeInTheDocument();
  });

  it('判例缺 courtName 與 citedStatutes 時不得拋錯', () => {
    const state = base();
    state.rag = {
      searchQuery: 'q',
      legalElements: 'e',
      statuteCitations: [],
      precedents: [{ caseNumber: '110年度訴字第1號', courtName: '', summary: '' }]
    };
    expect(() => render(<CitationNode {...shared} workflowState={state} />)).not.toThrow();
  });
});

describe('VerificationNode 邊界資料', () => {
  it('verification 不存在時整段不渲染', () => {
    const state = base();
    const { container } = render(<VerificationNode {...shared} workflowState={state} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('異常數大於 0 時必須呈現為待人工審核，不得顯示檢核通過', () => {
    const state = base();
    state.verification = {
      totalChecked: 10, ghostCount: 3, results: [], sanitizedText: '',
      passGate: false, verificationStatus: 'FAIL'
    };
    render(<VerificationNode {...shared} workflowState={state} />);
    expect(screen.getByText('真確性檢核結果')).toBeInTheDocument();
    expect(screen.getByText(/檢核 10 處 · 異常 3 處/)).toBeInTheDocument();
  });

  it('verificationStatus 為未知值時不得崩潰', () => {
    const state = base();
    state.verification = {
      totalChecked: 0, ghostCount: 0, results: [], sanitizedText: '',
      passGate: false, verificationStatus: undefined
    };
    expect(() => render(<VerificationNode {...shared} workflowState={state} />)).not.toThrow();
  });

  it('results 含欄位缺漏的項目時不得拋錯', () => {
    const state = base();
    state.verification = {
      totalChecked: 1, ghostCount: 0,
      results: [{ citationText: '民法第184條' } as never],
      sanitizedText: '', passGate: true, verificationStatus: 'PASS'
    };
    expect(() => render(<VerificationNode {...shared} workflowState={state} />)).not.toThrow();
  });
});
