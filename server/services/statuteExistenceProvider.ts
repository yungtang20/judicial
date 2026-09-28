import { loadOfficialStatuteIndex, type OfficialStatuteIndex } from './officialStatuteIndex.js';
import type { StatuteExistenceCheck } from '../../src/lib/citationVerifier.js';
import type { LegalInputPrecheckOptions } from '../../src/lib/legalInputPrecheck.js';
import { setStatuteExistenceProvider } from '../../src/lib/citationVerifier.js';

/**
 * 把官方法規索引提供給同步的前檢查。
 *
 * precheckLegalInput 是同步函式（治理測試 legalGovernance.test.ts 以同步
 * 呼叫驗證其 fail-closed 行為，不得改成 async），因此官方索引必須
 * 在前檢查之前就緒。這裡負責預載與提供同步存取。
 *
 * 取不到官方資料時回傳 undefined，前檢查會自動退回本機靜態索引——
 * 也就是本功能上線前的行為。這不是放行：前檢查在該情況下仍然
 * 擋下未查證的引用，fail-closed 沒有被削弱。
 */

let current: OfficialStatuteIndex | null = null;
let warming: Promise<void> | null = null;


/** 重新嘗試官方資料的間隔。官方來源偶發不可用時不應永久放棄。 */
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
let retryTimer: NodeJS.Timeout | null = null;

/**
 * 預載官方索引。可重複呼叫；並行呼叫共用同一次下載。
 *
 * 不會拋出：官方來源不可用只是「此刻查不到」，不該讓伺服器啟動失敗。
 */
export function warmOfficialStatuteIndex(): Promise<void> {
  if (warming) return warming;
  warming = loadOfficialStatuteIndex()
    .then((index) => {
      if (index) {
        current = index;
        // 引用驗證的呼叫點散佈在產製管線、工具箱、律師工作流等多處，
        // 在此注入一次即可全部生效，不需逐處傳遞。
        setStatuteExistenceProvider((lawName, article, subArticle) => index.verify(lawName, article, subArticle));
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
      } else {
        // 取得失敗：排程重試。期間一律沿用舊資料或退回本機索引。
        scheduleRetry();
      }
    })
    .catch(() => scheduleRetry())
    .finally(() => {
      warming = null;
    });
  return warming;
}

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void warmOfficialStatuteIndex();
  }, RETRY_INTERVAL_MS);
  // 計時器不應讓程序無法結束（測試環境尤其明顯）。
  retryTimer.unref?.();
}

/**
 * 同步取得官方查詢能力；尚未就緒時回傳 undefined。
 *
 * 回傳 undefined 代表「此刻無法確定」，呼叫端必須維持 fail-closed。
 */
export function officialStatuteExistence(): StatuteExistenceCheck | undefined {
  if (!current) return undefined;
  const index = current;
  return (lawName, article, subArticle) => index.verify(lawName, article, subArticle);
}

/** 官方資料的更新日，未就緒時為 undefined。 */
export function officialUpdateDate(): string | undefined {
  return current?.updateDate;
}

/** 目前使用的索引是否已就緒。供診斷與測試使用。 */
export function isOfficialStatuteIndexReady(): boolean {
  return current !== null;
}

/** 僅供測試使用：注入或清除索引。 */
export function __setOfficialStatuteIndexForTest(index: OfficialStatuteIndex | null): void {
  current = index;
  // 模組層級的供應者必須同步更新，否則測試會讀到上一個索引。
  setStatuteExistenceProvider(
    index ? (lawName, article, subArticle) => index.verify(lawName, article, subArticle) : undefined
  );
}

/**
 * 前檢查用的選項。官方索引未就緒時回傳空物件，
 * 前檢查會自動退回本機靜態索引——行為與本功能上線前完全相同。
 */
export function officialPrecheckOptions(): LegalInputPrecheckOptions {
  const check = officialStatuteExistence();
  return check ? { statuteExistence: check, officialUpdateDate: officialUpdateDate() } : {};
}
