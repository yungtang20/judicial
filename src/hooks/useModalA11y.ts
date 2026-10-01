import { useEffect } from 'react';

/**
 * 彈窗的鍵盤與無障礙行為。
 *
 * 實測缺陷：案件備份、情境導診詳細、指引彈窗、設定視窗與上訴步驟視窗
 * 全部只能靠右上角的 X 關閉。Escape 沒有作用，遮罩也沒有 role="dialog"
 * 與 aria-modal。鍵盤使用者開啟後就被困在視窗裡——
 * 焦點被遮罩擋住無法移出，也沒有鍵盤可用的離開路徑，
 * 只有滑鼠能點到 X。螢幕報讀軟體也不會把它當成對話框播報。
 *
 * 這裡只補上兩件事：Escape 關閉，以及讓呼叫端把 role/aria-modal
 * 掛到遮罩上。焦點圈閉（focus trap）屬於另一層需求，
 * 目前的實測證據只支持上述兩項，沒有證明需要一併實作。
 *
 * @param 是否開啟 彈窗顯示時掛載監聽，關閉時自動卸載。
 * @param 關閉 關閉回呼，通常是 () => setOpen(false)。
 */
export function useModalA11y(是否開啟: boolean, 關閉: () => void): void {
  useEffect(() => {
    if (!是否開啟) return;
    const 處理鍵盤 = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        關閉();
      }
    };
    document.addEventListener('keydown', 處理鍵盤);
    return () => document.removeEventListener('keydown', 處理鍵盤);
  }, [是否開啟, 關閉]);
}