import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 防止「伺服端強制要求、但介面沒有提供控制項」的功能再次發生。
 *
 * 背景：/api/external-citations/verify 強制要求使用者明確同意才會把裁判字號
 * 送出至第三方，但 LegalDocAiChecker 的 setExternalConsent 從未被任何控制項呼叫，
 * 導致整個外部覆核功能永久不可達——畫面上按下去只會得到
 * 「unknown：外部查詢需要使用者明確同意」。
 */
describe('外部查詢的同意控制項必須存在於介面', () => {
  const source = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'LegalDocAiChecker.tsx'),
    'utf-8'
  );

  it('必須渲染可勾選的同意控制項並綁定 setExternalConsent', () => {
    expect(source).toMatch(/type="checkbox"/);
    expect(source).toMatch(/checked=\{externalConsent\}/);
    expect(source).toMatch(/setExternalConsent\(event\.target\.checked\)|setExternalConsent\(/);
  });

  it('未勾選同意前不得啟用外部查詢按鈕', () => {
    expect(source).toMatch(/disabled=\{[^}]*!externalConsent/);
  });

  it('同意文字必須說明送往哪個第三方', () => {
    expect(source).toMatch(/dr-lawbot\.com/);
  });
});
