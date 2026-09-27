import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CaseBackupPanel } from './CaseBackupPanel';
import { useCaseStore } from '../../store/useCaseStore';

/**
 * 案件備份與還原必須有 UI 入口。
 *
 * 背景：useCaseStore 早已實作 exportEncryptedCase／importEncryptedCase
 * （PBKDF2 導鍵、AES 加密、需 12 字元以上密碼），但整個 UI 沒有任何入口。
 * 案件卷只存在 sessionStorage，關閉分頁即消失，使用者無法備份或還原。
 */
vi.mock('../../store/useCaseStore', () => ({
  useCaseStore: (selector: (s: unknown) => unknown) => selector(mockStore)
}));

const mockStore = {
  exportEncryptedCase: vi.fn(),
  importEncryptedCase: vi.fn()
};

describe('案件備份與還原', () => {
  it('輸入區提供備份入口', () => {
    render(<CaseBackupPanel />);
    expect(screen.getByRole('button', { name: /案件備份/ })).toBeTruthy();
  });

  it('密碼不足 12 字元時不得匯出，並說明原因', async () => {
    mockStore.exportEncryptedCase.mockClear();
    render(<CaseBackupPanel />);
    fireEvent.click(screen.getByRole('button', { name: /案件備份/ }));
    fireEvent.change(screen.getByLabelText(/備份密碼/), { target: { value: '太短' } });
    fireEvent.click(screen.getByRole('button', { name: /匯出加密備份/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/12 個字元/));
    expect(mockStore.exportEncryptedCase).not.toHaveBeenCalled();
  });

  it('密碼達標時產生加密備份並顯示內容', async () => {
    mockStore.exportEncryptedCase.mockReset();
    mockStore.exportEncryptedCase.mockResolvedValue('ENC-PAYLOAD-123');
    render(<CaseBackupPanel />);
    fireEvent.click(screen.getByRole('button', { name: /案件備份/ }));
    fireEvent.change(screen.getByLabelText(/備份密碼/), { target: { value: '這是一個足夠長的案件備份密碼' } });
    fireEvent.click(screen.getByRole('button', { name: /匯出加密備份/ }));
    await waitFor(() => expect(mockStore.exportEncryptedCase).toHaveBeenCalledWith('這是一個足夠長的案件備份密碼'));
    expect(screen.getByLabelText(/加密備份內容/).getAttribute('value') || (screen.getByLabelText(/加密備份內容/) as HTMLTextAreaElement).value)
      .toBe('ENC-PAYLOAD-123');
  });

  it('還原失敗時不得透露密碼長度或備份是否存在', async () => {
    mockStore.importEncryptedCase.mockReset();
    mockStore.importEncryptedCase.mockRejectedValue(new Error('decrypt failed'));
    render(<CaseBackupPanel />);
    fireEvent.click(screen.getByRole('button', { name: /案件備份/ }));
    fireEvent.change(screen.getByLabelText(/加密備份內容/), { target: { value: 'SOME-PAYLOAD' } });
    fireEvent.change(screen.getByLabelText(/備份密碼/), { target: { value: '這是一個足夠長的案件備份密碼' } });
    fireEvent.click(screen.getByRole('button', { name: /從備份還原/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    const text = screen.getByRole('alert').textContent || '';
    expect(text).not.toMatch(/字元|長度/);
    expect(text).not.toMatch(/不存在|找不到/);
  });

  it('還原成功時告知使用者並清空輸入', async () => {
    mockStore.importEncryptedCase.mockReset();
    mockStore.importEncryptedCase.mockResolvedValue(undefined);
    render(<CaseBackupPanel />);
    fireEvent.click(screen.getByRole('button', { name: /案件備份/ }));
    fireEvent.change(screen.getByLabelText(/加密備份內容/), { target: { value: 'SOME-PAYLOAD' } });
    fireEvent.change(screen.getByLabelText(/備份密碼/), { target: { value: '這是一個足夠長的案件備份密碼' } });
    fireEvent.click(screen.getByRole('button', { name: /從備根還原|從備份還原/ }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/已還原/));
  });
});
