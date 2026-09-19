/**
 * 司法院判決檢索本地快取管理模組 (Judgment Local Cache Manager)
 * 
 * 核心特色：
 * 1. 雙層存儲：優先使用 sessionStorage（防個資殘留），支援配置切換至 localStorage，具備記憶體 In-Memory 備援。
 * 2. 關鍵字與案號正規化：消弭全半形、空格及繁體字號差異，確保「112 台上 2409」與「112台上字第2409號」命中相同快取。
 * 3. TTL (Time-To-Live) 到期失效：裁判全文既判力確定後不變（24h~7d），清單支援動態過期。
 * 4. 防爆保護 (QuotaExceeded Guard & LRU)：自動修剪過期及最舊快取，避免瀏覽器 storage 爆滿 (5MB 上限)。
 * 5. 命中追蹤與穿透機制：支援 bypassCache 強制重新整理，並回傳命中中繼資料供 UI 顯示。
 */

import { saveJudgmentToDb, getJudgmentFromDb } from './indexedDbStorage';

export interface CacheOptions {
  storageType?: 'sessionStorage' | 'localStorage';
  ttlMs?: number; // 存活時間（毫秒）
  namespace?: string;
}

export interface CachedItem<T> {
  key: string;
  normalizedKey: string;
  data: T;
  timestamp: number;
  ttlMs: number;
  hits: number;
}

export interface CacheResult<T> {
  data: T;
  fromCache: boolean;
  cachedAt?: number;
}

const CACHE_PREFIX = 'judicial_cache_';
const CACHE_INDEX_KEY = 'judicial_cache_index';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 預設 24 小時
const MAX_CACHE_ITEMS = 60; // 最多快取 60 筆大型裁判/查詢

// 記憶體備援（當 sessionStorage/localStorage 不可用或在 SSR/測試環境時）
const memoryCache = new Map<string, CachedItem<any>>();

/**
 * 台灣裁判案號與關鍵字正規化
 * 範例：
 * " 112 年度 台上 字第 2409 號 " -> "112台上2409"
 * " 臺灣臺北地方法院 111 訴 123 " -> "臺灣臺北地方法院111訴123"
 */
export function normalizeJudgmentQuery(query: string): string {
  if (!query) return '';
  return query
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '') // 去除所有半形與全形空格
    .replace(/年度/g, '')
    .replace(/字第/g, '')
    .replace(/號$/g, '')
    .replace(/[（(].*?[)）]/g, ''); // 去除備註括弧
}

/**
 * 取得指定 Storage 物件（安全封裝，防瀏覽器隱私模式安全阻擋）
 */
function getStorage(type: 'sessionStorage' | 'localStorage' = 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window[type];
    const testKey = '__test_storage_avail__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    return null;
  }
}

/**
 * 讀取快取索引表（用於 LRU 修剪）
 */
function getIndex(storage: Storage | null): string[] {
  if (!storage) {
    return Array.from(memoryCache.keys());
  }
  try {
    const raw = storage.getItem(CACHE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 儲存快取索引表
 */
function saveIndex(storage: Storage | null, index: string[]): void {
  if (!storage) return;
  try {
    storage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('[JudgmentCache] 無法更新快取索引:', e);
  }
}

/**
 * 清除最舊的快取項目（LRU 防爆保護）
 */
function evictOldest(storage: Storage | null, countToEvict: number = 5): void {
  const index = getIndex(storage);
  if (index.length === 0) return;

  const toRemove = index.slice(0, countToEvict);
  const remaining = index.slice(countToEvict);

  for (const key of toRemove) {
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {}
    } else {
      memoryCache.delete(key);
    }
  }

  saveIndex(storage, remaining);
}

/**
 * 寫入快取
 */
export function setCachedData<T>(
  rawKey: string,
  data: T,
  options: CacheOptions = {}
): boolean {
  const storageType = options.storageType || 'sessionStorage';
  const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  const namespace = options.namespace || 'query';
  const normalizedKey = normalizeJudgmentQuery(rawKey);
  const storageKey = `${CACHE_PREFIX}${namespace}_${normalizedKey}`;

  const storage = getStorage(storageType);
  const item: CachedItem<T> = {
    key: rawKey,
    normalizedKey,
    data,
    timestamp: Date.now(),
    ttlMs,
    hits: 0,
  };

  const serialized = JSON.stringify(item);

  // 嘗試寫入 Storage，若超出容量限制則觸發 LRU 剔除
  if (storage) {
    try {
      storage.setItem(storageKey, serialized);
      const index = getIndex(storage).filter(k => k !== storageKey);
      index.push(storageKey);
      
      // 若超過數量上限，清理最舊項目
      if (index.length > MAX_CACHE_ITEMS) {
        evictOldest(storage, index.length - MAX_CACHE_ITEMS);
      } else {
        saveIndex(storage, index);
      }
      return true;
    } catch (e: any) {
      // 捕獲 QuotaExceededError，清理最舊 10 筆後重試一次
      console.warn('[JudgmentCache] 寫入容量超限，執行清理:', e?.name || e);
      evictOldest(storage, 10);
      try {
        storage.setItem(storageKey, serialized);
        const index = getIndex(storage).filter(k => k !== storageKey);
        index.push(storageKey);
        saveIndex(storage, index);
        return true;
      } catch (retryErr) {
        // 重試失敗，轉入記憶體備援
        memoryCache.set(storageKey, item);
        return false;
      }
    }
  } else {
    // 使用記憶體備援
    memoryCache.set(storageKey, item);
    return true;
  }
}

/**
 * 讀取快取
 */
export function getCachedData<T>(
  rawKey: string,
  options: CacheOptions = {}
): CacheResult<T> | null {
  const storageType = options.storageType || 'sessionStorage';
  const namespace = options.namespace || 'query';
  const normalizedKey = normalizeJudgmentQuery(rawKey);
  const storageKey = `${CACHE_PREFIX}${namespace}_${normalizedKey}`;

  const storage = getStorage(storageType);
  let item: CachedItem<T> | null = null;

  if (storage) {
    try {
      const raw = storage.getItem(storageKey);
      if (raw) {
        item = JSON.parse(raw);
      }
    } catch (e) {
      item = null;
    }
  } else {
    item = memoryCache.get(storageKey) || null;
  }

  if (!item) return null;

  // 檢查是否逾期 (TTL)
  const now = Date.now();
  if (now - item.timestamp > item.ttlMs) {
    // 已逾期，自動清理
    if (storage) {
      try {
        storage.removeItem(storageKey);
        const index = getIndex(storage).filter(k => k !== storageKey);
        saveIndex(storage, index);
      } catch {}
    } else {
      memoryCache.delete(storageKey);
    }
    return null;
  }

  // 累加命中次數並回傳
  item.hits = (item.hits || 0) + 1;
  if (storage) {
    try {
      storage.setItem(storageKey, JSON.stringify(item));
    } catch {}
  }

  return {
    data: item.data,
    fromCache: true,
    cachedAt: item.timestamp,
  };
}

/**
 * 移除指定項目的快取
 */
export function removeCachedData(
  rawKey: string,
  options: CacheOptions = {}
): void {
  const storageType = options.storageType || 'sessionStorage';
  const namespace = options.namespace || 'query';
  const normalizedKey = normalizeJudgmentQuery(rawKey);
  const storageKey = `${CACHE_PREFIX}${namespace}_${normalizedKey}`;

  const storage = getStorage(storageType);
  if (storage) {
    try {
      storage.removeItem(storageKey);
      const index = getIndex(storage).filter(k => k !== storageKey);
      saveIndex(storage, index);
    } catch {}
  }
  memoryCache.delete(storageKey);
}

/**
 * 清除所有裁判快取
 */
export function clearJudgmentCache(storageType: 'sessionStorage' | 'localStorage' = 'sessionStorage'): void {
  const storage = getStorage(storageType);
  if (storage) {
    try {
      const index = getIndex(storage);
      for (const key of index) {
        storage.removeItem(key);
      }
      storage.removeItem(CACHE_INDEX_KEY);
      
      // 額外掃描前綴
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    } catch (e) {
      console.warn('[JudgmentCache] 清除快取失敗:', e);
    }
  }
  memoryCache.clear();
}

/**
 * 取得快取統計資訊
 */
export function getJudgmentCacheStats(storageType: 'sessionStorage' | 'localStorage' = 'sessionStorage'): {
  totalItems: number;
  keys: string[];
  estimatedSizeBytes: number;
} {
  const storage = getStorage(storageType);
  if (!storage) {
    return {
      totalItems: memoryCache.size,
      keys: Array.from(memoryCache.keys()),
      estimatedSizeBytes: 0,
    };
  }

  try {
    const index = getIndex(storage);
    let totalBytes = 0;
    for (const key of index) {
      const val = storage.getItem(key);
      if (val) {
        totalBytes += (key.length + val.length) * 2; // UTF-16 約 2 bytes
      }
    }
    return {
      totalItems: index.length,
      keys: index,
      estimatedSizeBytes: totalBytes,
    };
  } catch {
    return { totalItems: 0, keys: [], estimatedSizeBytes: 0 };
  }
}

/**
 * 高階包裝函式：先查本地快取，未命中時才調用遠端 API，並自動存入快取與 IndexedDB
 */
export async function withJudgmentCache<T>(
  rawKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & { bypassCache?: boolean } = {}
): Promise<CacheResult<T>> {
  // 1. 若非強制重整，嘗試讀取快取（優先 sessionStorage/記憶體，次之 IndexedDB）
  if (!options.bypassCache) {
    const cached = getCachedData<T>(rawKey, options);
    if (cached) {
      return cached;
    }

    // 嘗試自大型判決離線資料庫 (IndexedDB) 撈取
    if (options.namespace === 'tlr_fulltext' || options.namespace === 'jdoc') {
      try {
        const normKey = normalizeJudgmentQuery(rawKey);
        const dbItem = await getJudgmentFromDb(normKey);
        if (dbItem && dbItem.fulltext) {
          const parsedData = options.namespace === 'jdoc' 
            ? (typeof dbItem.fulltext === 'string' && dbItem.fulltext.startsWith('{') ? JSON.parse(dbItem.fulltext) : dbItem.fulltext)
            : dbItem.fulltext;

          // 重新載入 sessionStorage 以利即時存取
          setCachedData<T>(rawKey, parsedData as unknown as T, options);
          return {
            data: parsedData as unknown as T,
            fromCache: true,
            cachedAt: dbItem.storedAt,
          };
        }
      } catch {}
    }
  }

  // 2. 快取未命中或強制重整：呼叫遠端 fetcher
  const data = await fetcher();

  // 3. 成功取得資料後存入快取與 IndexedDB
  if (data !== null && data !== undefined) {
    setCachedData<T>(rawKey, data, options);

    // 若為全文資料，非同步同步備份至 IndexedDB 大容量資料庫
    if (options.namespace === 'tlr_fulltext' || options.namespace === 'jdoc') {
      const fulltextStr = typeof data === 'string' 
        ? data 
        : (data as any)?.JFULL || (data as any)?.fulltext || JSON.stringify(data);

      if (fulltextStr && fulltextStr.length > 50) {
        saveJudgmentToDb({
          id: normalizeJudgmentQuery(rawKey),
          rawCitation: rawKey,
          fulltext: fulltextStr,
          storedAt: Date.now(),
          source: options.namespace === 'jdoc' ? 'judicial_api' : 'tlr'
        }).catch(() => {});
      }
    }
  }

  return {
    data,
    fromCache: false,
    cachedAt: Date.now(),
  };
}
