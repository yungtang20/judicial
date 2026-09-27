import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { DEFAULT_FORM_INPUTS } from './toolFormDefaults';

/**
 * 表單與提示詞不得預填或代入虛構的個人資料。
 *
 * 實測：身分證 A123456789、案號 113年度訴字第1234號 被當成預設值寫進表單，
 * 甚至被代入 AI 提示詞（【案號案由】：${caseInfo.caseNo || '113年度訴字第1234號'}），
 * 使生成的書狀引用一個不存在的案號。
 *
 * 這與先前修正的「書狀模板捏造案件事實」是同一類問題，
 * 但位置在表單預設值與提示詞，而非模板。
 */
const SRC = path.resolve(__dirname, '..');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

describe('不得預填虛構的個人資料', () => {
  it('身分證字號不得作為預設值', () => {
    const defaults = DEFAULT_FORM_INPUTS as Record<string, unknown>;
    const idKeys = /(^|[a-z])(Id|IdNo)$/;
    const offenders = Object.entries(defaults)
      .filter(([key, value]) => idKeys.test(key) && typeof value === 'string' && /^[A-Z]\d{9}$/.test(value))
      .map(([key, value]) => `${key}=${value}`);
    expect(offenders, `以下欄位預填了虛構身分證：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('案號不得作為預設值', () => {
    const defaults = DEFAULT_FORM_INPUTS as Record<string, unknown>;
    const offenders = Object.entries(defaults)
      .filter(([key, value]) => /caseNo|tableNo/.test(key) && typeof value === 'string' && /\d+年度.*字第.*號/.test(value))
      .map(([key, value]) => `${key}=${value}`);
    expect(offenders, `以下欄位預填了虛構案號：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('提示詞不得以虛構案號替代未提供的值', () => {
    const offenders: string[] = [];
    for (const file of collect(SRC)) {
      const src = readFileSync(file, 'utf8');
      // 找出「|| '...年度...字第...號...'」這類替代值
      for (const m of src.matchAll(/\|\|\s*['"][^'"]*\d+年度[^'"]*字第[^'"]*號[^'"]*['"]/g)) {
        const before = src.slice(Math.max(0, m.index - 200), m.index);
        // placeholder 是安全的（只提示格式），提示詞與值賦assign 不是
        if (/placeholder\s*=\s*$/.test(before) || /placeholder=/.test(before)) continue;
        offenders.push(`${path.relative(SRC, file)}: ${m[0].slice(0, 60)}`);
      }
    }
    expect(offenders, `以下位置以虛構案號替代未提供的值：\n${offenders.join('\n')}`).toEqual([]);
  });
});

/**
 * 案件專屬的預設值一律不得預填。
 *
 * 實測：自書遺囑、拋棄遺產權、離婚協議書、借據都是具法律效力的文件，
 * 使用者未逐項修改就產製，等於把捏造的姓名、電話、地址、不動產與金額
 * 送到法院或對造本人。
 *
 * 保留的只有結構性與中性預設（每期五日、年息六、關係人稱謂），
 * 這類不涉及特定案件事實。
 */
const STRUCTURAL_DEFAULTS = new Set([
  'payDay', 'interestRate', 'days', 'relationship', 'custodyParent',
  'defaultMonths', 'violationPeriod', 'startDefaultMonth', 'recipientRole'
]);

const CASE_SPECIFIC_KEY = [
  /Name$/, /Phone$/, /Address$/, /^id/i, /IdNo$/, /Id$/,
  /Birth/, /Date$/, /Amount/, /Salary/, /Rent/, /Support$/, /Score$/,
  /bankName/, /Bank$/, /Place$/, /estate/i, /realEstate/i, /Beneficiary/,
  /subject/i, /remedy/i, /evidenceList/, /claim/i
];

describe('表單不得預填案件專屬資料', () => {
  it('姓名、電話、地址、日期、金額、身分證等欄位必須留空', () => {
    const offenders = Object.entries(DEFAULT_FORM_INPUTS as Record<string, unknown>)
      .filter(([key, value]) =>
        !STRUCTURAL_DEFAULTS.has(key) &&
        CASE_SPECIFIC_KEY.some(re => re.test(key)) &&
        String(value).trim() !== ''
      )
      .map(([key, value]) => `${key}="${String(value).slice(0, 24)}"`);
    expect(
      offenders,
      `以下欄位預填了案件專屬資料，使用者容易沿用並提交到法院或對造：\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
