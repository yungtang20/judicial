import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolProvider } from '../contexts/ToolContext';
import { LegalGuideHome } from './LegalGuideHome';
import { SCENARIOS } from './guide/guideData';

describe('LegalGuideHome', () => {
  it('renders scenario categories and guidance cards', () => {
    render(<ToolProvider><LegalGuideHome /></ToolProvider>);

    expect(screen.getByText('生活法律導診')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '描述你遇到的狀況' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部生活情境' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '或直接選擇常見情境' })).toBeInTheDocument();
    expect(screen.queryByText(/訴訟與上訴一站式中心/)).not.toBeInTheDocument();
    expect(screen.queryByText(/判決檢索與 AI 防幽靈檢核/)).not.toBeInTheDocument();
    expect(SCENARIOS.every(scenario => scenario.targetToolId === 'legalToolbox')).toBe(true);
  });
});
