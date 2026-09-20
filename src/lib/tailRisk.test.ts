import { describe, expect, it } from 'vitest';
import { verifyLegalCitations } from './citationVerifier';
import { precheckLegalInput } from './legalInputPrecheck';
import { generateVerifiedDocument, verifyGeneratedDocument } from './generatedDocumentPipeline';

/**
 * 尾部風險評測集：鎖定最難的少數案例，確認每一件失敗都能說出是哪一層擋下的。
 * 設計原則：不追求全過，追求失敗可歸因。新增案例不得放寬既有治理測試。
 */

interface TailCase {
  id: string;
  group: '幽靈法條' | '幽靈裁判' | '輸入邊界' | '對照組';
  text: string;
  expectBlocked: boolean;
}

const TAIL_CASES: TailCase[] = [
  // 幽靈法條：不存在的條號或段項溢出，本機索引無法確認，應擋下
  { id: 'T01', group: '幽靈法條', text: '依民法第999條規定，請求損害賠償。', expectBlocked: true },
  { id: 'T02', group: '幽靈法條', text: '依刑法第999條規定，提起告訴。', expectBlocked: true },
  { id: 'T03', group: '幽靈法條', text: '依民事訴訟法第999條規定，提起上訴。', expectBlocked: true },
  { id: 'T04', group: '幽靈法條', text: '依民法第184條第99項規定，請求賠償。', expectBlocked: true },
  { id: 'T05', group: '幽靈法條', text: '依民法第205條第99項規定，計算利息。', expectBlocked: true },
  { id: 'T06', group: '幽靈法條', text: '依民法第14條第99項規定，聲請監護宣告。', expectBlocked: true },
  // 幽靈裁判：字號異常，應由驗證層判定為可疑並擋下
  { id: 'T07', group: '幽靈裁判', text: '依最高法院113年度台上字第999999號判決意旨，請求賠償。', expectBlocked: true },
  { id: 'T08', group: '幽靈裁判', text: '依最高法院112年度台上字第999998號判決意旨，提起上訴。', expectBlocked: true },
  { id: 'T09', group: '幽靈裁判', text: '依民法第184條及最高法院113年度台上字第999999號判決，請求賠償。', expectBlocked: true },
  { id: 'T10', group: '幽靈裁判', text: '依民法第184條與民法第999條規定，請求賠償。', expectBlocked: true },
  // 輸入邊界：空輸入與混合真假引用，應在前查核或管線入口擋下
  { id: 'T11', group: '輸入邊界', text: '   ', expectBlocked: true },
  { id: 'T12', group: '輸入邊界', text: '。。。???', expectBlocked: false },
  { id: 'T13', group: '輸入邊界', text: '依民法第184條第1項前段及民法第999條規定，請求賠償。', expectBlocked: true },
  { id: 'T14', group: '輸入邊界', text: '依民事訴訟法第999條及民法第184條規定，提起訴訟。', expectBlocked: true },
  { id: 'T15', group: '輸入邊界', text: '本件已逾民法第125條時效，仍依民法第999條請求給付。', expectBlocked: true },
  // 對照組：真實條文，應順利通過，避免過度攔截
  { id: 'C01', group: '對照組', text: '依民法第184條第1項前段規定，請求損害賠償。', expectBlocked: false },
  { id: 'C02', group: '對照組', text: '依民法第125條規定，主張時效抗辯。', expectBlocked: false },
  { id: 'C03', group: '對照組', text: '依民法第129條規定，主張時效中斷。', expectBlocked: false },
  { id: 'C04', group: '對照組', text: '依民法第767條規定，請求返還所有物。', expectBlocked: false },
  { id: 'C05', group: '對照組', text: '依民事訴訟法第244條規定，提起民事訴訟。', expectBlocked: false },
];

describe('尾部風險評測集', () => {
  it('前查核層可歸因：應擋即擋，應放即放', () => {
    for (const tailCase of TAIL_CASES) {
      const precheck = precheckLegalInput(tailCase.text, 'generation');
      if (tailCase.id === 'T12') {
        // 無引用符號的純標點輸入：前查核不誤判為引用問題，交由後續層處理
        expect(precheck.status).toBe('pass');
        continue;
      }
      if (tailCase.expectBlocked) {
        expect(
          precheck.status,
          `${tailCase.id} 前查核應擋下，實際為 ${precheck.status}`
        ).toBe('reject');
      } else {
        expect(
          precheck.status,
          `${tailCase.id} 對照組不應被前查核擋下`
        ).toBe('pass');
      }
    }
  });

  it('引用驗證層可歸因：幽靈引用不得被標記為已驗證', () => {
    for (const tailCase of TAIL_CASES) {
      if (tailCase.id === 'T11' || tailCase.id === 'T12') continue;
      const result = verifyLegalCitations(tailCase.text);
      if (tailCase.expectBlocked) {
        expect(
          result.totalChecked,
          `${tailCase.id} 應至少檢出 1 筆引用`
        ).toBeGreaterThanOrEqual(1);
        const hasSuspicious =
          result.ghostCount >= 1 || result.results.some((item) => !item.verified);
        expect(hasSuspicious, `${tailCase.id} 驗證層應標記可疑`).toBe(true);
      } else {
        expect(
          result.results.length === 0 || result.results.every((item) => item.verified),
          `${tailCase.id} 對照組不應出現未驗證引用`
        ).toBe(true);
      }
    }
  });

  it('管線層可歸因：生成後驗證維持先生成後驗證與空文件拒絕', async () => {
    await expect(generateVerifiedDocument(async () => '   ')).rejects.toThrow(
      '法律文件生成結果為空'
    );

    for (const tailCase of TAIL_CASES) {
      if (tailCase.id === 'T11' || tailCase.id === 'T12') continue;
      if (tailCase.expectBlocked) {
        const verification = verifyGeneratedDocument(tailCase.text);
        expect(
          verification.antiGhostVerification.verificationPassed,
          `${tailCase.id} 管線層應判定驗證未通過`
        ).toBe(false);
        await expect(
          generateVerifiedDocument(async () => tailCase.text),
          `${tailCase.id} 管線層應拒絕回傳`
        ).rejects.toThrow();
      } else {
        const verified = await generateVerifiedDocument(async () => tailCase.text);
        expect(
          verified.antiGhostVerification.verificationPassed,
          `${tailCase.id} 對照組管線層應通過`
        ).toBe(true);
      }
    }
  });
});
