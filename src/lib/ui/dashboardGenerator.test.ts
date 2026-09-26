import { describe, expect, it } from 'vitest';
import { buildDashboardModel, selectVerifiedDocumentText } from './dashboardGenerator';
import type { CaseDocumentArtifact } from '../../domain/case/types';

const VERIFIED_TEXT = '依民法第184條第1項前段規定，請求被告給付損害賠償。';

const artifact = (overrides: Partial<CaseDocumentArtifact> = {}): CaseDocumentArtifact => ({
  id: 'doc-1',
  kind: 'PLEADING',
  title: '民事起訴狀',
  text: VERIFIED_TEXT,
  status: 'VERIFIED',
  sourceTool: 'UNIVERSAL_AI_PLEADING',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

describe('selectVerifiedDocumentText', () => {
  it('只採用已驗證或已人工核准的產製文件', () => {
    expect(selectVerifiedDocumentText([artifact({ status: 'DRAFT' })])).toBe('');
    expect(selectVerifiedDocumentText([artifact({ status: 'NEEDS_HUMAN_REVIEW' })])).toBe('');
    expect(selectVerifiedDocumentText([artifact({ status: 'VERIFIED' })])).toBe(VERIFIED_TEXT);
    expect(selectVerifiedDocumentText([artifact({ status: 'HUMAN_APPROVED' })])).toBe(VERIFIED_TEXT);
  });

  it('取最新一份已驗證文件，並略過空白內容與缺少 documents 的情形', () => {
    const older = artifact({ id: 'older', text: '舊版書狀', createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = artifact({ id: 'newer', text: '新版書狀', createdAt: '2026-02-01T00:00:00.000Z' });
    expect(selectVerifiedDocumentText([older, newer])).toBe('新版書狀');
    expect(selectVerifiedDocumentText([newer, artifact({ id: 'blank', text: '   ', createdAt: '2026-03-01T00:00:00.000Z' })])).toBe('新版書狀');
    expect(selectVerifiedDocumentText(undefined)).toBe('');
    expect(selectVerifiedDocumentText([])).toBe('');
  });
});

describe('buildDashboardModel 立案指引可見度', () => {
  it('有已產製文件時立案指引與草稿文字皆可達', () => {
    const model = buildDashboardModel({ plainExplanation: '摘要' }, [artifact()]);
    expect(model.draftText).toBe(VERIFIED_TEXT);
    expect(model.filing.visible).toBe(true);
  });

  it('沒有已產製文件時不可達，且不再回應已刪除的客戶端草稿欄位', () => {
    const model = buildDashboardModel({ plainExplanation: '摘要', pleadingDraft: '客戶端捏造的書狀草稿' }, []);
    expect(model.draftText).toBe('');
    expect(model.filing.visible).toBe(false);
  });
});
