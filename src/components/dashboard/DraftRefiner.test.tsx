import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DraftRefiner from './DraftRefiner';
import { apiClient } from '../../lib/apiClient';

/**
 * 草稿精修必須讓使用者看得到產出。
 *
 * 實測：正式站送出微調後按鈕由「檢核中…」回到「送出微調」，
 * 但精修後的書狀從未顯示，上層也沒有傳入 onRefined，整段結果被丟棄。
 * 使用者只會看到輸入框清空，等於這項功能沒有作用。
 */
vi.mock('../../lib/apiClient', () => ({
  apiClient: { draftRefine: vi.fn() }
}));

const draftRefine = vi.mocked(apiClient.draftRefine);

describe('DraftRefiner 產出可見性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('精修成功後必須顯示精修後的書狀', async () => {
    draftRefine.mockResolvedValue({ draftText: '請求給付新臺幣350,000元，並自民國113年7月10日起按週年利率百分之3.5計算利息。' } as never);

    render(<DraftRefiner draftText="原始草稿" allowedCitations={[]} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '請改得更正式' } });
    fireEvent.click(screen.getByRole('button', { name: '送出微調' }));

    const result = await screen.findByLabelText('微調後書狀');
    expect(result.textContent).toContain('350,000');
    expect(result.textContent).toContain('3.5');
  });

  it('精修成功後提供複製按鈕，讓使用者能取用產出', async () => {
    draftRefine.mockResolvedValue({ draftText: '微調後內容' } as never);
    render(<DraftRefiner draftText="原始草稿" allowedCitations={[]} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '請改得更正式' } });
    fireEvent.click(screen.getByRole('button', { name: '送出微調' }));

    await screen.findByLabelText('微調後書狀');
    expect(screen.getByRole('button', { name: '複製微調後書狀' })).toBeTruthy();
  });

  it('尚未精修前不得顯示產出區塊', () => {
    render(<DraftRefiner draftText="原始草稿" allowedCitations={[]} />);
    expect(screen.queryByLabelText('微調後書狀')).toBeNull();
  });

  it('引用檢核未通過時顯示錯誤，且不得顯示產出', async () => {
    draftRefine.mockRejectedValue(new Error('AI 加入了未經授權的法條引用，已阻擋交付。'));
    render(<DraftRefiner draftText="原始草稿" allowedCitations={[]} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '請加上民法第9999條' } });
    fireEvent.click(screen.getByRole('button', { name: '送出微調' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('未經授權'));
    expect(screen.queryByLabelText('微調後書狀')).toBeNull();
  });
});
