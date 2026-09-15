import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWithAuth } = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));

vi.mock('../../lib/apiClient', () => ({ fetchWithAuth }));

import { OfficialTemplateDirectory } from './OfficialTemplateDirectory';

const response = (body: unknown, ok = true) => Promise.resolve({
  ok,
  status: ok ? 200 : 422,
  json: () => Promise.resolve(body),
});

describe('OfficialTemplateDirectory', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
    fetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/official-templates') {
        return response({ categories: [{ name: '刑事', total: 72, readyForMerge: 0, sourceOnly: 71 }] });
      }
      if (url.includes('?category=')) {
        return response({ templates: [{
          id: 'judicial-0202-1', code: '0202', name: '答辯狀', category: '刑事',
          sourcePageUrl: 'https://www.judicial.gov.tw/example', officialUpdatedAt: '110-12-23',
          templateStatus: 'NEEDS_FIELD_MAPPING', hasEditableFile: true, hasPdf: true,
        }] });
      }
      return response({
        id: 'judicial-0202-1', code: '0202', name: '答辯狀', category: '刑事',
        sourcePageUrl: 'https://www.judicial.gov.tw/example', editableFileUrl: 'https://www.judicial.gov.tw/editable',
        pdfFileUrl: 'https://www.judicial.gov.tw/pdf', officialUpdatedAt: '110-12-23',
        templateStatus: 'NEEDS_FIELD_MAPPING', localFileHash: 'hash', downloadedAt: '2026-09-15', fields: [],
      });
    });
  });

  it('lists categories and keeps an unmapped template non-renderable', async () => {
    render(<OfficialTemplateDirectory />);

    fireEvent.click(await screen.findByRole('button', { name: /刑事/ }));
    fireEvent.click(await screen.findByRole('button', { name: /答辯狀/ }));

    expect(await screen.findByText('待欄位對應')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下載套版文件/ })).not.toBeInTheDocument();
  });

  it('shows an empty state for an unmatched category search', async () => {
    render(<OfficialTemplateDirectory searchQuery="不存在的分類" />);
    expect(await screen.findByRole('status')).toHaveTextContent('找不到符合');
  });

  it('shows a visible error when the catalog request fails', async () => {
    fetchWithAuth.mockImplementationOnce(() => response({ error: 'unavailable' }, false));
    render(<OfficialTemplateDirectory />);
    expect(await screen.findByRole('alert')).toHaveTextContent('無法載入司法院範本目錄');
  });
});
