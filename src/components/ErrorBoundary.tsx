import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * 全域錯誤邊界。
 *
 * 沒有邊界時，任一元件在 render 中拋出例外，React 會卸載整棵樹，
 * 使用者看到的是**完全空白的畫面**，沒有任何錯誤訊息或復原方式。
 *
 * 實測：防禦分流的結果元件存取了兩個不存在的欄位
 * （`extractedFacts` 與 `evidenceRequirements`），
 * render 時對 undefined 取 `.map` 拋出例外——
 * 整個應用變成空白，畫面上找不到任何錯誤提示。
 *
 * 邊界不會讓錯誤消失，但會把它侷限在受影響的區段，
 * 並留下可追溯的紀錄與可操作的復原路徑。
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** 顯示在錯誤畫面中的區段名稱。 */
  區段?: string;
  /** 發生錯誤時呼叫，供上報使用。 */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 保留在 console：使用者看不到，但維護者需要
    console.error('[ErrorBoundary] 元件發生例外：', this.props.區段 || '未命名區段', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const 區段 = this.props.區段 || '功能區段';

    return (
      <div
        role="alert"
        className="mx-4 my-4 rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 text-left"
      >
        <h2 className="text-sm font-bold text-rose-200">{區段}發生錯誤</h2>
        <p className="mt-2 text-xs leading-relaxed text-rose-100/80">
          這個區段未能正常顯示，其他功能不受影響。
          您可以重試，或重新載入頁面。
          若持續出現，請將下方訊息回報給維護者。
        </p>
        <p className="mt-3 rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] leading-relaxed text-rose-200/90 break-words">
          {error.message || String(error)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
          >
            重試此區段
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
          >
            重新載入頁面
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
