/**
 * 擷取使用者可見的中文常值。
 *
 * 抽出為共用模組，讓掃描防護與其測試使用**同一份實作**。
 *
 * 先前的測試在測試檔內重新實作了這段擷取邏輯，
 * 因此它驗證的是自己的副本而非防護的實際行為——
 * 把防護中的 JSX 掃描迴圈移除後，測試仍然全綠。
 * 這與「測試驗證自己」是同一類盲點。
 */

/** 移除區塊與行註解，避免把說明文字誤判為程式碼。 */
export function stripComments(source: string): string {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/**
 * 擷取字串常值與 JSX 元素文字。
 *
 * JSX 僅存在於 .tsx；.ts 中的 `>` 來自箭頭函式，
 * 對 .ts 套用 JSX 規則會把簡繁對照表誤判為使用者文案。
 */
export function extractUserFacingText(code: string, isTsx: boolean): string[] {
  const literals = [...code.matchAll(/[「"']([^"'「」\r\n]{3,})[」"']/g)].map(m => m[1]);
  if (isTsx) {
    for (const m of code.matchAll(/>([^<>{}]*[一-鿿][^<>{}]*)</g)) {
      literals.push(m[1]);
    }
  }
  return [...new Set(literals.map(v => v.trim()))].filter(Boolean);
}
