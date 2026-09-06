/**
 * 第三方外部服務彈性呼叫模組 (Circuit Breaker, Timeout & Retry Engine)
 *
 * 原則：
 * 1. 隔離外部服務（司法院 OpenData、外部 AI、RAG 模型等），防止級聯崩潰 (Cascading Failure)
 * 2. 具備可配置之逾時 (Timeout)、指數退避重試 (Exponential Backoff Retry) 與斷路熔斷 (Circuit Breaker)
 * 3. 錯誤轉譯：將第三方連線錯誤包裝為內部乾淨錯誤代碼，不將 raw 堆疊暴露給終端用戶
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // 觸發斷路的連續失敗次數 (預設 5)
  resetTimeoutMs?: number;   // 進入 OPEN 狀態後的冷卻重置時間 (預設 30000ms)
  serviceName: string;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  public readonly serviceName: string;

  constructor(options: CircuitBreakerOptions) {
    this.serviceName = options.serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
  }

  public getState(): CircuitState {
    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        console.log(`[CircuitBreaker:${this.serviceName}] 熔斷冷卻期結束，狀態轉移為 HALF_OPEN 試探`);
      }
    }
    return this.state;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      console.warn(`[CircuitBreaker:${this.serviceName}] 外部服務連續失敗達 ${this.failureCount} 次，熔斷器已開啟 (OPEN)`);
    }
  }

  public isExecutionPermitted(): boolean {
    return this.getState() !== "OPEN";
  }
}

// 預設各外部服務之熔斷器單例
export const judicialBreaker = new CircuitBreaker({ serviceName: "JudicialOpenData", failureThreshold: 4, resetTimeoutMs: 20000 });
export const aiBreaker = new CircuitBreaker({ serviceName: "ExternalAI", failureThreshold: 3, resetTimeoutMs: 15000 });
export const ragBreaker = new CircuitBreaker({ serviceName: "LegalRAG", failureThreshold: 4, resetTimeoutMs: 25000 });

export interface ResilienceFetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffFactorMs?: number;
  breaker?: CircuitBreaker;
  fallbackMessage?: string;
}

/**
 * 具備 Timeout、Retry 與 Circuit Breaker 防護的請求執行器
 */
export async function executeWithResilience<T>(
  action: (signal: AbortSignal) => Promise<T>,
  options: ResilienceFetchOptions
): Promise<T> {
  const timeoutMs = options.timeoutMs || 8000;
  const maxRetries = options.maxRetries ?? 2;
  const backoffFactorMs = options.backoffFactorMs || 500;
  const breaker = options.breaker;

  // 1. 檢查熔斷器
  if (breaker && !breaker.isExecutionPermitted()) {
    throw new Error(options.fallbackMessage || `外部服務 [${breaker.serviceName}] 暫時無法連線，已啟動安全保護機制`);
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await action(controller.signal);
      clearTimeout(timer);
      if (breaker) breaker.recordSuccess();
      return result;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      attempt++;

      const isAborted = controller.signal.aborted || err.name === "AbortError";
      const errMsg = isAborted ? "連線逾時" : (err.message || "連線異常");

      if (attempt <= maxRetries) {
        const delay = backoffFactorMs * Math.pow(2, attempt - 1);
        console.warn(`[Resilience] 請求失敗 (${errMsg})，將於 ${delay}ms 後進行第 ${attempt} 次重試...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (breaker) breaker.recordFailure();

  console.error(`[Resilience] 外部服務在重試 ${maxRetries} 次後依然失敗:`, lastError?.message || lastError);
  throw new Error(options.fallbackMessage || "外部服務暫時忙碌或未回應，請稍後重試");
}
