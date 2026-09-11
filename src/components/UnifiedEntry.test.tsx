import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedEntry } from './UnifiedEntry';
import { ToolProvider } from '../contexts/ToolContext';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';

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

  it('renders a facts-only analysis input without judgment upload controls', () => {
    renderComponent();

    expect(screen.getByText('案件事實描述')).toBeInTheDocument();
    expect(screen.getByText(/輸入口語案情，系統會先追問關鍵事實/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始分析' })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/上傳裁判書/)).not.toBeInTheDocument();
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

});
