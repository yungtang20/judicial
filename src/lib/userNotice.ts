/**
 * 模組層級的使用者提示出口。
 *
 * 原生 alert/confirm/prompt 會凍結整個頁面、無法樣式化、無法翻譯，
 * 在部分嵌入環境會被直接封鎖。應用已有一套 useGlobalUI().showToast，
 * 但它只能由 React 元件呼叫——hooks 與純函式模組拿不到 context。
 *
 * 這個出口讓非元件程式碼也能升起同一種提示：
 * GlobalUIProvider 啟動時訂閱，showToast 呼叫時廣播。
 * 未掛載 Provider 時（例如單元測試）會安靜忽略，不產生例外。
 */

export type NoticeTone = 'info' | 'success' | 'error' | 'warning';

export interface Notice {
  message: string;
  tone: NoticeTone;
}

type Listener = (notice: Notice) => void;

const listeners = new Set<Listener>();

/** 訂閱提示廣播。由 GlobalUIProvider 呼叫。 */
export function subscribeNotices(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 顯示一則提示。
 *
 * 取代原生 alert。純函式與 hooks 應改用這個，
 * 元件則優先使用 useGlobalUI().showToast。
 */
export function notify(message: string, tone: NoticeTone = 'info'): void {
  if (typeof document === 'undefined') return;
  for (const listener of listeners) {
    try {
      listener({ message, tone });
    } catch {
      // 單一訂閱者失效不得影響其他訂閱者，也不得讓呼叫端中斷
    }
  }
}

/** 錯誤提示的簡寫。 */
export function notifyError(message: string): void {
  notify(message, 'error');
}
