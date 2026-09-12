import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentToolGuideAccordion } from './DocumentToolGuideAccordion';
import { getDocumentToolGuide, DOCUMENT_TOOL_GUIDES } from '../../lib/documentToolGuides';
import { DynamicToolForm } from './DynamicToolForm';

describe('Todo 2: Document Tool Guides and Checklists (鼎川律師風格指南與清冊)', () => {
  it('defines comprehensive guides for major non-calculator tools', () => {
    const divorceGuide = getDocumentToolGuide('DIVORCE_AGREEMENT');
    expect(divorceGuide).toBeDefined();
    expect(divorceGuide?.keyElements.length).toBeGreaterThan(0);
    expect(divorceGuide?.requiredDocuments.length).toBeGreaterThan(0);
    expect(divorceGuide?.courtOrAgency).toContain('戶政事務所');
    expect(divorceGuide?.feeStandard).toBeDefined();

    const trafficGuide = getDocumentToolGuide('TRAFFIC_SETTLEMENT_GENERATOR');
    expect(trafficGuide).toBeDefined();
    expect(trafficGuide?.requiredDocuments.length).toBeGreaterThan(0);

    const paymentOrderGuide = getDocumentToolGuide('PAYMENT_ORDER_PETITION');
    expect(paymentOrderGuide).toBeDefined();
    expect(paymentOrderGuide?.feeStandard).toContain('500');
  });

  it('renders DocumentToolGuideAccordion collapsed by default and expands upon click', () => {
    const guide = DOCUMENT_TOOL_GUIDES['DIVORCE_AGREEMENT'];
    expect(guide).toBeDefined();

    render(<DocumentToolGuideAccordion guide={guide} />);

    // 預設為收起狀態
    expect(screen.getByText('展開指南')).toBeInTheDocument();
    expect(screen.queryByText('管轄法院／受理機關')).not.toBeInTheDocument();

    // 點擊展開
    const toggleBtn = screen.getByRole('button', { name: /法務指南/i });
    fireEvent.click(toggleBtn);

    // 展開後應顯示管轄法院、規費與必備清單
    expect(screen.getByText('收起指南')).toBeInTheDocument();
    expect(screen.getByText('管轄法院／受理機關')).toBeInTheDocument();
    expect(screen.getByText('法定規費標準')).toBeInTheDocument();
    expect(screen.getByText('必備佐證文件清單')).toBeInTheDocument();
    expect(screen.getByText(guide.courtOrAgency)).toBeInTheDocument();
  });

  it('automatically integrates and displays guide inside DynamicToolForm', () => {
    render(
      <DynamicToolForm
        toolId="DIVORCE_AGREEMENT"
        formInputs={{}}
        onChange={() => {}}
        currentToolName="兩願離婚協議書產生器"
      />
    );

    expect(screen.getByText(/法務指南 · 必備文件與法院管轄清冊/)).toBeInTheDocument();
  });
});
