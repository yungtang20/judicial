import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from './unifiedWorkflow';
import { defaultAIProvider } from '../../src/ai/providers/providerRegistry.js';

/**
 * 壓力測試發現的兩個實際問題，固定成回歸測試。
 *
 * 1. 未設定 AI 金鑰時回 500，且把 GEMINI_API_KEY_UNAVAILABLE 回給用戶端。
 *    提供商設定問題重試不會成功，必須與暫時性故障區分，
 *    沿用 agentChat 端點既有的 503 + SERVICE_UNAVAILABLE 慣例。
 *
 * 2. 端點完全沒有輸入驗證：POST {} 會直接送出提示詞並呼叫 AI，
 *    等於空請求也消耗上游呼叫。必須先驗證再呼叫。
 */

vi.mock('../services/aiProvider', async () => {
  const actual = await vi.importActual<typeof import('../../src/ai/providers/providerRegistry.js')>('../../src/ai/providers/providerRegistry.js');
  return {
    ...actual,
    defaultAIProvider: { generate: vi.fn() },
  };
});

const mockedGenerate = vi.mocked(defaultAIProvider.generate);

function 建立App() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(router);
  return app;
}

describe('POST /api/workflow/suggest-field', () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('缺少必要欄位時回 400，且不呼叫 AI', async () => {
    const res = await request(建立App()).post('/api/workflow/suggest-field').send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
    // 空請求不該消耗上游呼叫
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('欄位不是字串時回 400', async () => {
    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: 123, toolName: '民事起訴狀' });

    expect(res.status).toBe(400);
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('AI 提供商未設定時回 503，不是 500', async () => {
    mockedGenerate.mockRejectedValue(new Error('GEMINI_API_KEY_UNAVAILABLE'));

    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀', incidentDetails: '民國113年' });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('不把內部錯誤訊息回傳給用戶端', async () => {
    mockedGenerate.mockRejectedValue(new Error('AGNES_API_KEY_UNAVAILABLE'));

    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀' });

    // 環境變數名稱屬於內部資訊，不應出現在對外的回應
    expect(JSON.stringify(res.body)).not.toContain('API_KEY');
    expect(res.body.details).toBeUndefined();
  });

  it('非設定問題的失敗回 422 而非 500，且不洩漏細節', async () => {
    // 模型輸出異常（空回應、上游錯誤、格式無法解析）都屬於
    // 「這次取不到建議」，不是伺服器故障。
    // 這是便利功能，使用者仍可自行填寫該欄位；
    // 回 500 只會讓前端顯示紅色錯誤並誤導成系統出問題。
    mockedGenerate.mockRejectedValue(new Error('連線至 /var/secrets/token 失敗'));

    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FIELD_SUGGESTION_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toContain('/var/secrets');
  });

  it('正常回應時回傳建議選項', async () => {
    mockedGenerate.mockResolvedValue({ text: '["民國113年1月1日", "民國113年2月1日", "民國113年3月1日"]' } as never);

    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀', incidentDetails: '民國113年' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.options).toHaveLength(3);
  });

  it('插入提示詞的欄位有長度上限', async () => {
    mockedGenerate.mockResolvedValue({ text: '["選項一"]' } as never);

    await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: 'A'.repeat(5000), toolName: 'B'.repeat(5000), incidentDetails: 'C'.repeat(50000) })
      .expect(200);

    const prompt = mockedGenerate.mock.calls[0][0] as string;
    // 真正的不變量：超長輸入被截斷，沒有原樣進入提示詞。
    expect(prompt).not.toContain('A'.repeat(200));
    expect(prompt).not.toContain('B'.repeat(200));
    expect(prompt).not.toContain('C'.repeat(6000));
    // 總長會隨格式說明增減，這裡只防無上限膨脹；
    // 注入值本身的上限由上面三條「沒有原樣進入提示詞」的斷言守住。
    expect(prompt.length).toBeLessThan(7000);
  });

  it('AI 未給出可用建議時不得回報成功', async () => {
    // 實測：正式站回 {"success":true,"options":[]}。
    // 舊實作對整段回應取 /\[.*\]/s，取不到就默默當成空陣列，
    // 卻仍回 success:true。取不到建議不是成功，是失敗。
    mockedGenerate.mockResolvedValue({ text: '{"note":"我無法提供建議"}' } as never);

    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FIELD_SUGGESTION_UNAVAILABLE');
    expect(res.body.success).not.toBe(true);
  });

  it('AI 回傳空陣列時同樣不得回報成功', async () => {
    mockedGenerate.mockResolvedValue({ text: '[]' } as never);
    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀' });
    expect(res.status).toBe(422);
  });

  it('AI 把選項包在物件裡也要能取出', async () => {
    // 啟用 JSON 模式後模型常回 {"options": [...]} 而非直接是陣列。
    mockedGenerate.mockResolvedValue({ text: '{"options":["民國113年1月1日","民國113年2月1日"]}' } as never);
    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀' });
    expect(res.status).toBe(200);
    expect(res.body.options).toEqual(['民國113年1月1日', '民國113年2月1日']);
  });

  it('直接回傳陣列時正常解析', async () => {
    mockedGenerate.mockResolvedValue({ text: '["選項一","選項二","選項三"]' } as never);
    const res = await request(建立App())
      .post('/api/workflow/suggest-field')
      .send({ fieldLabel: '發生日期', toolName: '民事起訴狀' });
    expect(res.status).toBe(200);
    expect(res.body.options).toHaveLength(3);
  });
});
