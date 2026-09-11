import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalDocAiChecker } from './LegalDocAiChecker';

vi.mock('../lib/pdfUtils', () => ({ extractPdfText: vi.fn().mockResolvedValue('最高法院112年度台上字第9號判決') }));

describe('LegalDocAiChecker', () => {
  it('imports PDF text for ghost-citation scanning', async () => {
    render(<LegalDocAiChecker />);
    const input = screen.getByLabelText('上傳 PDF 或 TXT 文件');

    fireEvent.change(input, { target: { files: [new File(['pdf'], 'judgment.pdf', { type: 'application/pdf' })] } });

    expect(await screen.findByText('已匯入 judgment.pdf，可開始掃描。')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/請貼上對造書狀/)).toHaveValue('最高法院112年度台上字第9號判決');
  });
});
