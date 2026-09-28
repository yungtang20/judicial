import { describe, expect, it } from 'vitest';
import { scrubPersonalInfo } from './deidentifier';

/**
 * 去識別化不得改變法律文字的意義。
 *
 * 實測正式站的律師助理回覆：
 *   「主張侵權行為之原告（請求權人）」→「主張侵權◯◯◯原告（請求權人）」
 *   「原告王○○訴請被告張○○給付。」→「原告王○○◯◯◯被告張○○給付。」
 *
 * 遮蔽「訴請」「行為之」這類法律用語，會讓讀者以為原文如此，
 * 在法律文件上是實質的內容失真。
 */
describe('去識別化不得誤傷法律用語', () => {
  it('稱謂前的法律用語必須保留', () => {
    const 原文 = '原告王○○訴請被告張○○給付。';
    expect(scrubPersonalInfo(原文)).toBe(原文);
  });

  it('「行為之原告」不得被挖掉', () => {
    const 原文 = '主張侵權行為之原告（請求權人）應負舉證責任。';
    expect(scrubPersonalInfo(原文)).toBe(原文);
  });

  it.each([
    '共同被告提出答辯。',
    '原告之訴請應為駁回。',
    '代表原告起訴。',
    '被上訴人為上訴人。',
    '公訴人對被告提起公訴。',
  ])('%s 不得被改寫', 原文 => {
    expect(scrubPersonalInfo(原文)).toBe(原文);
  });
  it('稱謂之前的姓名仍必須遮蔽', () => {
    const 遮蔽 = scrubPersonalInfo('張大明先生表示願意和解。');
    expect(遮蔽).not.toContain('張大明');
    expect(遮蔽).toContain('先生');
  });

  it('稱謂之後的姓名不在遮蔽範圍（已知限制）', () => {
    // 中文法律文件最常見的寫法是「被告張大明」，但把稱謂後的
    // 2~3 個字一律視為姓名會誤傷「被告提出答辯」「被上訴人為上訴人」
    // 這類法律句法。為避免毀損法律文字，不加入該規則。
    // 這是取捨：寧可少遮蔽，不可改變法律文字的意義。
    // 個資保護在正式流程中另有把關（送出前須人工複核、審計紀錄留存）。
    expect(scrubPersonalInfo('被告張大明表示願意和解。')).toContain('被告');
  });

  it('稱謂前無稱謂時不動', () => {
    const 原文 = '本案爭點在於契約是否成立。';
    expect(scrubPersonalInfo(原文)).toBe(原文);
  });

  it('身分證與手機號碼仍必須遮蔽', () => {
    expect(scrubPersonalInfo('被告張大明身分證字號A123456789。')).not.toContain('A123456789');
    expect(scrubPersonalInfo('聯絡電話0912345678。')).not.toContain('0912345678');
  });

  it('地址仍必須遮蔽', () => {
    const 遮蔽 = scrubPersonalInfo('被告住臺北市中正區忠孝東路100號。');
    expect(遮蔽).toContain('***');
  });
});
