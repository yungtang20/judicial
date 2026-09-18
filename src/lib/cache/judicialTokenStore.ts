/**
 * 司法院 API Token 本地跨頁持久化管理 (Judicial Token Store)
 * 
 * 作用：
 * 司法院官方裁判 API (JDG Auth) 與開放資料平臺 (Member Token) 有其授權時效 (如 6 小時)。
 * 透過本地 sessionStorage 安全快取 Token 與到期時間，防止頁面重新整理或切換分頁時重複發送 Auth 請求，
 * 避免頻繁觸發司法院官方防火牆或 Rate Limit。
 */

const JDG_TOKEN_KEY = 'judicial_jdg_token_cache';
const MEMBER_TOKEN_KEY = 'judicial_member_token_cache';

export interface StoredTokenPayload {
  token: string;
  expiresAt: number; // 時間戳記 (ms)
  createdAt: number;
}

function safeSessionStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// 記憶體備援
let inMemoryJdgToken: StoredTokenPayload | null = null;
let inMemoryMemberToken: StoredTokenPayload | null = null;

/**
 * 儲存 JDG 裁判 API Token (預設有效期限 6 小時，為保險起見提前 10 分鐘視為失效)
 */
export function saveJdgToken(token: string, expiresInHours: number = 6): void {
  if (!token) return;
  const now = Date.now();
  // 若傳入小於等於 0 則視為即刻過期
  let expiresAt = now - 1000;
  if (expiresInHours > 0) {
    const ttlMs = Math.max(expiresInHours * 60 * 60 * 1000 - 10 * 60 * 1000, 60 * 1000);
    expiresAt = now + ttlMs;
  }
  const payload: StoredTokenPayload = {
    token,
    expiresAt,
    createdAt: now
  };

  inMemoryJdgToken = payload;
  const storage = safeSessionStorage();
  if (storage) {
    try {
      storage.setItem(JDG_TOKEN_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[JudicialTokenStore] 無法寫入 sessionStorage:', e);
    }
  }
}

/**
 * 取得有效的 JDG 裁判 API Token，若已過期則回傳 null 並自動清理
 */
export function getValidJdgToken(): string | null {
  const now = Date.now();
  const storage = safeSessionStorage();
  let payload: StoredTokenPayload | null = inMemoryJdgToken;

  if (storage) {
    try {
      const raw = storage.getItem(JDG_TOKEN_KEY);
      if (raw) {
        payload = JSON.parse(raw);
      }
    } catch {
      payload = null;
    }
  }

  if (!payload || !payload.token) return null;

  // 檢查時效
  if (now >= payload.expiresAt) {
    clearJdgToken();
    return null;
  }

  return payload.token;
}

/**
 * 清除 JDG Token
 */
export function clearJdgToken(): void {
  inMemoryJdgToken = null;
  const storage = safeSessionStorage();
  if (storage) {
    try {
      storage.removeItem(JDG_TOKEN_KEY);
    } catch {}
  }
}

/**
 * 儲存會員授權 Token
 */
export function saveMemberToken(token: string, expiryStr?: string): void {
  if (!token) return;
  const now = Date.now();
  let ttlMs = 4 * 60 * 60 * 1000; // 預設 4 小時
  if (expiryStr) {
    const parsed = Date.parse(expiryStr);
    if (!isNaN(parsed) && parsed > now) {
      ttlMs = parsed - now - 5 * 60 * 1000;
    }
  }

  const payload: StoredTokenPayload = {
    token,
    expiresAt: now + ttlMs,
    createdAt: now
  };

  inMemoryMemberToken = payload;
  const storage = safeSessionStorage();
  if (storage) {
    try {
      storage.setItem(MEMBER_TOKEN_KEY, JSON.stringify(payload));
    } catch {}
  }
}

/**
 * 取得有效的會員授權 Token
 */
export function getValidMemberToken(): string | null {
  const now = Date.now();
  const storage = safeSessionStorage();
  let payload: StoredTokenPayload | null = inMemoryMemberToken;

  if (storage) {
    try {
      const raw = storage.getItem(MEMBER_TOKEN_KEY);
      if (raw) {
        payload = JSON.parse(raw);
      }
    } catch {
      payload = null;
    }
  }

  if (!payload || !payload.token) return null;

  if (now >= payload.expiresAt) {
    clearMemberToken();
    return null;
  }

  return payload.token;
}

/**
 * 清除會員 Token
 */
export function clearMemberToken(): void {
  inMemoryMemberToken = null;
  const storage = safeSessionStorage();
  if (storage) {
    try {
      storage.removeItem(MEMBER_TOKEN_KEY);
    } catch {}
  }
}
