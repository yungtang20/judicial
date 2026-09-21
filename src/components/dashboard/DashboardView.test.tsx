import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardView, { LegalConceptList } from './DashboardView';

describe('DashboardView', () => {
  it('shows safety, evidence and bundle sections from triage data', () => {
    render(<DashboardView result={{ isSensitive: true, protectionNotice: '請先確保安全', plainExplanation: '摘要', evidenceChecklist: ['截圖'], recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' }} />);
    expect(screen.getByText('請先確保安全')).toBeTruthy();
    expect(screen.getByText('截圖')).toBeTruthy();
    expect(screen.getByText('CIVIL_COMPLAINT_GENERAL')).toBeTruthy();
  });

  it('routes bundle selection to the supplied generation callback', () => {
    const onSelectBundle = vi.fn();
    render(<DashboardView result={{ recommendedToolId: 'CIVIL_COMPLAINT_GENERAL' }} onSelectBundle={onSelectBundle} />);
    fireEvent.click(screen.getByRole('button', { name: 'CIVIL_COMPLAINT_GENERAL' }));
    expect(onSelectBundle).toHaveBeenCalledWith('CIVIL_COMPLAINT_GENERAL');
  });

  it('explains a legal concept after it is selected', () => {
    render(<LegalConceptList concepts={['民法第184條']} status="待確認" />);
    fireEvent.click(screen.getByRole('button', { name: '民法第184條' }));
    expect(screen.getByRole('status')).toHaveTextContent('民法第184條');
  });
});
