/**
 * 裁判字號的正規化與比對。
 *
 * 背景：使用者輸入「最高法院98年度台上字第1045號」這類**特定字號**時，
 * 司法院關鍵字檢索會降級成「98 台上 1045」並回傳完全不相關的近期裁判
 * （實測回傳台南地院 115 年度的清償借款案件）。
 * 對律師而言這等於給了一個假答案，因此必須明確標示是否精確命中。
 */

/** 去掉法院名稱、空白與所有標點，只保留可比較的核心。 */
export function normalizeCaseNumber(value: string): string {
  return (value || '')
    .replace(/[\s　]/g, '')
    .replace(/[（）()【】\[\]，,。.、；;：:「」『』'"]/g, '')
    .replace(/臺/g, '台');
}

/** 判斷字串是否看起來是一個裁判字號（含年度、字別與號次）。 */
export function looksLikeCaseNumber(value: string): boolean {
  const normalized = normalizeCaseNumber(value);
  return /法院?[\d０-９]{2,4}年度?[^號\d]{0,6}[字第][\d０-９]+號?/.test(normalized)
    || /[\d０-９]{2,4}年度?[^號\d]{0,6}[字第][\d０-９]+號/.test(normalized);
}

/** 年度、字別、號次三段皆相同才算同一個裁判（法院名稱不列入比對）。 */
export function isSameCaseNumber(left: string, right: string): boolean {
  const core = (value: string) => {
    const normalized = normalizeCaseNumber(value);
    const year = normalized.match(/([\d０-９]{2,4})年度?/);
    const type = normalized.match(/年度?[^字第]{0,4}([^\d０-９字第]{1,4})字?第/);
    const number = normalized.match(/第([\d０-９]+)號/);
    if (!year || !number) return '';
    return `${toHalfWidth(year[1])}|${type ? type[1] : ''}|${toHalfWidth(number[1])}`;
  };
  const a = core(left);
  const b = core(right);
  return Boolean(a) && a === b;
}

function toHalfWidth(value: string): string {
  return value.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}
