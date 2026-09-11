import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';
import { ToolboxHeader, TOOLBOX_GROUPS } from './ToolboxHeader';
import { ToolSelectorGrid } from './ToolSelectorGrid';

describe('legal toolbox classification', () => {
  it('offers one consistent set of life-situation categories', () => {
    const onSelectGroup = vi.fn();
    render(
      <ToolboxHeader
        selectedGroup="ALL"
        onSelectGroup={onSelectGroup}
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: '選擇要製作的書狀或法律文件' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /其他書狀需求/ })).toBeInTheDocument();
    for (const label of ['安全與犯罪被害', '車禍與損害賠償', '家庭、婚姻與繼承', '長輩照護與監護', '借款、欠款與執行', '租屋、房產與職場']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: /借款、欠款與執行/ }));
    expect(onSelectGroup).toHaveBeenCalledWith('DEBT_EXECUTION');
  });

  it('assigns every tool to a supported user-facing category', () => {
    const supported = new Set(['SAFETY', 'DAMAGES', 'FAMILY', 'ELDERLY', 'DEBT_EXECUTION', 'HOUSING_WORK', 'GENERAL']);
    expect(LEGAL_TOOLS.every(tool => supported.has(tool.categoryGroup))).toBe(true);
    expect(TOOLBOX_GROUPS.filter(group => group.id !== 'ALL').every(group => LEGAL_TOOLS.some(tool => tool.categoryGroup === group.id))).toBe(true);
    expect(new Set(LEGAL_TOOLS.map(tool => tool.id)).size).toBe(LEGAL_TOOLS.length);
  });

  it('explains what each tool does before showing its legal basis', () => {
    const tool = LEGAL_TOOLS[0];
    render(<ToolSelectorGrid tools={[tool]} activeToolId={tool.id} onSelect={vi.fn()} />);

    expect(screen.getByText(tool.name)).toBeInTheDocument();
    expect(screen.getByText(tool.shortDesc)).toBeInTheDocument();
    expect(screen.getByText(`依據：${tool.legalBasis}`)).toBeInTheDocument();
    expect(screen.getByText('目前選擇')).toBeInTheDocument();
  });
});
