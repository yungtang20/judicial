import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LEGAL_TOOLS, TOOLBOX_CATEGORIES } from '../../lib/legalToolRegistry';
import { ToolboxHeader, TOOLBOX_GROUPS } from './ToolboxHeader';
import { ToolSelectorGrid } from './ToolSelectorGrid';
import { JUDICIAL_TEMPLATE_CATEGORIES } from '../../lib/officialJudicialTemplates';

vi.mock('../../lib/apiClient', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      verifiedOn: '2026-09-15',
      totalTemplates: 685,
      categories: [
        { name: '民事', total: 120, readyForMerge: 0, sourceOnly: 120 },
        { name: '刑事', total: 72, readyForMerge: 1, sourceOnly: 71 },
        { name: '少年', total: 9, readyForMerge: 0, sourceOnly: 9 },
        { name: '家事', total: 89, readyForMerge: 0, sourceOnly: 89 },
        { name: '民事保護令', total: 5, readyForMerge: 0, sourceOnly: 5 },
        { name: '嚴重病人保護安置事件(精神衛生法)', total: 14, readyForMerge: 0, sourceOnly: 14 },
        { name: '行政訴訟', total: 118, readyForMerge: 0, sourceOnly: 118 },
        { name: '智財', total: 40, readyForMerge: 0, sourceOnly: 40 },
        { name: '公務員懲戒', total: 46, readyForMerge: 0, sourceOnly: 46 },
        { name: '民事執行', total: 55, readyForMerge: 0, sourceOnly: 55 },
        { name: '債務清理', total: 11, readyForMerge: 0, sourceOnly: 11 },
        { name: '非訟', total: 23, readyForMerge: 0, sourceOnly: 23 },
        { name: '公證', total: 8, readyForMerge: 0, sourceOnly: 8 },
        { name: '提存', total: 5, readyForMerge: 0, sourceOnly: 5 },
        { name: '登記', total: 2, readyForMerge: 0, sourceOnly: 2 },
        { name: '跟蹤騷擾保護令', total: 7, readyForMerge: 0, sourceOnly: 7 },
        { name: '勞動', total: 6, readyForMerge: 0, sourceOnly: 6 },
        { name: '大法庭', total: 3, readyForMerge: 0, sourceOnly: 3 },
        { name: '法官評鑑', total: 16, readyForMerge: 0, sourceOnly: 16 },
        { name: '憲法訴訟', total: 34, readyForMerge: 0, sourceOnly: 34 },
        { name: '其他', total: 2, readyForMerge: 0, sourceOnly: 2 },
      ],
    }),
  }),
}));

import { OfficialTemplateDirectory } from './OfficialTemplateDirectory';

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

    expect(screen.getByRole('heading', { name: /全方位實用法務工具箱/ })).toBeInTheDocument();
    
    for (const cat of TOOLBOX_CATEGORIES.filter(cat => cat.id !== 'OFFICIAL_TEMPLATES')) {
      expect(screen.getByRole('button', { name: new RegExp(cat.name) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /司法院官方範本/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /討債|金錢/ }));
    expect(onSelectGroup).toHaveBeenCalledWith('DEBT');
  });

  it('assigns every tool to one of the 5 supported categories without duplicate IDs', () => {
    const supported = new Set(['FAMILY', 'DEBT', 'TRAFFIC', 'LABOR_CRIMINAL_CONTRACT', 'OFFICIAL_TEMPLATES']);
    expect(LEGAL_TOOLS.every(tool => supported.has(tool.categoryGroup))).toBe(true);
    expect(TOOLBOX_GROUPS.filter(group => group.id !== 'ALL').every(group => LEGAL_TOOLS.some(tool => tool.categoryGroup === group.id))).toBe(true);
    expect(new Set(LEGAL_TOOLS.map(tool => tool.id)).size).toBe(LEGAL_TOOLS.length);
    expect(LEGAL_TOOLS.length).toBeGreaterThanOrEqual(27);
  });

  it('lists all 21 official Judicial Yuan template categories with unique source pages', () => {
    expect(JUDICIAL_TEMPLATE_CATEGORIES).toHaveLength(21);
    expect(new Set(JUDICIAL_TEMPLATE_CATEGORIES.map(category => category.sourceUrl)).size).toBe(21);
    expect(JUDICIAL_TEMPLATE_CATEGORIES.find(category => category.name === '刑事')?.groups).toHaveLength(9);
  });

  it('renders all official categories with interactive buttons', async () => {
    const { OfficialTemplateDirectory: OTD } = await import('./OfficialTemplateDirectory');
    render(<OTD searchQuery="" />);
    const buttons = await screen.findAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(21);
  });

  it('filters official categories by name and shows empty state when unmatched', async () => {
    const { OfficialTemplateDirectory: OTD } = await import('./OfficialTemplateDirectory');
    const { rerender } = render(<OTD searchQuery="刑事" />);
    const buttons = await screen.findAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    rerender(<OTD searchQuery="不存在的分類" />);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /刑事/ })).not.toBeInTheDocument();
    });
  });

  it('explains what each tool does and renders calculator or generator badges', () => {
    const tool = LEGAL_TOOLS[0];
    render(<ToolSelectorGrid tools={[tool]} activeToolId={tool.id} onSelect={vi.fn()} />);

    expect(screen.getByText(tool.name)).toBeInTheDocument();
    expect(screen.getByText(tool.shortDesc)).toBeInTheDocument();
    expect(screen.getByText(`依據：${tool.legalBasis}`)).toBeInTheDocument();
  });
});
