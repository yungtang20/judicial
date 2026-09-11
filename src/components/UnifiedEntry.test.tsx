import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedEntry } from './UnifiedEntry';
import * as pdfUtils from '../lib/pdfUtils';
import { ToolProvider } from '../contexts/ToolContext';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';
import { fetchWithAuth } from '../lib/apiClient';

// Mock pdfUtils
vi.mock('../lib/pdfUtils', () => ({
  extractPdfText: vi.fn(),
  parsePdfFile: vi.fn()
}));

// Mock apiClient fetchWithAuth
vi.mock('../lib/apiClient', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({})
  })
}));

describe('UnifiedEntry component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <GlobalUIProvider><ToolProvider>
        <UnifiedEntry />
      </ToolProvider></GlobalUIProvider>
    );
  };

  it('renders colloquial facts input and mentions Judicial Yuan PDF / TXT support', () => {
    renderComponent();

    // Verifies helper text mentions both colloquial facts and Judicial Yuan PDF/TXT upload
    expect(screen.getByText(/支援口語輸入自動提煉爭點/)).toBeInTheDocument();
    expect(screen.getByText(/拖曳上傳裁判書（\.pdf \/ \.txt）/)).toBeInTheDocument();

    // Check button label
    expect(screen.getByText(/上傳裁判書 \(PDF\/TXT\)/)).toBeInTheDocument();

    // Check file input attributes
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toContain('.pdf');
    expect(fileInput.accept).toContain('.txt');
  });

  it('loads colloquial fact sample into textarea when selected', () => {
    renderComponent();

    fireEvent.change(screen.getByRole('combobox', { name: '載入範例案件' }), {
      target: { value: '4' },
    });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('我上個月在蝦皮買了一台二手筆電');
    expect(textarea.value).toContain('我現在該怎麼告他詐欺或要回錢？');
  });

  it('handles uploading a single Judicial Yuan PDF judgment document', async () => {
    vi.mocked(pdfUtils.extractPdfText).mockResolvedValue(
      '臺灣臺北地方法院 113 年度訴字第 999 號民事判決。原告主張被告積欠買賣價金新台幣 50 萬元...'
    );

    renderComponent();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfFile = new File(['%PDF-1.4 dummy'], 'judgment_113_999.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(pdfUtils.extractPdfText).toHaveBeenCalledWith(pdfFile);
    });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toContain('臺灣臺北地方法院 113 年度訴字第 999 號民事判決');
    });

    fireEvent.click(screen.getByRole('button', { name: '分析裁判書' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/workflow/execute', expect.objectContaining({
      body: expect.stringContaining('"inputType":"judgment_document"'),
    })));
  });

  it('handles batch uploading multiple Judicial Yuan PDF documents and enables queue navigation', async () => {
    vi.mocked(pdfUtils.extractPdfText)
      .mockResolvedValueOnce('第一審判決：臺灣臺北地方法院 112 年度訴字第 100 號判決')
      .mockResolvedValueOnce('第二審判決：臺灣高等法院 113 年度上字第 200 號民事判決');

    renderComponent();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf1 = new File(['pdf1'], '112_su_100.pdf', { type: 'application/pdf' });
    const pdf2 = new File(['pdf2'], '113_shang_200.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [pdf1, pdf2] } });

    await waitFor(() => {
      expect(screen.getByText(/批量模式：第 1 \/ 2 份/)).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('第一審判決');

    // Click Next
    const nextBtn = screen.getByText('下一份');
    fireEvent.click(nextBtn);

    expect(screen.getByText(/批量模式：第 2 \/ 2 份/)).toBeInTheDocument();
    expect(textarea.value).toContain('第二審判決');
  });
});
