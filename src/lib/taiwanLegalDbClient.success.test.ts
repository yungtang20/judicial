import { beforeEach, describe, expect, it, vi } from 'vitest';

const mcp = vi.hoisted(() => ({
  connect: vi.fn(),
  callTool: vi.fn(),
  close: vi.fn()
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    connect = mcp.connect;
    callTool = mcp.callTool;
    close = mcp.close;
  }
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class {}
}));

import { queryTaiwanLegalDb } from './taiwanLegalDbClient';

const TEST_TRANSPORT = { command: 'mock-mcp', args: [] };

beforeEach(() => {
  vi.clearAllMocks();
  mcp.connect.mockResolvedValue(undefined);
  mcp.close.mockResolvedValue(undefined);
});

describe('taiwanLegalDbClient MCP response handling', () => {
  it('returns a verified statute with the MCP text summary', async () => {
    mcp.callTool.mockResolvedValue({
      content: [
        { type: 'text', text: '民法第184條侵權行為規定' },
        { type: 'image', data: 'ignored' }
      ]
    });

    const result = await queryTaiwanLegalDb({
      query: '民法第184條',
      kinds: ['statute'],
      transport: TEST_TRANSPORT
    });

    expect(mcp.callTool).toHaveBeenCalledWith(
      { name: 'query_regulation', arguments: { law_name: '民法', article_no: 184 } },
      undefined,
      { timeout: 15_000 }
    );
    expect(result).toMatchObject({
      status: 'verified',
      tool: 'query_regulation',
      rawSummary: '民法第184條侵權行為規定'
    });
  });

  it('returns not_found when the MCP tool reports an error', async () => {
    mcp.callTool.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: '查無資料' }]
    });

    const result = await queryTaiwanLegalDb({
      query: '釋字第748號',
      kinds: ['constitutional'],
      transport: TEST_TRANSPORT
    });

    expect(mcp.callTool).toHaveBeenCalledWith(
      { name: 'get_interpretation', arguments: { case_id: '釋字第748號' } },
      undefined,
      { timeout: 15_000 }
    );
    expect(result.status).toBe('not_found');
  });
});
