import { inflateRawSync } from 'node:zlib';

/**
 * 官方法規即時索引（法務部全國法規資料庫）
 *
 * 為什麼不用本機靜態索引：
 * 法條會被修正，靜態索引一旦建立就會過期，而且它只收錄了極少數條文
 * （實測原本只涵蓋民法 3.3%、民訴法 1.2%），導致內容正確的書狀被誤擋。
 * 使用者明確指出這一點：與其維護一份可能引用到舊條文的索引，
 * 不如直接查官方來源。
 *
 * 資料來源：https://law.moj.gov.tw/api/ch/law/json
 * 該端點回傳 ZIP（內含 ChLaw.json），內容涵蓋全部 1,347 部法規、
 * 47,281 條條文，每筆帶 LawModifiedDate 與 LawEffectiveDate，
 * 檔案頂層的 UpdateDate 即官方更新日。
 *
 * 「這條是否存在」因此是官方資料可以確定回答的事實，不是猜測。
 * 這讓系統能真正區分兩種情形：
 * - 官方確認沒有這一條 → 引用是捏造的，必須擋下
 * - 官方確認有這一條   → 真實法條，應放行
 * 本機靜態索引無法做出這個區分，只能一律視為「未收錄」。
 *
 * 本模組**不自行決定擋或放行**，只回報存在性；
 * 擋或放行的判斷仍由 legalInputPrecheck 依治理規則決定。
 */

/** 官方資料無法回答時必須回報 UNKNOWN，不得猜測。 */
export type StatuteExistence = 'EXISTS' | 'ABSENT' | 'UNKNOWN';

export interface OfficialStatuteIndex {
  /** 官方資料的更新日，格式如 "2026/9/18 上午 12:00:00"。 */
  updateDate: string;
  lawCount: number;
  articleCount: number;
  /**
   * 查詢某法某條是否存在。
   * @param lawName 法名，如「民法」「民事訴訟法」
   * @param article 主條號
   * @param subArticle 條之 N（如「第1113條之10」的 10），無則省略
   */
  verify(lawName: string, article: number, subArticle?: number): StatuteExistence;
}

const FEED_URL = 'https://law.moj.gov.tw/api/ch/law/json';

/** 官方資料每 12 小時更新一次；本機索引超過此年齡就重新取得。 */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** 下載 6MB 壓縮檔需要較長逾時；逾時一律視為查不到（UNKNOWN），不得放行。 */
const FETCH_TIMEOUT_MS = 60_000;

interface LawEntry {
  /** 主條號集合，含條之 N 的母條。 */
  main: Set<number>;
  /** 含「條之N」的完整鍵，例如 "1113:10"。數量極少。 */
  sub: Set<string>;
}

/**
 * 正規化法名，讓「民法」與「中華民國民法」對應到同一筆。
 *
 * 官方 LawName 的前綴並不一致：民法是「民法」，刑法是「中華民國刑法」。
 * 不處理前綴會讓查詢結果隨法而異。
 */
function normalizeLawName(name: string): string {
  return name
    .replace(/^中華民國/, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 解析官方 ArticleNo，取得主條號與條之 N。
 *
 * 官方寫法是「第 1113-10 條」，引用寫法是「第1113條之10」——
 * 兩者格式不同但指同一條。若只取數字會得到 111310，
 * 那是完全不存在的條號，會讓真實法條被當成捏造。
 */
function parseOfficialArticleNo(raw: unknown): { main: number; sub?: number } | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/第\s*([0-9]+)\s*(?:-\s*([0-9]+)\s*)?條/);
  if (!m) return null;
  const main = Number(m[1]);
  if (!Number.isFinite(main)) return null;
  return m[2] ? { main, sub: Number(m[2]) } : { main };
}

/**
 * 從 ZIP 取出第一個成員的內容。
 *
 * 官方檔案是單成員 ZIP，因此不需要完整的 ZIP 庫：
 * 從檔尾的中央目錄找到第一筆，讀出壓縮方法與偏移，
 * 再用 node:zlib 的 inflateRaw 解壓 deflate 內容。
 * 為此新增一個相依套件不划算。
 */
export function extractFirstZipEntry(buf: Buffer): Buffer {
  // End of Central Directory：簽章 PK\x05\x06，由檔尾往前找。
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 65535; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP：找不到中央目錄');

  const entries = buf.readUInt16LE(eocd + 10);
  if (entries < 1) throw new Error('ZIP 內沒有成員');
  // 中央目錄第一筆的相對偏移
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cdOffset) !== 0x02014b50) {
    throw new Error('ZIP 中央目錄簽章不符');
  }

  const method = buf.readUInt16LE(cdOffset + 10);
  const compressedSize = buf.readUInt32LE(cdOffset + 20);
  const localOffset = buf.readUInt32LE(cdOffset + 42);
  if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error('ZIP 本機檔頭簽章不符');
  }

  // 本機檔頭的檔名與額外欄位長度不同，資料起點要跳過它們。
  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return Buffer.from(raw);
  if (method === 8) return inflateRawSync(raw);
  throw new Error('不支援的 ZIP 壓縮方法: ' + method);
}

/** 官方回應的 JSON 形狀（只取用得到的欄位）。 */
interface FeedShape {
  UpdateDate?: string;
  Laws?: Array<{
    LawName?: string;
    LawArticles?: Array<{ ArticleType?: string; ArticleNo?: unknown }>;
  }>;
}

/** 由官方資料建立緊湊索引。條文內容不保留——查證只需知道條號是否存在。 */
export function buildIndex(feed: FeedShape): OfficialStatuteIndex {
  const laws = new Map<string, LawEntry>();
  let articleCount = 0;

  for (const law of feed.Laws || []) {
    if (typeof law.LawName !== 'string') continue;
    // ArticleType 'A' 是條文；'C' 是編章標題，不是條號。
    const articles = (law.LawArticles || []).filter((a) => a.ArticleType === 'A');
    if (articles.length === 0) continue;

    const entry: LawEntry = { main: new Set<number>(), sub: new Set<string>() };
    for (const a of articles) {
      const parsed = parseOfficialArticleNo(a.ArticleNo);
      if (!parsed) continue;
      entry.main.add(parsed.main);
      if (parsed.sub !== undefined) entry.sub.add(`${parsed.main}:${parsed.sub}`);
    }
    if (entry.main.size === 0) continue;
    articleCount += entry.main.size;
    laws.set(normalizeLawName(law.LawName), entry);
  }

  return {
    updateDate: typeof feed.UpdateDate === 'string' ? feed.UpdateDate : '（官方未提供）',
    lawCount: laws.size,
    articleCount,
    verify(lawName: string, article: number, subArticle?: number): StatuteExistence {
      if (!Number.isFinite(article)) return 'UNKNOWN';
      const entry = laws.get(normalizeLawName(lawName));
      // 法名不在官方清單：可能是誤植、法名寫法不同或非現行法，
      // 不能據此斷定引用是捏造的。
      if (!entry) return 'UNKNOWN';
      if (subArticle !== undefined) {
        if (entry.sub.has(`${article}:${subArticle}`)) return 'EXISTS';
        // 沒有條之 N 時退回主條，避免把「第X條」誤判為不存在
        return entry.main.has(article) ? 'EXISTS' : 'ABSENT';
      }
      return entry.main.has(article) ? 'EXISTS' : 'ABSENT';
    },
  };
}

async function fetchIndex(): Promise<OfficialStatuteIndex> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: { accept: 'application/zip, application/json, */*' },
    });
    if (!res.ok) throw new Error('官方資料來源回應 ' + res.status);
    const zip = Buffer.from(await res.arrayBuffer());
    const json = extractFirstZipEntry(zip).toString('utf8');
    // 官方 JSON 帶 BOM，直接 JSON.parse 會失敗。
    const text = json.charCodeAt(0) === 0xfeff ? json.slice(1) : json;
    return buildIndex(JSON.parse(text) as FeedShape);
  } finally {
    clearTimeout(timer);
  }
}

let cached: { index: OfficialStatuteIndex; at: number } | null = null;
/** 併行請求共用同一次下載，避免同時打官方站。 */
let inflight: Promise<OfficialStatuteIndex> | null = null;

/**
 * 取得官方索引，結果在-process 內快取。
 *
 * 查不到時回傳 null（呼叫端據此維持原有的本機索引行為），
 * 絕不回傳一份猜測的結果。
 */
export async function loadOfficialStatuteIndex(): Promise<OfficialStatuteIndex | null> {
  const now = Date.now();
  if (cached && now - cached.at < MAX_AGE_MS) return cached.index;
  if (inflight) return inflight;

  inflight = fetchIndex()
    .then((index) => {
      cached = { index, at: Date.now() };
      return index;
    })
    .catch((err: unknown) => {
      // 官方來源不可用不是例外狀況，只是「此刻查不到」。
      // 記錄原因後回 null，讓呼叫端維持既有行為。
      console.warn('[officialStatuteIndex] 取得官方資料失敗，改用本機索引：', err instanceof Error ? err.message : err);
      return null;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** 僅供測試使用：清除模組內快取。 */
export function resetOfficialStatuteIndexCache(): void {
  cached = null;
}
