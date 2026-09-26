import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { UnifiedResult, buildProcedureSteps, calculateLegalPeriodEstimates, canUseWorkflowResult, countMatchingPrecedents, formatStatuteCitation } from './UnifiedResult';

const baseState: LegalWorkflowState = {
  id: 'test', createdAt: 1, updatedAt: 1, currentStep: 'COMPLETED', factHistory: [], userNarrative: '測試案情',
  router: { domain: '民事', chapter: 'CIVIL_TORT_GENERAL', cause: '侵權行為', is_sensitive: false, is_complete: true, missing_elements: [], legalBasis: ['民法第184條（侵權行為損害賠償）'], statuteOfLimitations: '知悉損害及賠償義務人起2年', suggestedActions: ['寄發催告函'] },
  rag: { searchQuery: '民法第184條', legalElements: '侵權要件', statuteCitations: ['民法第184條', '民法第195條'], interpretations: [{ citation: '法務部法律字第1號函', title: '侵權責任函釋', excerpt: '應核對損害及因果關係', sourceUrl: 'https://mojlaw.moj.gov.tw/' }], precedents: [{ caseNumber: '最高法院112年度台上字第9號', courtName: '最高法院', summary: '本件依民法第184條判決', citedStatutes: ['民法第184條'], sourceUrl: 'https://judgment.judicial.gov.tw/' }] },
  syllogism: { majorPremise: '法律規則', minorPremise: '案件事實', subsumption: '要件比對', conclusion: '得請求損害賠償。', fullAnalysis: '完整分析內容' },
  verification: {
    totalChecked: 1, ghostCount: 0, results: [], sanitizedText: '完整分析內容', passGate: true, verificationStatus: 'PASS',
    externalCitations: [{ citation: '最高法院112年度台上字第9號', status: 'verified', exactMatch: true, source: 'dr-lawbot', message: '字號吻合', searchUrl: 'https://api.dr-lawbot.com/' }],
    officialEvidence: [
      { citation: '民法第184條', type: 'STATUTE', status: 'VALID', source: '全國法規資料庫', sourceUrl: 'https://law.moj.gov.tw/', checkedAt: '2026-09-11', claimSupportStatus: 'SUPPORTED' },
      { citation: '最高法院112年度台上字第9號', type: 'PRECEDENT', status: 'VERIFIED', source: '司法院裁判書系統', sourceUrl: 'https://judgment.judicial.gov.tw/', checkedAt: '2026-09-11', contentHash: 'a'.repeat(64) },
    ],
  },
  safety: {
    emergencyHotlines: [{ label: '緊急報案', number: '110', desc: '有人身危險時' }],
    preservationTips: ['保存原始對話'], immediateSteps: ['立即離開危險現場'], acknowledged: true,
  },
};

const handlers = {
  isCopied: false,
  handleCopyAnalysis: vi.fn(),
  exportAsHtml: vi.fn(),
  exportAsText: vi.fn(),
  printReport: vi.fn(),
  handleSelectTool: vi.fn(),
};

describe('UnifiedResult', () => {
  it('adds the existing legal name to a statute citation', () => {
    expect(formatStatuteCitation('刑法第221條')).toBe('刑法第221條（強制性交罪）');
    expect(buildProcedureSteps('刑事')).toContain('檢察官決定起訴或不起訴；起訴後由刑事法院審理');
    expect(calculateLegalPeriodEstimates('公訴罪無6個月限制；民事請求權為2年', '2024-09-11')).toEqual([{ period: '2年', deadline: '2026-09-11' }]);
  });

  it('shows a verified result first, deduplicates evidence, and keeps reasoning collapsed', () => {
    render(<UnifiedResult workflowState={baseState} {...handlers} />);

    expect(screen.getByText('分析結論')).toBeInTheDocument();
    expect(screen.getByText('可以使用｜已確認支持目前結論')).toBeInTheDocument();
    expect(countMatchingPrecedents(baseState, '民法第184條')).toBe(1);
    expect(screen.getByText('對應案件事實')).toBeInTheDocument();
    expect(screen.getByText('可能涉及的法條與名稱')).toBeInTheDocument();
    expect(screen.getByText('相關函釋')).toBeInTheDocument();
    expect(screen.getByText('需備證據')).toBeInTheDocument();
    expect(screen.getByText('行動指引')).toBeInTheDocument();
    expect(screen.queryByText('大家也在問')).not.toBeInTheDocument();
    expect(screen.getByText('引用相同法條的官方裁判')).toBeInTheDocument();
    const sectionOrder = ['對應案件事實', '可能涉及的法條與名稱', '相關函釋', '需備證據', '行動指引', '引用相同法條的官方裁判']
      .map(label => screen.getByText(label));
    expect(sectionOrder.every((node, index) => index === 0 || Boolean(sectionOrder[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect(screen.getByText('民法第184條（侵權行為損害賠償）')).toBeInTheDocument();
    expect(screen.getByText(/已通過司法院全文查核/)).toBeInTheDocument();
    expect(screen.getByText(/僅代表法條相同，不代表事實類同/)).toBeInTheDocument();
    // 熱線由保護面板統一呈現，行動指引此處過濾 113／110／1925 避免同一支專線出現兩次
    expect(screen.queryByText(/緊急報案：110/)).not.toBeInTheDocument();
    expect(screen.getByText(/期限／試算基準/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('法定期間起算日'), { target: { value: '2024-09-11' } });
    expect(screen.getByText('• 2年初估截止日：2026-09-11')).toBeInTheDocument();
    expect(screen.getByText(/已排除 1 則僅條號相同但內容與本案爭點無關的函釋/)).toBeInTheDocument();
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
        warningNotice: '官方資料庫未能逐筆確認所有引用，已 fail-closed 並標註待人工審查。',
        officialEvidence: [{ citation: '民法第184條', type: 'STATUTE', status: 'VERIFIED', source: '全國法規資料庫', sourceUrl: 'https://law.moj.gov.tw/', checkedAt: '2026-09-11', claimSupportStatus: 'NEEDS_REVIEW' }],
      },
    };

    render(<UnifiedResult workflowState={failed} {...handlers} />);
    expect(screen.getByText('需先修正的引用')).toBeInTheDocument();
    expect(screen.getByText(/民法第9999條/)).toBeInTheDocument();
    expect(screen.getByText('僅供參考｜尚未找到同法條的相關裁判')).toBeInTheDocument();
    expect(screen.getByText(/目前沒有通過司法院全文與 AI 防幽靈檢核的相關裁判/)).toBeInTheDocument();
    expect(screen.queryByText(/fail-closed/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '複製' })).toBeDisabled();
  });

  it('fails closed when a legacy result lacks the explicit verification status', () => {
    const legacy = { ...baseState, verification: { ...baseState.verification!, verificationStatus: undefined } };
    expect(canUseWorkflowResult(legacy)).toBe(false);
  });
});
