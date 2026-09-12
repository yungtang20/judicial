import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LEGAL_TOOLS, TOOLBOX_CATEGORIES } from '../../lib/legalToolRegistry';
import { ToolboxHeader, TOOLBOX_GROUPS } from './ToolboxHeader';
import { ToolSelectorGrid } from './ToolSelectorGrid';

describe('legal toolbox classification (Dingchuan 4-Core Categories)', () => {
  it('offers the 5 consistent life-situation categories matching Dingchuan layout', () => {
    const onSelectGroup = vi.fn();
    render(
      <ToolboxHeader
        selectedGroup="ALL"
        onSelectGroup={onSelectGroup}
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: '核心爭議情境分類' })).toBeInTheDocument();
    
    // 檢查四大分類
    for (const cat of TOOLBOX_CATEGORIES) {
      expect(screen.getByRole('button', { name: new RegExp(cat.name) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: /討債 · 金錢糾紛/ }));
    expect(onSelectGroup).toHaveBeenCalledWith('DEBT');
  });

  it('assigns every tool to one of the 5 supported categories without duplicate IDs', () => {
    const supported = new Set(['FAMILY', 'DEBT', 'TRAFFIC', 'LABOR_CRIMINAL_CONTRACT', 'OFFICIAL_TEMPLATES']);
    expect(LEGAL_TOOLS.every(tool => supported.has(tool.categoryGroup))).toBe(true);
    expect(TOOLBOX_GROUPS.filter(group => group.id !== 'ALL').every(group => LEGAL_TOOLS.some(tool => tool.categoryGroup === group.id))).toBe(true);
    expect(new Set(LEGAL_TOOLS.map(tool => tool.id)).size).toBe(LEGAL_TOOLS.length);
    // 總工具數達到 27 項以上
    expect(LEGAL_TOOLS.length).toBeGreaterThanOrEqual(27);
  });

  it('explains what each tool does and renders calculator or generator badges', () => {
    const tool = LEGAL_TOOLS[0];
    render(<ToolSelectorGrid tools={[tool]} activeToolId={tool.id} onSelect={vi.fn()} />);

    expect(screen.getByText(tool.name)).toBeInTheDocument();
    expect(screen.getByText(tool.shortDesc)).toBeInTheDocument();
    expect(screen.getByText(`依據：${tool.legalBasis}`)).toBeInTheDocument();
    expect(screen.getByText('目前開啟')).toBeInTheDocument();
  });
});
