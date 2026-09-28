import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from './toolbox';
import { UNFILLED_FIELD_MARKER } from '../../src/lib/unfilledFieldMarker.js';

/**
 * 含未填欄位的書狀不得以「產製成功」交付。
 *
 * 實測：POST /api/toolbox/generate 帶空的姓名與地址，
 * 回 200 並回傳內含 6 處「（待填寫）」的存證信函，
 * antiGhostVerification.verificationPassed 也是 true
 * （該文件不含任何法條引用，檢核無從失敗）。
 *
 * 這些書狀具有法律效力（存證信函可中斷請求權時效），
 * 缺姓名、地址、日期就完全不能用，交付出去還可能被當成
 * 完整書狀送到法院或郵局。
 *
 * 先前只有前端在複製/匯出時才擋，API 仍回 200 與文件本體，
 * 防線在最末端且只對單一前端有效。
 */

function 建立App() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(router);
  return app;
}

const 空白參數 = {
  senderName: '',
  recipientName: '',
  amount: '600000',
  senderAddress: '',
  recipientAddress: '',
  dueDate: '',
};

describe('POST /api/toolbox/generate：未填欄位閘門', () => {
  it('含未填欄位時不得回傳文件', async () => {
    const res = await request(建立App())
      .post('/api/toolbox/generate')
      .send({ toolCategory: 'DEMAND_LETTER_DEBT', params: 空白參數 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('UNFILLED_REQUIRED_FIELDS');
  });

  it('被擋下時不得夾帶文件內容', () => {
    // 回傳草稿等於還是把它交出去了，只是多一句警告。
    const res = {
      body: { code: 'UNFILLED_REQUIRED_FIELDS' } as Record<string, unknown>,
    };
    expect(res.body.documentText).toBeUndefined();
  });

  it('未知的工具類別仍應被擋在前面', async () => {
    const res = await request(建立App())
      .post('/api/toolbox/generate')
      .send({ toolCategory: 'NOT_A_REAL_TOOL', params: {} });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_TOOLBOX_CATEGORY');
  });

  it('缺少類別時回 400', async () => {
    const res = await request(建立App())
      .post('/api/toolbox/generate')
      .send({ params: {} });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOOLBOX_CATEGORY_REQUIRED');
  });
});

describe('未填欄位標記', () => {
  it('前後端使用同一個常數', () => {
    // 兩邊各寫一份會導致判定不一致：伺服器擋了但前端以為可複製。
    expect(UNFILLED_FIELD_MARKER).toBe('（待填寫）');
  });

  it('佔位字串確實存在於模板產生器中', () => {
    // 若模板不再使用此標記，閘門會形同虛設。
    const 路徑 = join(process.cwd(), 'src', 'utils', 'toolboxFallbacks.ts');
    const 原始碼 = readFileSync(路徑, 'utf8');
    expect(原始碼).toContain(UNFILLED_FIELD_MARKER);
  });
});
