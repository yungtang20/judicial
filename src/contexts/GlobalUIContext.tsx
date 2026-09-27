import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { subscribeNotices } from '../lib/userNotice';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastOptions {
  message: string;
  /** 與 userNotice 的 NoticeTone 保持一致，避免兩處語氣定義分歧。 */
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
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
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
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
