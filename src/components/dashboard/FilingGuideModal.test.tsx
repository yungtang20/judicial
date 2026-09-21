import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FilingGuideModal from './FilingGuideModal';

describe('FilingGuideModal', () => {
  it('shows filing fee, service copies, evidence coding and disclaimer', () => {
    render(<FilingGuideModal notice="確認法院" filingFee="新臺幣 1,000 元" opponentCount={2} evidenceCodes={['證物一', '證物二']} />);
    expect(screen.getByText(/新臺幣 1,000 元/)).toBeTruthy();
    expect(screen.getByText(/至少 2 份/)).toBeTruthy();
    expect(screen.getByText(/證物一、證物二/)).toBeTruthy();
    expect(screen.getByText(/AI 產出僅供整理/)).toBeTruthy();
  });
});
