import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LegalSdlcWorkbench } from './LegalSdlcWorkbench';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * SDLC 人工決策閘門的行為。
 *
 * 實測：4 個「必要檢核要件」用綠色打勾呈現，看起來像已核實，
 * 但沒有任何輸入可以核實；確認鈕只在 loading 時停用，
 * 等於可以在不填審查人姓名的情況下匿名放行階段；
 * 失敗訊息使用阻斷式 alert()，會凍結整個畫面且容易被忽略。
 */
const openGate = async () => {
  render(<GlobalUIProvider><LegalSdlcWorkbench /></GlobalUIProvider>);
  const approve = await screen.findByRole('button', { name: /人工審批 Gate/ }, { timeout: 5000 });
  fireEvent.click(approve);
  await screen.findByText(/人工決策放行審核/);
};

describe('SDLC 人工決策閘門', () => {
  it('閘門未載入檢核要件時必須明說，不得顯示成空清單', async () => {
    await openGate();
    await waitFor(() => {
      expect(screen.getByText(/尚未載入檢核要件清單/)).toBeTruthy();
    });
  });

  it('未填審查人姓名時不得放行（等同簽名）', async () => {
    await openGate();
    const confirm = screen.getByRole('button', { name: /確認簽署並推進階段/ });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  });

  it('簽署人不得預設為佔位字串，否則放行紀錄無法歸屬到人', async () => {
    await openGate();
    const inputs = document.querySelectorAll('input[type="text"]');
    expect((inputs[0] as HTMLInputElement).value).toBe('');
  });

  it('填入審查人姓名後才能放行', async () => {
    await openGate();
    const inputs = document.querySelectorAll('input[type="text"]');
    fireEvent.change(inputs[0], { target: { value: '王大明律師' } });
    const confirm = screen.getByRole('button', { name: /確認簽署並推進階段/ });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });

  it('不得使用阻斷式 alert 呈現失敗', () => {
    // alert 會凍結整個畫面且難以被注意到，改為畫面內 role="alert" 訊息
    const src = readFileSync(
      path.resolve(__dirname, 'LegalSdlcWorkbench.tsx'),
      'utf8'
    ).replace(/\/\/[^\n]*alert\(\)[^\n]*/g, '');
    expect(src).not.toMatch(/[^a-zA-Z]alert\(/);
  });
});
