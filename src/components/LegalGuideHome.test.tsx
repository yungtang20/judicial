import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolProvider } from '../contexts/ToolContext';
import { LegalGuideHome } from './LegalGuideHome';

describe('LegalGuideHome', () => {
  it('renders scenario categories and guidance cards', () => {
    render(<ToolProvider><LegalGuideHome /></ToolProvider>);

    expect(screen.getByText('非法律專業專用 · 生活法律導診')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /您遇到什麼法律問題/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部生活情境' })).toBeInTheDocument();
    expect(screen.getByText(/常見法律狀況速查指引/)).toBeInTheDocument();
  });
});
