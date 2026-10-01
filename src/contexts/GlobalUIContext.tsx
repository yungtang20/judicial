import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { subscribeNotices } from '../lib/userNotice';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastOptions {
  message: string;
  /** 與 userNotice 的 NoticeTone 保持一致，避免兩處語氣定義分歧。 */
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

/**
 * 提示的預設停留時間（毫秒）。
 *
 * 錯誤訊息通常帶有使用者接下來要做的動作，
 * 例如「PDF 解析失敗，請直接複製貼上判決內文」。
 * 原本不論哪一種語氣都只停留 3 秒，使用者很可能還沒讀完就消失了，
 * 而且消失後無法再查。錯誤給較長的時間，其餘維持短提示。
 */
const 預設停留: Record<'error' | 'warning' | 'info' | 'success', number> = {
  error: 8000,
  warning: 6000,
  info: 3000,
  success: 3000
};

/** 取提示的停留時間；未指定時依語氣決定。 */
function 停留時間(type: ToastOptions['type']): number {
  return 預設停留[type ?? 'info'] ?? 3000;
}

interface GlobalUIContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: (toastOptions?: ToastOptions) => void;
  showToast: (options: ToastOptions) => void;
}

const GlobalUIContext = createContext<GlobalUIContextType | undefined>(undefined);

export function GlobalUIProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0);
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const startLoading = useCallback(() => {
    setLoadingCount(prev => prev + 1);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
  }, []);

  const stopLoading = useCallback((toastOptions?: ToastOptions) => {
    setLoadingCount(prev => Math.max(0, prev - 1));
    if (toastOptions) {
      showToast(toastOptions);
    }
  }, [showToast]);

  // 讓 hooks 與純函式模組（拿不到 context）也能升起同一種提示。
  // 這些模組先前只能用原生 alert()，會凍結整個頁面且無法翻譯。
  useEffect(() => subscribeNotices(({ message, tone }) => {
    setToast({ message, type: tone });
  }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, toast.duration ?? 停留時間(toast.type));
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <GlobalUIContext.Provider value={{ isLoading: loadingCount > 0, startLoading, stopLoading, showToast }}>
      {children}
      
      {/* Top subtle progress bar */}
      {loadingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-indigo-500/20 z-[9999] overflow-hidden">
          <div className="h-full bg-indigo-500/80 w-1/3 rounded-r-full animate-loading-bar" />
        </div>
      )}

      {/*
        * 提示必須能被螢幕報讀播報。
        * 實測：上傳損壞的 PDF 會顯示「PDF 解析失敗，請直接複製貼上判決內文。」，
        * 但這裡原本沒有 role 與 aria-live，依賴語音的使用者完全收不到這則錯誤，
        * 只會看到輸入框沒有變化而不知道發生了什麼。
        * 錯誤用 assertive 立即打斷；其餘用 polite 等語音空檔再播。
        */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
          className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'error' ? 'bg-rose-950 border-rose-800 text-rose-200 shadow-rose-900/20' :
            toast.type === 'info' ? 'bg-sky-950 border-sky-800 text-sky-200 shadow-sky-900/20' :
            'bg-emerald-950 border-emerald-800 text-emerald-200 shadow-emerald-900/20'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> :
             toast.type === 'info' ? <Info className="w-4 h-4 text-sky-400" /> :
             <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </GlobalUIContext.Provider>
  );
}

export function useGlobalUI() {
  const context = useContext(GlobalUIContext);
  if (!context) {
    throw new Error('useGlobalUI must be used within a GlobalUIProvider');
  }
  return context;
}
