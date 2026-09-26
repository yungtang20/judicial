import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardView, { LegalConceptList } from './DashboardView';
import { apiClient } from '../../lib/apiClient';
import type { CaseDocumentArtifact } from '../../domain/case/types';

const VERIFIED_TEXT = '依民法第184條第1項前段規定，請求被告給付損害賠償。';

const verifiedDocument: CaseDocumentArtifact = {
  id: 'doc-1',
  kind: 'PLEADING',
  title: '民事起訴狀',
  text: VERIFIED_TEXT,
  status: 'VERIFIED',
  sourceTool: 'UNIVERSAL_AI_PLEADING',
  createdAt: '2026-01-01T00:00:00.000Z'
};

describe('DashboardView', () => {
  it('shows safety, evidence and bundle sections from triage data', () => {
    render(<DashboardView result={{ isSensitive: true, protectionNotice: '請先確保安全', plainExplanation: '摘要', evidenceChecklist: ['截圖'], recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' }} />);
    expect(screen.getByText('請先確保安全')).toBeTruthy();
    expect(screen.getByText('截圖')).toBeTruthy();
    expect(screen.getByText('CIVIL_COMPLAINT_GENERAL')).toBeTruthy();
  });

  it('routes bundle selection to the supplied generation callback', () => {
    const onSelectBundle = vi.fn();
    render(<DashboardView result={{ recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' }} onSelectBundle={onSelectBundle} />);
    fireEvent.click(screen.getByRole('button', { name: 'CIVIL_COMPLAINT_GENERAL' }));
    expect(onSelectBundle).toHaveBeenCalledWith('CIVIL_COMPLAINT_GENERAL');
  });

  it('explains a legal concept after it is selected', () => {
    render(<LegalConceptList concepts={['民法第184條']} status="待確認" />);
    fireEvent.click(screen.getByRole('button', { name: '民法第184條' }));
    expect(screen.getByRole('status')).toHaveTextContent('民法第184條');
  });

  it('以已產製文件開啟立案指引與草稿微調，並帶入真實文件內容', async () => {
    const draftRefine = vi.spyOn(apiClient, 'draftRefine').mockResolvedValue({ draftText: VERIFIED_TEXT });
    render(<DashboardView result={{ recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' }} documents={[verifiedDocument]} />);

    expect(screen.getByLabelText('立案指引')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('例如：改成較正式語氣，補充已知事實'), { target: { value: '改為較正式語氣' } });
    fireEvent.click(screen.getByRole('button', { name: '送出微調' }));

    await waitFor(() => expect(draftRefine).toHaveBeenCalledWith({ draftText: VERIFIED_TEXT, instruction: '改為較正式語氣', allowedCitations: [] }));
    draftRefine.mockRestore();
  });

  it('沒有已產製文件時不渲染立案指引與草稿微調', () => {
    render(<DashboardView result={{ recommendedToolId: 'CIVIL_COMPLAINT_GENERAL', pleadingDraft: '客戶端捏造的書狀草稿' }} />);
    expect(screen.queryByLabelText('立案指引')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('對話式草稿微調')).not.toBeInTheDocument();
  });

  it('未驗證的產製文件不足以開啟立案指引與草稿微調', () => {
    render(<DashboardView result={{ recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' }} documents={[{ ...verifiedDocument, status: 'NEEDS_HUMAN_REVIEW' }]} />);
    expect(screen.queryByLabelText('立案指引')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('對話式草稿微調')).not.toBeInTheDocument();
  });
});
