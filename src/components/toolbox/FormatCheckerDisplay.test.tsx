import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormatCheckerDisplay } from './FormatCheckerDisplay';

vi.mock('../../lib/formatChecker', async () => {
  const actual = await vi.importActual<typeof import('../../lib/formatChecker')>('../../lib/formatChecker');
  return { ...actual, verifyDocumentFormat: actual.verifyDocumentFormat };
});

const COURT_PLEADING_TEXT = [
  '民事起訴狀',
  '訴訟標的：返還借款本金。',
  '原告：張小明，住所：台北市信義區。',
  '被告：李房東，住所：台北市南港區。',
  '應記載事項：訴之聲明',
  '證據：借據、匯款紀錄。',
  '此致　臺灣臺北地方法院'
].join('\n');

describe('FormatCheckerDisplay', () => {
  it('法院書狀顯示格式指標與免責聲明', () => {
    render(<FormatCheckerDisplay documentText={COURT_PLEADING_TEXT} isCourtPleading />);
    expect(screen.getByText('舊版文字指標（非合規判定）')).toBeInTheDocument();
    expect(screen.getByText(/不得作為可遞交法院的結論/)).toBeInTheDocument();
  });

  it('非法院書狀（存證信函）不得顯示格式指標，避免大量預期外的 MISSING 噪音', () => {
    const demandLetter = [
      '存證信函',
      '寄件人：張小明',
      '收件人：李房東',
      '催告金額：新臺幣50,000元',
      '請於期限內清償，逾期將依法強制執行。'
    ].join('\n');

    const { container } = render(
      <FormatCheckerDisplay documentText={demandLetter} isCourtPleading={false} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('舊版文字指標（非合規判定）')).not.toBeInTheDocument();
    expect(screen.queryByText(/不得作為可遞交法院的結論/)).not.toBeInTheDocument();
  });
});
