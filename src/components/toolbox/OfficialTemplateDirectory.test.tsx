import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWithAuth } = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));

vi.mock('../../lib/apiClient', () => ({ fetchWithAuth }));

import { OfficialTemplateDirectory } from './OfficialTemplateDirectory';

const response = (body: unknown, ok = true) => Promise.resolve({
  ok,
  status: ok ? 200 : 422,
  json: () => Promise.resolve(body),
  blob: () => Promise.resolve(new Blob(['official-source'])),
});

describe('OfficialTemplateDirectory', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
    fetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/official-templates') {
        return response({ categories: [{ name: '刑事', total: 72, readyForMerge: 0, needsFieldMapping: 72, downloaded: 0, sourceOnly: 0, sourceLinks: 72 }] });
      }
      if (url.includes('?category=')) {
        return response({ templates: [{
          id: 'judicial-0202-1', code: '0202', name: '答辯狀', category: '刑事',
          sourcePageUrl: 'https://www.judicial.gov.tw/example', officialUpdatedAt: '110-12-23',
          templateStatus: 'NEEDS_FIELD_MAPPING', hasEditableFile: true, hasPdf: true,
        }] });
      }
      if (url.endsWith('/source')) return response(new Blob(['official-source']));
      return response({
        id: 'judicial-0202-1', code: '0202', name: '答辯狀', category: '刑事',
        sourcePageUrl: 'https://www.judicial.gov.tw/example', editableFileUrl: 'https://www.judicial.gov.tw/editable',
        pdfFileUrl: 'https://www.judicial.gov.tw/pdf', officialUpdatedAt: '110-12-23',
        templateStatus: 'NEEDS_FIELD_MAPPING', hasEditableFile: true, hasPdf: true,
        localFileHash: 'hash', downloadedAt: '2026-09-15', fields: [],
      });
    });
  });

  it('lists categories and keeps an unmapped template non-renderable', async () => {
    render(<OfficialTemplateDirectory />);

    expect(await screen.findByText(/待對應 72 份/)).toBeInTheDocument();
    expect(screen.getByText(/官方來源 72 份/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /刑事/ }));
    fireEvent.click(await screen.findByRole('button', { name: /答辯狀/ }));

    expect(await screen.findByText('待欄位對應')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下載套版文件/ })).not.toBeInTheDocument();
  });

  it('keeps official template rendering disabled until the P9 flow exists', async () => {
    fetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/official-templates') {
        return response({ categories: [{ name: '刑事', total: 1, readyForMerge: 1, needsFieldMapping: 0, downloaded: 1, sourceOnly: 0, sourceLinks: 1 }] });
      }
      if (url.includes('?category=')) {
        return response({ templates: [{
          id: 'judicial-0202-1', code: '0202', name: '答辯狀', category: '刑事',
          sourcePageUrl: 'https://www.judicial.gov.tw/example', officialUpdatedAt: '110-12-23',
          templateStatus: 'READY_FOR_MERGE', hasEditableFile: true, hasPdf: true,
        }] });
      }
      return response({
        id: 'judicial-0202-1', code: '0202', name: '答辯狀', category: '刑事',
        sourcePageUrl: 'https://www.judicial.gov.tw/example', editableFileUrl: 'https://www.judicial.gov.tw/editable',
        pdfFileUrl: 'https://www.judicial.gov.tw/pdf', officialUpdatedAt: '110-12-23',
        templateStatus: 'READY_FOR_MERGE', hasEditableFile: true, hasPdf: true,
        localFileHash: 'hash', downloadedAt: '2026-09-15', fields: [{ key: 'name', label: '姓名', type: 'text', required: true }],
      });
    });

    render(<OfficialTemplateDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: /刑事/ }));
    fireEvent.click(await screen.findByRole('button', { name: /答辯狀/ }));

    expect(await screen.findByText(/尚未取得 P9 Final Gate/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下載套版文件/ })).not.toBeInTheDocument();
  });

  it('keeps the latest category response when an older request finishes later', async () => {
    let resolveA!: (value: ReturnType<typeof response>) => void;
    let resolveB!: (value: ReturnType<typeof response>) => void;
    fetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/official-templates') {
        return response({ categories: [
          { name: 'A', total: 1, readyForMerge: 1, needsFieldMapping: 0, downloaded: 1, sourceOnly: 0, sourceLinks: 1 },
          { name: 'B', total: 1, readyForMerge: 1, needsFieldMapping: 0, downloaded: 1, sourceOnly: 0, sourceLinks: 1 },
        ] });
      }
      if (url.endsWith('category=A')) {
        return new Promise<ReturnType<typeof response>>(resolve => { resolveA = resolve; });
      }
      if (url.endsWith('category=B')) {
        return new Promise<ReturnType<typeof response>>(resolve => { resolveB = resolve; });
      }
      return response({ templates: [] });
    });

    render(<OfficialTemplateDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: /A/ }));
    fireEvent.click(await screen.findByRole('button', { name: '返回全部分類' }));
    fireEvent.click(await screen.findByRole('button', { name: /B/ }));

    resolveB(response({ templates: [{ id: 'b', name: 'B目前範本', category: 'B' }] }));
    expect(await screen.findByText('B目前範本')).toBeInTheDocument();
    await act(async () => {
      resolveA(response({ templates: [{ id: 'a', name: 'A舊範本', category: 'A' }] }));
    });
    expect(screen.queryByText('A舊範本')).not.toBeInTheDocument();
    expect(screen.getByText('B目前範本')).toBeInTheDocument();
  });

  it('downloads the verified original without enabling template rendering', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:official-source');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<OfficialTemplateDirectory />);

    fireEvent.click(await screen.findByRole('button', { name: /刑事/ }));
    fireEvent.click(await screen.findByRole('button', { name: /答辯狀/ }));
    fireEvent.click(await screen.findByRole('button', { name: '下載本站驗證官方原始檔' }));

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/official-templates/judicial-0202-1/source'));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect((anchorClick.mock.instances[0] as HTMLAnchorElement).download).toBe('judicial-0202-1.odt');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:official-source');
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
