import { describe, expect, it } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';

/**
 * 民國日期不得重複前綴。
 *
 * 實測產出的存證信函出現「詎台端自民國 民國114年4月 起」——
 * 範本寫死「民國」前綴，而使用者輸入民國日期時自然會寫「民國114年4月」。
 * 使用者看到自己剛剛輸入的內容被重複，會懷疑整份文件是否可靠。
 *
 * 民國日期是台灣法律文件的常見寫法，兩種輸入形式都必須正確處理。
 */
describe('民國日期的正規化', () => {
  const 產製 = (startDefaultMonth: string) =>
    buildFallbackToolboxResult('DEMAND_LETTER_RENT_DEFAULT', {
      senderName: '王小明',
      recipientName: '張大明',
      senderAddress: '臺北市中正區100號3樓',
      recipientAddress: '新北市板橋區1號',
      leaseAddress: '臺北市中正區100號3樓',
      monthlyRent: '25000',
      defaultMonths: '3',
      startDefaultMonth,
    } as unknown as Record<string, never>).documentText;

  /** 只取起算年月那一段；文件落款的「中華民國 115 年…」與此無關。 */
  const 起算段 = (文件: string) => {
    const m = 文件.match(/自[^、\n]{0,20}起/);
    return m ? m[0] : '';
  };

  it('輸入「114年4月」時補上民國', () => {
    expect(起算段(產製('114年4月'))).toBe('自民國 114年4月 起');
  });

  it('輸入「民國114年4月」時不得重複', () => {
    const 段 = 起算段(產製('民國114年4月'));
    expect(段).toBe('自民國 114年4月 起');
    expect(段).not.toContain('民國民國');
  });

  it('輸入「中華民國114年」時正規化為民國', () => {
    const 段 = 起算段(產製('中華民國114年'));
    expect(段).toBe('自民國 114年 起');
  });

  it('兩種輸入形式應產出相同結果', () => {
    expect(產製('114年4月')).toBe(產製('民國114年4月'));
  });

  it('缺值時仍標記待填寫', () => {
    expect(產製('')).toContain('（待填寫）');
  });

  it('文件落款的中華民國不受影響', () => {
    // 落款寫「中華民國 115 年…」是正式格式，不應被正規化成「民國」。
    expect(產製('114年4月')).toMatch(/中華民國\s*\d+\s*年/);
  });
});
