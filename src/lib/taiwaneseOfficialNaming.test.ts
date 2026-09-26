import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * 台灣法律文件必須使用正式幣名與市名。
 *
 * 實測：官方幣名是「新臺幣」、正式市名是「臺北市」，
 * 但 8 個產生實際法律文書的計算引擎（扶養費、裁判費、遺產分配、
 * 剩餘財產、資遣費、交通賠償）與統一入口的示範案例都寫成
 * 「新台幣」「台北市」。這些是使用者要簽名並提交法院的書狀。
 *
 * 注意：「台灣」是正確寫法，不得一併改成「臺灣」。
 */
const SRC = path.resolve(__dirname, '..');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

describe('台灣正式幣名與市名', () => {
  const files = collect(SRC).filter(f => !f.includes('.test.') && !f.includes('__tests__'));

  it('不得使用「新台幣」，應為「新臺幣」', () => {
    const offenders = files.filter(f => readFileSync(f, 'utf8').includes('新台幣'));
    expect(offenders.map(f => path.relative(SRC, f))).toEqual([]);
  });

  it('不得使用「台北市」，應為「臺北市」', () => {
    const offenders = files.filter(f => readFileSync(f, 'utf8').includes('台北市'));
    expect(offenders.map(f => path.relative(SRC, f))).toEqual([]);
  });

  it('國名仍以「台灣」書寫，修正不得擴及無關字詞', () => {
    // 「台灣」與「臺灣」在實務上並存，專案兩者皆見。
    // 這裡要防的是「把台一律改成臺」的過度修正，
    // 因此確認國名仍以「台灣」出現。
    const withTaiwan = files.filter(f => readFileSync(f, 'utf8').includes('台灣'));
    expect(withTaiwan.length).toBeGreaterThan(0);
  });
});
