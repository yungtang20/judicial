import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractFirstZipEntry } from '../../server/services/officialStatuteIndex';

/**
 * 上訴期限工具的條號引用必須與全國法規資料庫一致。
 *
 * 實測缺陷：裁定抗告 10 日引用「民事訴訟法第 486 條」，
 * 但第 486 條是抗告的一般規定（由誰裁定），不含期間。
 * 真正的十日抗告期間在第 487 條：
 *   「提起抗告，應於裁定送達後十日之不變期間內為之。」
 *
 * 引用錯誤對使用者有實害——律師依此引用條文，會援引到不相關的條文。
 *
 * 這裡把工具中出現的「法名 + 條號」全部抽出，
 * 逐一向官方資料查證：該條是否真的規定期限。
 */
const 工具原始碼 = readFileSync(
  resolve(process.cwd(), 'src/components/AppealDeadlineTool.tsx'),
  'utf8'
);
const 官方快取 = resolve(process.cwd(), 'tmp/law.json');

/** 擷取工具中所有「X訴法第 N 條」形式的引用。 */
function 擷取引用(原始碼: string): Array<{ 法名: string; 條號: string; 位置: number }> {
  const 結果: Array<{ 法名: string; 條號: string; 位置: number }> = [];
  const re = /(民事訴訟法|刑事訴訟法|行政訴訟法)第\s*(\d+)\s*條/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(原始碼)) !== null) {
    結果.push({ 法名: m[1], 條號: m[2], 位置: m.index });
  }
  return 結果;
}

function 官方條文(feed: any, 法名: string, 條號: string): string | null {
  const L = feed.Laws.find((l: any) => String(l.LawName).replace(/^中華民國/, '') === 法名);
  const a = (L?.LawArticles || []).find((x: any) =>
    String(x.ArticleNo).match(new RegExp(`^第\\s*${條號}\\s*條`))
  );
  return a ? String(a.ArticleContent).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ') : null;
}

const 有官方資料 = (() => {
  try {
    return require('node:fs').existsSync(官方快取);
  } catch {
    return false;
  }
})();

describe('上訴期限的條號引用', () => {
  it('工具中確實有條號引用可供稽核', () => {
    const 引用 = 擷取引用(工具原始碼);
    expect(引用.length, '未擷取到任何條號引用').toBeGreaterThan(5);
  });

  it('抗告十日必須引用第 487 條，不得用第 486 條', () => {
    // 第 486 條是抗告的一般規定，不含期間。
    expect(工具原始碼).not.toMatch(/民事訴訟法第\s*486\s*條/);
    expect(工具原始碼).toMatch(/民事訴訟法第\s*487\s*條/);
  });

  // 官方資料是 6 MB 的外部下載，不應成為測試套件的必要條件。
  const 有資料 = 有官方資料 ? it : it.skip;

  有資料('每個被引用的條號都必須真的規定期限', async () => {
    const json = extractFirstZipEntry(readFileSync(官方快費())).toString('utf8');
    const feed = JSON.parse(json.charCodeAt(0) === 0xfeff ? json.slice(1) : json);
    // 兩種不含期間但引用正確的情況：
    // 481 準用條：本身規定「前章規定於第三審準用」，與被準用的條文並列引用是正確用法。
    // 420 以下：再審專章自第 420 條起，「以下」是章節引用的合法簡寫。
    // 兩者都已逐條比對全國法規資料庫確認。
    const 非期間條文 = new Set(['481', '420']);
    const 問題 = 擷取引用(工具原始碼)
      .filter(r => !非期間條文.has(r.條號))
      .map(r => ({ r, 條文: 官方條文(feed, r.法名, r.條號) }))
      .filter(x => !x.條文 || !/(日|期間內|不變期間)/.test(x.條文));
    expect(
      問題.map(x => `${x.r.法名}第${x.r.條號}條（${(x.條文 || '官方無此條').slice(0, 40)}）`),
      '以下引用沒有規定期限，應更正為真正規定該期間的條文'
    ).toEqual([]);
  });
});

function 官方快費(): string {
  return 官方快取;
}
