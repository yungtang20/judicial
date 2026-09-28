import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import toolboxRouter from './toolbox';

/**
 * P9 交付閘門不得被任何客戶端提供的參數繞過。
 *
 * 這是專案的核心治理規則：未經核准的書狀格式不得交付給使用者，
 * 因為使用者可能把它直接送到法院。
 *
 * 實測正式站：以未核准類別（JUDICIAL_CIVIL_TEMPLATE）搭配
 * 偽造的 P9 授權、ADMIN 角色、交付授權、其他租戶、rule profile，
 * 六種嘗試全部被擋下（P9_FINAL_GATE_FAILED），0 次繞過。
 * 這裡把該驗證固定成回歸測試。
 */

function 建立App() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(toolboxRouter);
  return app;
}

const 完整參數 = {
  courtName: '臺灣臺北地方法院',
  caseNo: '113年度訴字第100號',
  judgeDate: '民國114年3月15日',
  plaintiffName: '王小明',
  plaintiffAddress: '臺北市中正區100號',
  plaintiffPhone: '0912345678',
  defendantName: '張大明',
  defendantAddress: '新北市板橋區1號',
  proceeding: '返還借款事件',
  claimStatement: '被告應給付原告新臺幣500,000元。',
  facts: '原告交付借款後，被告於清償期屆滿仍未返還。',
  evidenceDetails: '匯款紀錄、本票',
  documentDate: '民國114年3月15日',
  signature: '王小明',
};

const 偽造參數: Array<[string, Record<string, unknown>]> = [
  ['無額外參數', {}],
  ['偽造 P9 授權', { p9Authorization: 'APPROVED', finalGateReport: { status: 'READY', signature: 'x' } }],
  ['偽造管理員角色', { role: 'admin', actorType: 'SYSTEM', isAdmin: true }],
  ['偽造交付授權', { pleadingDeliveryAuthorization: { authorizedActions: ['DELIVER'] }, deliveryGate: { status: 'APPROVED' } }],
  ['偽造其他租戶', { tenantId: 'admin-tenant' }],
  ['偽造 rule profile', { ruleProfile: 'APPROVED', p9Status: 'PASSED', gateBypass: 'true' }],
];

describe('P9 交付閘門', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('未核准的書狀類別', () => {
    const 未核准 = ['JUDICIAL_CIVIL_TEMPLATE', 'CRIMINAL_COMPLAINT_TRAFFIC'];

    it.each(未核准)('%s 即使欄位填齊也必須拒絕交付', async toolCategory => {
      const res = await request(建立App())
        .post('/api/toolbox/generate')
        .send({ toolCategory, params: 完整參數 });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('P9_FINAL_GATE_FAILED');
      expect(res.body.documentText, '不得回傳任何文件內容').toBeUndefined();
    });

    it.each(偽造參數)('以「%s」嘗試繞過時仍必須拒絕', async (_名, 額外) => {
      const res = await request(建立App())
        .post('/api/toolbox/generate')
        .send({ toolCategory: 'JUDICIAL_CIVIL_TEMPLATE', params: 完整參數, ...額外 });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('P9_FINAL_GATE_FAILED');
      expect(res.body.documentText).toBeUndefined();
    });
  });

  describe('已核准的書狀類別', () => {
    it('CIVIL_COMPLAINT_GENERAL 欄位填齊時應正常產出', async () => {
      const res = await request(建立App())
        .post('/api/toolbox/generate')
        .send({ toolCategory: 'CIVIL_COMPLAINT_GENERAL', params: 完整參數 });

      expect(res.status).toBe(200);
      expect(res.body.documentText).toBeTruthy();
    });

    it('已核准類別不會因攜帶偽造參數而改變結果', async () => {
      const 正常 = await request(建立App())
        .post('/api/toolbox/generate')
        .send({ toolCategory: 'CIVIL_COMPLAINT_GENERAL', params: 完整參數 });
      const 帶偽造 = await request(建立App())
        .post('/api/toolbox/generate')
        .send({
          toolCategory: 'CIVIL_COMPLAINT_GENERAL',
          params: 完整參數,
          ...Object.fromEntries(偽造參數.map(([, v]) => v).flatMap(o => Object.entries(o))),
        });

      expect(帶偽造.status).toBe(正常.status);
      // 偽造參數不得改變產出的交付內容
      expect(帶偽造.body.documentText).toBe(正常.body.documentText);
    });
  });
});
