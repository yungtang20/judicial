import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadOfficialStatuteIndex, resetOfficialStatuteIndexCache } from '../../../server/services/officialStatuteIndex';
import * as ruleProfiles from './proceduralPleadingRuleProfiles';

/**
 * 條文快照必須與全國法規資料庫的現行條文一致，且雜湊必須如實。
 *
 * 兩個實測缺陷：
 *
 * 1. criminal_procedure_351.md 只凍結了第 1 段，卻標記
 *    verificationStatus: VERIFIED 並附 contentHash。產製路徑若依賴此快照，
 *    會把不完整的條文寫進法院書狀——而第 2 段正是「被告不能自作上訴書狀者，
 *    監所公務員應為之代作」，正是羈押被告上訴的核心規定。
 *
 * 2. 17 份快照宣告的 contentHash 與其條文內容不符，而所有檔案宣告的
 *    雜湊慣例完全相同。同一慣例下部分相符部分不符，代表那些值是錯的。
 *    雜湊是「這段文字經過查證」的憑證，值錯了憑證就失效——
 *    系統等於對未查證的綁定宣稱已查證。
 *
 * 官方來源是外部依賴，取不到時跳過需要官方資料的檢查，
 * 但本機一致性（雜湊符合、快照存在）仍照常驗證。
 */

interface 快照 {
  檔名: string;
  路徑: string;
  法名: string;
  條號: number;
  條之?: number;
  條文: string;
  雜湊: string | null;
}

function 解析快照(檔名: string, 內容: string): 快照 | null {
  const 法名 = 內容.match(/lawName:\s*(.+)/)?.[1]?.trim()?.replace(/^中華民國/, '');
  const 條號Raw = 內容.match(/article:\s*([0-9]+(?:-[0-9]+)?)/)?.[1];
  if (!法名 || !條號Raw) return null;
  const [主, 次] = 條號Raw.split('-');
  const 條文 = 內容.match(/## Exact Official Text\s*\n([\s\S]*)$/)?.[1]?.split(/\n## /)[0]?.trim();
  if (!條文) return null;
  return {
    檔名,
    路徑: `legal_references/${檔名}`,
    法名,
    條號: Number(主),
    條之: 次 ? Number(次) : undefined,
    條文,
    雜湊: 內容.match(/contentHash:\s*([0-9a-f]{64})/)?.[1] ?? null
  };
}

const 快照清單: 快照[] = readdirSync('legal_references')
  .filter(f => f.endsWith('.md'))
  .map(f => 解析快照(f, readFileSync(`legal_references/${f}`, 'utf8')))
  .filter((x): x is 快照 => x !== null);

/** 官方條文原文。官方索引刻意不保留全文以省記憶體，因此另行取用。 */
async function 載入官方條文(): Promise<((key: string) => string | null) | null> {
  resetOfficialStatuteIndexCache();
  const 索引 = await loadOfficialStatuteIndex();
  if (!索引) return null;

  // 官方資料約 6 MB，逾時必須自行設限。
  // 沒有逾時時，來源稍慢就會讓整個測試以 timeout 失敗——
  // 那是外部網路問題，卻被呈現成程式缺陷。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let 回應: Response;
  try {
    回應 = await fetch('https://law.moj.gov.tw/api/ch/law/json', {
      signal: controller.signal,
      headers: { accept: 'application/zip, */*' }
    });
  } catch {
    return null; // 來源無法取得時跳過比對
  } finally {
    clearTimeout(timer);
  }
  if (!回應.ok) return null;
  const { extractFirstZipEntry } = await import('../../../server/services/officialStatuteIndex');
  const zip = Buffer.from(await 回應.arrayBuffer());
  const json = extractFirstZipEntry(zip).toString('utf8');
  const feed = JSON.parse(json.charCodeAt(0) === 0xfeff ? json.slice(1) : json);
  const 快取 = new Map<string, string>();

  return (key: string) => {
    const m = key.match(/^(.+?)第(\d+)(?:之(\d+))?條$/);
    if (!m) return null;
    const [, 法名Raw, 主, 次] = m;
    const 鍵 = `${法名Raw}/${主}/${次 ?? ''}`;
    if (快取.has(鍵)) return 快取.get(鍵) ?? null;
    const 法 = feed.Laws.find((x: any) => String(x.LawName).replace(/^中華民國/, '') === 法名Raw);
    if (!法) return null;
    const 條 = (法.LawArticles || []).find((x: any) => {
      if (x.ArticleType !== 'A') return false;
      const a = String(x.ArticleNo).match(/第\s*([0-9]+)(?:-\s*([0-9]+))?/);
      if (!a) return false;
      return Number(a[1]) === Number(主) && (a[2] ? Number(a[2]) : undefined) === (次 ? Number(次) : undefined);
    });
    const 值 = 條 ? String(條.ArticleContent).replace(/<[^>]+>/g, '').trim() : null;
    快取.set(鍵, 值);
    return 值;
  };
}

describe('條文快照完整性', () => {
  it('快照目錄中確實有可稽核的條文檔（防空轉）', () => {
    expect(快照清單.length).toBeGreaterThan(20);
  });

  it('每份快照宣告的 contentHash 與其條文內容相符', () => {
    // 宣告 VERIFIED 卻附上不符的雜湊，等於對快照完整性做出不實陳述。
    const 不符 = 快照清單.filter(s => {
      if (!s.雜湊) return false;
      return createHash('sha256').update(s.條文, 'utf8').digest('hex') !== s.雜湊;
    });
    expect(不符.map(s => s.檔名), '以下快照的 contentHash 與條文內容不符：').toEqual([]);
  });

  it('條文不是空值', () => {
    const 空 = 快照清單.filter(s => s.條文.length === 0);
    expect(空.map(s => s.檔名), '以下快照沒有條文內容：').toEqual([]);
  });

  // 下載官方資料約 6 MB，vitest 預設 5 秒逾時不足（實測曾因此間歇性失敗）。
  // 這是網路速度問題，不是條文內容不符——兩者的失敗訊息完全不同。
  it('條文內容與全國法規資料庫一致，涵蓋所有段落', { timeout: 60_000 }, async () => {
    // 直接對應實測缺陷：刑訴法第351條官方有 4 段，舊快照只凍結第 1 段。
    // 不使用「長度」或「段落數」等啟發式規則——民訴法第117條、
    // 刑訴法第352條、家事事件法第51條本來就是短條文，會被誤判。
    // 唯一可靠的判準是與官方原文逐字比對。
    const 官方 = await 載入官方條文();
    if (!官方) return; // 外部依賴不可用時跳過

    const 不符 = 快照清單.filter(s => {
      const 官文 = 官方(`${s.法名}第${s.條號}${s.條之 ? '之' + s.條之 : ''}條`);
      if (!官文) return false; // 條號不存在由下一項檢查負責
      return 官文.replace(/[\s　]/g, '') !== s.條文.replace(/[\s　]/g, '');
    });
    expect(
      不符.map(s => s.檔名),
      '以下快照與官方現行條文不符（可能過期或只凍結了部分段落）：'
    ).toEqual([]);
  });

  // 同上：下載官方資料需要時間，不能用 vitest 預設的 5 秒逾時。
  it('快照所載條號在官方資料中存在', { timeout: 60_000 }, async () => {
    const 索引 = (await (async () => {
      resetOfficialStatuteIndexCache();
      return loadOfficialStatuteIndex();
    })());
    if (!索引) return;

    const 不存在 = 快照清單.filter(s => 索引.verify(s.法名, s.條號, s.條之) === 'ABSENT');
    expect(
      不存在.map(s => `${s.檔名}：${s.法名}第${s.條號}${s.條之 ? '之' + s.條之 : ''}條`),
      '以下快照所載條號在全國法規資料庫中不存在：'
    ).toEqual([]);
  });

  it('被規則檔引用的快照都存在於條文目錄', () => {
    // 規則檔以字串指定快照路徑，檔案若被刪或改名，引用會在產製時才爆。
    const 缺檔: string[] = [];
    for (const [名稱, profile] of Object.entries(ruleProfiles)) {
      if (!profile || typeof profile !== 'object') continue;
      const id = (profile as { id?: string }).id || 名稱;
      const 引用 = JSON.stringify(profile).match(/legal_references\/[a-z0-9_]+\.md/g) || [];
      for (const 路徑 of new Set(引用)) {
        try {
          readFileSync(路徑, 'utf8');
        } catch {
          缺檔.push(`${路徑}（引用於 ${id}）`);
        }
      }
    }
    expect(缺檔, '規則檔引用了不存在的條文快照：').toEqual([]);
  });
});
