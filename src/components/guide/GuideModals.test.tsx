import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GuideModals } from './GuideModals';
import { useCaseStore } from '../../store/useCaseStore';
import { generateBundleDocument } from '../../lib/ui/bundleDelivery';
import type { CaseDocumentArtifact } from '../../domain/case/types';

vi.mock('../../lib/ui/bundleDelivery', () => ({ generateBundleDocument: vi.fn() }));

const VERIFIED_TEXT = '依民法第184條第1項前段規定，請求被告給付損害賠償。';

const verifiedDocument: CaseDocumentArtifact = {
  id: 'doc-1',
  kind: 'PLEADING',
  title: '民事起訴狀',
  text: VERIFIED_TEXT,
  status: 'HUMAN_APPROVED',
  sourceTool: 'UNIVERSAL_AI_PLEADING',
  createdAt: '2026-01-01T00:00:00.000Z'
};

const setCaseDocuments = (documents: CaseDocumentArtifact[]) => {
  useCaseStore.setState({
    activeCaseId: 'active-case',
    cases: {
      'active-case': {
        schemaVersion: 1,
        caseId: 'active-case',
        workflowStage: 'INGEST',
        facts: '',
        issues: [],
        evidences: [],
        candidateCitations: [],
        deadlines: [],
        documents,
        approvals: [],
        updatedAt: new Date(0).toISOString()
      }
    }
  });
};

const renderModals = (aiTriageResult: Record<string, unknown>) => render(<GuideModals
  searchQuery="借貸還款"
  setSearchQuery={vi.fn()}
  selectedCategory={null}
  setSelectedCategory={vi.fn()}
  selectedScenario={null}
  setSelectedScenario={vi.fn()}
  showAiTriageModal
  setShowAiTriageModal={vi.fn()}
  aiTriageLoading={false}
  setAiTriageLoading={vi.fn()}
  aiTriageResult={aiTriageResult}
  setAiTriageResult={vi.fn()}
  copiedDraft={null}
  setCopiedDraft={vi.fn()}
  syllogismAnswers={{}}
  setSyllogismAnswers={vi.fn()}
  sourceTab="statutes"
  setSourceTab={vi.fn()}
  isSafetyQuery={false}
  filteredScenarios={[]}
  categories={[]}
  QUICK_TAGS={[]}
  handleRunAiTriage={vi.fn()}
  handleLaunchScenario={vi.fn()}
  handleSelectTool={vi.fn()}
/>);

const triageResult = { plainExplanation: '對方借款未還。', recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' };

describe('GuideModals 已產製文件來源', () => {
  beforeEach(() => {
    vi.mocked(generateBundleDocument).mockReset();
    vi.mocked(generateBundleDocument).mockResolvedValue({ documentText: '已交付書狀', documentTitle: '民事起訴狀' });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:mock') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('產製 Bundle 時帶入案件卷內已核准的真實文件文字', async () => {
    setCaseDocuments([verifiedDocument]);
    renderModals(triageResult);

    fireEvent.click(screen.getByRole('button', { name: 'CIVIL_COMPLAINT_GENERAL' }));

    await waitFor(() => expect(generateBundleDocument).toHaveBeenCalledWith(
      'CIVIL_COMPLAINT_GENERAL',
      '借貸還款',
      VERIFIED_TEXT,
      expect.any(Function),
      {}
    ));
  });

  it('案件卷內已有已核准文件時，立案指引與草稿微調可達', () => {
    setCaseDocuments([verifiedDocument]);
    renderModals(triageResult);

    expect(screen.getByLabelText('立案指引')).toBeInTheDocument();
    expect(screen.getByLabelText('對話式草稿微調')).toBeInTheDocument();
  });

  it('沒有已產製文件時，立案指引與草稿微調都不渲染，且不採用導診結果內的草稿欄位', () => {
    setCaseDocuments([]);
    renderModals({ ...triageResult, pleadingDraft: '客戶端捏造的書狀草稿' });

    expect(screen.queryByLabelText('立案指引')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('對話式草稿微調')).not.toBeInTheDocument();
  });

  it('沒有已產製文件時，產製 Bundle 不會送出任何草稿文字', async () => {
    setCaseDocuments([]);
    renderModals(triageResult);

    fireEvent.click(screen.getByRole('button', { name: 'CIVIL_COMPLAINT_GENERAL' }));

    await waitFor(() => expect(generateBundleDocument).toHaveBeenCalledWith(
      'CIVIL_COMPLAINT_GENERAL',
      '借貸還款',
      '',
      expect.any(Function),
      {}
    ));
  });
});
