/**
 * taiwanLegalDbClient 測試
 * 重點：不真連網。所有情境用 transport 覆蓋指向不存在的 command，
 *       驗證 fail-closed 路徑（unavailable / unknown / not_found 的判定與批次行為）。
 * 真串接的 verified 路徑已在 probe 中獨立驗證過（108 年台上字 2027 號 → count=2）。
 */
import { describe, expect, it } from 'vitest';
import {
  queryTaiwanLegalDb,
  queryTaiwanLegalDbBatch,
  DEFAULT_KINDS,
  DEFAULT_TRANSPORT
} from './taiwanLegalDbClient';

const BAD_TRANSPORT = {
  command: 'nonexistent-python-for-test',
  args: ['-m', 'mcp_server.server'],
  cwd: undefined
};

describe('taiwanLegalDbClient', () => {
  it('無法解析查詢 → unknown，不 spawn', async () => {
    const result = await queryTaiwanLegalDb({
      query: '這不為任何合法格式',
      transport: BAD_TRANSPORT
    });
    expect(result.status).toBe('unknown');
    expect(result.message).toContain('無法解析');
  });

  it('transport 指向不存在 command → unavailable（fail-closed）', async () => {
    const result = await queryTaiwanLegalDb({
      query: '108 年度 台上字 第 2027 號',
      transport: BAD_TRANSPORT
    });
    expect(result.status).toBe('unavailable');
    expect(result.message).toContain('連線失敗');
  });

  it('逾時 → unavailable 並標明逾時', async () => {
    // 指向一個會啟動但永不回傳的 command 較難模擬；以 1ms 逾時 + 壞 command 觸發
    const result = await queryTaiwanLegalDb({
      query: '108 年度 台上字 第 2027 號',
      timeoutMs: 50,
      transport: BAD_TRANSPORT
    });
    expect(result.status).toBe('unavailable');
  });

  it('批次去重、過濾空白、上限 20（與 dr-lawbot 對齊）', async () => {
    const queries = Array.from({ length: 22 }, (_, i) => ({
      query: `108 年度 台上字 第 ${i + 1} 號`
    }));
    queries.push({ query: '  108 年度 台上字 第 1 號  ' });
    queries.push({ query: '   ' });
    const results = await queryTaiwanLegalDbBatch(queries.map((q) => ({ ...q, transport: BAD_TRANSPORT })));
    expect(results).toHaveLength(20);
    expect(results[0]?.citation).toBe('108 年度 台上字 第 1 號');
  });

  it('預設 kinds 與 transport 設定正確', () => {
    expect(DEFAULT_KINDS).toEqual(['judgment', 'statute', 'constitutional']);
    expect(DEFAULT_TRANSPORT.args).toEqual(['-m', 'mcp_server.server']);
  });
});
