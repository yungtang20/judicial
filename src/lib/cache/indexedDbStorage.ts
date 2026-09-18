/**
 * 司法院判決大容量離線資料庫 (IndexedDB Storage Engine)
 * 
 * 解決瀏覽器 localStorage / sessionStorage 5MB 限制。
 * 支援儲存完整判決書全文、判例要旨、附圖附表，可容納數百萬字。
 * 具備 Node.js / SSR / Private Browsing 自動降級 (Fallback) 保障。
 */

const DB_NAME = 'JudicialOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'judgments_fulltext';

export interface StoredJudgment {
  id: string; // 正規化後的案號或 JID，如 "112台上2409" 或 "TPSV,112,台上,2409,..."
  rawCitation: string;
  courtName?: string;
  caseType?: string;
  date?: string;
  fulltext: string;
  summary?: string;
  storedAt: number;
  source: 'tlr' | 'judicial_api' | 'manual';
}

// 記憶體降級備援
const memoryStore = new Map<string, StoredJudgment>();

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error('IndexedDB not supported in current environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('storedAt', 'storedAt', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 儲存裁判全文至 IndexedDB
 */
export async function saveJudgmentToDb(judgment: StoredJudgment): Promise<boolean> {
  if (!isIndexedDbSupported()) {
    memoryStore.set(judgment.id, judgment);
    return true;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(judgment);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        // 降級入記憶體
        memoryStore.set(judgment.id, judgment);
        resolve(false);
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    memoryStore.set(judgment.id, judgment);
    return false;
  }
}

/**
 * 取得裁判全文
 */
export async function getJudgmentFromDb(id: string): Promise<StoredJudgment | null> {
  if (!isIndexedDbSupported()) {
    return memoryStore.get(id) || null;
  }

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || memoryStore.get(id) || null);
      req.onerror = () => resolve(memoryStore.get(id) || null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return memoryStore.get(id) || null;
  }
}

/**
 * 刪除單筆裁判
 */
export async function deleteJudgmentFromDb(id: string): Promise<boolean> {
  memoryStore.delete(id);
  if (!isIndexedDbSupported()) return true;

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}

/**
 * 清空所有儲存的裁判
 */
export async function clearAllJudgmentsFromDb(): Promise<boolean> {
  memoryStore.clear();
  if (!isIndexedDbSupported()) return true;

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}

/**
 * 取得目前 IndexedDB 中存儲的裁判筆數
 */
export async function getJudgmentCountInDb(): Promise<number> {
  if (!isIndexedDbSupported()) {
    return memoryStore.size;
  }

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || memoryStore.size);
      req.onerror = () => resolve(memoryStore.size);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return memoryStore.size;
  }
}
