import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalProcessGuide } from './LegalProcessGuide';

/**
 * 法理流程引導的步驟 3 必須依步驟 1 選的案件類型分流。
 *
 * 實測：選了「一般民事契約、借貸、租賃或交通事故」（房東押金爭議），
 * 步驟 3 仍只列出性器官侵入、乘機性交、數位性暴力等特徵，
 * 且沒有「以上皆非」可選。使用者被迫勾選一個不實的類別，
 * 而最終的分類結論正是由這些勾選驅動。
 */
const toStep3 = (issueText?: RegExp) => {
  if (issueText) fireEvent.click(screen.getByText(issueText));
  fireEvent.click(screen.getByRole('button', { name: /下一步：填寫事實陳述/ }));
  const ta = screen.getByRole('textbox');
  fireEvent.change(ta, { target: { value: '房東於簽約後三個月無故拒絕退還押金新臺幣五萬元，屢催不還。' } });
  fireEvent.click(screen.getByRole('button', { name: /下一步：確認身分與危害特徵/ }));
};

describe('法理流程引導步驟三分流', () => {
  it('預設為性侵害情境時，行為特徵以人身侵害選項為主', () => {
    render(<LegalProcessGuide />);
    toStep3();
    expect(screen.getByText(/性器官侵入／強迫口交／性交行為/)).toBeTruthy();
  });

  it('選擇一般民事糾紛後，步驟三必須提供契約爭議的行為特徵', () => {
    render(<LegalProcessGuide />);
    toStep3(/一般民事契約、借貸、租賃或交通事故/);
    expect(screen.getByText(/押金、定金或保證金返還爭議/)).toBeTruthy();
    expect(screen.getByText(/借貸／租金／工程款未依約給付/)).toBeTruthy();
  });

  it('選擇一般民事糾紛後，關係人選項必須包含契約相對人', () => {
    render(<LegalProcessGuide />);
    toStep3(/一般民事契約、借貸、租賃或交通事故/);
    expect(screen.getByText(/房東／租屋人（租賃關係）/)).toBeTruthy();
  });
});
