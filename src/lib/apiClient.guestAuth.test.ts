import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithAuth } from './apiClient';

/**
 * 訪客驗證不可用時必須是可辨識的訊號，而不是無法定義的 401。
 *
 * 實測：正式環境未設定 ALLOW_GUEST_MODE 時，/api/auth/guest 回 403，
 * 客戶端靜默吞掉這個結果，使用者只看到「HTTP Error 401」，
 * 無從判斷是登入狀態過期、權杖失效，還是系統根本沒開訪客模式。
 *
 * 這三種情況需要完全不同的處理，只有最後一種是使用者能自行處理的。
 */
const 真fetch = global.fetch;

const 回應 = (狀態: number, 內容: unknown) => ({
  ok: 狀態 >= 200 && 狀態 < 300,
  status: 狀態,
  statusText: String(狀態),
  headers: new Headers(),
  json: async () => 內容
});

describe('訪客驗證不可用時的處理', () => {
  beforeEach(() => {
    // 每個案例都重新掛上 mock：afterEach 會還原成真實 fetch，
    // 若只在模組載入時掛一次，第二個案例開始就會拿到真實 fetch。
    global.fetch = vi.fn();
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    global.fetch = 真fetch;
  });

  it('取得訪客權杖後應重試並成功', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(回應(401, { error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(回應(200, { token: 'guest_test_token' }))
      .mockResolvedValueOnce(回應(200, { data: 'ok' }));

    const res = await fetchWithAuth('/api/sdlc/projects');
    expect(res.status).toBe(200);
    expect(sessionStorage.getItem('judicial_guest_token')).toBe('guest_test_token');
  });

  it('訪客驗證端點拒絕時必須回報明確代碼', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(回應(401, { error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(回應(403, { error: 'GUEST_MODE_DISABLED_IN_PRODUCTION' }));

    const res = await fetchWithAuth('/api/sdlc/projects');
    expect(res.status).toBe(401);
    const 內容 = await res.json();
    expect(內容.code).toBe('GUEST_AUTH_UNAVAILABLE');
    // 訊息必須說明可以怎麼處理
    expect(內容.error).toContain('訪客模式');
  });

  it('訪客驗證失敗時不得寫入任何權杖', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(回應(401, { error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(回應(403, { error: 'GUEST_MODE_DISABLED_IN_PRODUCTION' }));

    await fetchWithAuth('/api/sdlc/projects');
    expect(sessionStorage.getItem('judicial_guest_token')).toBeNull();
  });

  it('已有有效權杖時不得重新索取訪客權杖', async () => {
    sessionStorage.setItem('judicial_guest_token', 'existing_token');
    (global.fetch as any).mockResolvedValueOnce(回應(200, { data: 'ok' }));

    const res = await fetchWithAuth('/api/sdlc/projects');
    expect(res.status).toBe(200);
    expect((global.fetch as any)).toHaveBeenCalledTimes(1);
  });

  it('對訪客驗證端點本身不得遞迴', async () => {
    (global.fetch as any).mockResolvedValueOnce(回應(401, { error: 'UNAUTHORIZED' }));
    await fetchWithAuth('/api/auth/guest');
    expect((global.fetch as any)).toHaveBeenCalledTimes(1);
  });

  it('非 401 的錯誤不得觸發訪客權杖流程', async () => {
    (global.fetch as any).mockResolvedValueOnce(回應(500, { error: 'SERVER_ERROR' }));
    const res = await fetchWithAuth('/api/sdlc/projects');
    expect(res.status).toBe(500);
    expect((global.fetch as any)).toHaveBeenCalledTimes(1);
  });
});
