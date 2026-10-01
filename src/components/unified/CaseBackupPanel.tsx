import React, { useState } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { Download, Upload, ShieldCheck, X } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';

/**
 * 案件備份與還原。
 *
 * 背景：useCaseStore 早已實作 exportEncryptedCase／importEncryptedCase
 * （PBKDF2 導鍵、AES 加密、需 12 字元以上密碼），但整個 UI 沒有任何入口。
 *
 * 後果：案件卷只存放在 sessionStorage，關閉分頁即消失。
 * 對照「案件事實、爭點、證據清單、已產製書狀、人工核准紀錄」都是
 * 使用者花了時間產生的成果，卻沒有備份、沒有還原、也無法轉移到其他裝置。
 *
 * 這個元件把既有的加密能力接到介面上，讓使用者能主動保全成果。
 */
export const CaseBackupPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useModalA11y(open, () => setOpen(false));

  const exportEncryptedCase = useCaseStore(s => s.exportEncryptedCase);
  const importEncryptedCase = useCaseStore(s => s.importEncryptedCase);

  const reset = () => {
    setMessage(null);
    setError(null);
  };

  const handleExport = async () => {
    reset();
    if (passphrase.trim().length < 12) {
      setError('案件匯出密碼至少需要 12 個字元。');
      return;
    }
    setBusy(true);
    try {
      const encrypted = await exportEncryptedCase(passphrase.trim());
      setPayload(encrypted);
      setMessage('已產生加密備份。請複製下方的內容並妥善保存。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '案件備份失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    reset();
    if (!payload.trim()) {
      setError('請先貼上先前備份的內容。');
      return;
    }
    if (!passphrase) {
      setError('請提供該備份當初使用的密碼。');
      return;
    }
    setBusy(true);
    try {
      await importEncryptedCase(payload.trim(), passphrase);
      setMessage('案件已還原。若內容看起來不正確，請重新整理頁面確認。');
      setPayload('');
    } catch (err) {
      // 密碼錯誤與內容損毀都會走到這裡；訊息不得區分，
      // 避免讓人據以判斷備份是否存在或密碼長度是否正確。
      setError('無法還原。請確認備份內容與密碼是否正確。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
        title="將目前案件加密備份，或從備份還原"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        案件備份
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="案件備份與還原"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[560px] max-w-full space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">案件備份與還原</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  案件內容目前只保存在本機分頁中，關閉分頁即消失。
                  備份會以密碼加密，請自行保存內容與密碼；兩者遺失皆無法還原。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="關閉案件備份視窗"
                className="p-1 rounded hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="case-backup-passphrase" className="text-xs text-[var(--color-text-muted)] block">
                備份密碼（至少 12 個字元，遺失將無法還原）
              </label>
              <input
                id="case-backup-passphrase"
                type="password"
                value={passphrase}
                onChange={e => { setPassphrase(e.target.value); reset(); }}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-amber-500 focus:outline-none"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="case-backup-payload" className="text-xs text-[var(--color-text-muted)] block">
                加密備份內容（匯出後會出現在這裡；還原時貼入先前備份的內容）
              </label>
              <textarea
                id="case-backup-payload"
                value={payload}
                onChange={e => { setPayload(e.target.value); reset(); }}
                rows={5}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-amber-500 focus:outline-none font-mono break-all"
                placeholder="匯出後的加密內容會顯示在這裡"
              />
            </div>

            {message && (
              <p role="status" className="text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-800 rounded-lg p-2.5">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-rose-300 bg-rose-950/50 border border-rose-800 rounded-lg p-2.5">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                匯出加密備份
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={busy || !payload.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-bold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                從備份還原
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CaseBackupPanel;
