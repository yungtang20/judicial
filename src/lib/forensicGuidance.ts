/**
 * 條件式採證指引與事發日期抽取。
 *
 * 背景：系統過去對所有性自主案件一律輸出「黃金72小時內請立即驗傷採證、切勿沐浴更衣」。
 * 對於事發已逾數月甚至數年的舊案，該指示在物理上無法執行且對當事人具誤導性。
 * 本模組把採證指引改為條件式：先從案情抽取事發日期，與系統當下時間比對後
 * 才決定要輸出「緊急採證」或「採證窗口已過」兩種語句。
 *
 * 設計原則（fail-closed）：
 * 1. 抽取不到日期時一律視為「窗口已過」，寧可少說也不對時效不明的案件喊「立即」。
 * 2. 算出負的時間差（事發日期在未來）同樣視為「窗口已過」。
 * 3. `now` 一律可注入，測試不得依賴真實時鐘。
 */

/** 急診一站式性侵害採證的保存時效（hours）。 */
export const FORENSIC_WINDOW_HOURS = 72;

const ROC_AD_OFFSET = 1911;
const MIN_ROC_YEAR = 50;
const MAX_ROC_YEAR = 199;

const HOURS_PER_MS = 3_600_000;


/**
 * 將日期格式化為 yyyy-mm-dd。
 * **不可**使用 `toISOString().slice(0, 10)`：該方法會轉成 UTC，
 * 在 UTC+8 的情況下，本地 2023-11-15 零點會被算成 2023-11-14，
 * 導致事發日整整差一天（實測在台灣時區重現）。
 */
export function toCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export type IncidentDateSource = 'ROC' | 'AD' | null;

export interface IncidentDateExtraction {
  /** 抽取到的日期；無法取得或日期不合法時為 null。 */
  date: Date | null;
  /** 案情中命中的原始字串，供 UI 回顯讓使用者確認。 */
  raw: string | null;
  source: IncidentDateSource;
}

export interface ForensicGuidance {
  /** 是否落在採證保存時效內。 */
  withinWindow: boolean;
  /** 採證保存時效的說明文字，僅供除錯與 UI 顯示。 */
  windowLabel: string;
  evidenceChecklist: string[];
  preservationTips: string[];
  immediateSteps: string[];
  /** 附加在時效敘述後半的採證提醒。 */
  timeLimitSuffix: string;
}

function buildDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // 拒絕 2 月 30 日這類會被 Date 自動進位的日期
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/**
 * 從口語案情中抽取事發日期。
 *
 * 支援兩種寫法：
 * - 民國寫法：`民國112年11月15日`、`112年11月15日`
 * - 西元寫法：`2023年11月15日`
 *
 * 抽取順序為西元優先，避免把 `2023年` 誤判成民國 2023 年。
 */
export function extractIncidentDate(narrative: string): IncidentDateExtraction {
  const text = (narrative || '').replace(/\s+/g, '');

  const adMatch = text.match(/(19\d{2}|20\d{2})年(\d{1,2})月(\d{1,2})日/);
  if (adMatch) {
    const date = buildDate(Number(adMatch[1]), Number(adMatch[2]), Number(adMatch[3]));
    if (date) return { date, raw: adMatch[0], source: 'AD' };
  }

  const rocMatch = text.match(/(?:民國)?(\d{2,3})年(\d{1,2})月(\d{1,2})日/);
  if (rocMatch) {
    const rocYear = Number(rocMatch[1]);
    if (rocYear >= MIN_ROC_YEAR && rocYear <= MAX_ROC_YEAR) {
      const date = buildDate(rocYear + ROC_AD_OFFSET, Number(rocMatch[2]), Number(rocMatch[3]));
      if (date) return { date, raw: rocMatch[0], source: 'ROC' };
    }
  }

  return { date: null, raw: null, source: null };
}

/**
 * 判斷事發時刻是否落在採證保存時效內。
 * 抽取不到日期、時差為負（日期在未來）一律回 false。
 */
export function isWithinForensicWindow(
  incident: Date | null,
  now: Date = new Date(),
  windowHours: number = FORENSIC_WINDOW_HOURS
): boolean {
  if (!incident || !now) return false;
  const elapsedHours = (now.getTime() - incident.getTime()) / HOURS_PER_MS;
  return elapsedHours >= 0 && elapsedHours <= windowHours;
}

/**
 * 依採證時效產出條件式指引文案。
 * 兩種分支都必須保留證據保全與醫療需求，差別只在於是否使用急迫語氣。
 */
export function buildForensicGuidance(withinWindow: boolean): ForensicGuidance {
  if (withinWindow) {
    return {
      withinWindow,
      windowLabel: '採證保存時效內（事發後 72 小時內）',
      evidenceChecklist: [
        '醫院甲種診斷證明書與性侵害驗傷採證包（黃金72小時內）',
        '案發當日所穿著之衣物（以紙袋密封保存，切勿清洗）',
        '雙方通訊軟體對話紀錄截圖（尤其是事後對方道歉、提及案發經過之對話）',
        '現場照片、錄影監視器或出入刷卡門禁紀錄'
      ],
      preservationTips: [
        '【生物檢體保全】：性自主案件切勿沐浴更衣，請立即將案發衣物以乾淨紙袋保全存證。',
        '【醫療驗傷】：黃金72小時內請至醫院急診驗傷，請醫師開立驗傷診斷書並保存生物檢體。',
        '【數位事證】：保留所有 LINE、通話錄音、監視器畫面及事發現場截圖，切勿刪除對話紀錄。'
      ],
      immediateSteps: [
        '撥打 113 保護專線或 110 報案',
        '至醫療院所開立驗傷診斷證明書並採證',
        '向轄區分局報案製作筆錄並聲請保護令'
      ],
      timeLimitSuffix: '；黃金72小時內請至急診驗傷採證。'
    };
  }

  return {
    withinWindow,
    windowLabel: '採證保存時效可能已過，請以數位事證與證人陳述為主軸',
    evidenceChecklist: [
      '公私立醫院診斷證明書或就診紀錄（縱使無採證包，仍可證明就醫與身心理狀態）',
      '雙方通訊軟體對話紀錄截圖與通聯紀錄（尤其是事後對方提及案發經過或施壓之內容）',
      '知情人（家人、朋友、同住者）的陳述與聯絡方式，必要時請其協助出具書面說明',
      '被偷拍或被威脅使用的影片、語音訊息原始檔案與檔案中繼資料（MetaData）'
    ],
    preservationTips: [
      '【生物檢體說明】：採證保存時效可能已過，生物檢體取得困難；請仍以保存衣物與相關物品為宜，避免清洗或丟棄。',
      '【醫療驗傷說明】：請至醫療院所就醫並開立診斷證明書，作為心理創傷與就醫事實的佐證。',
      '【數位事證】：完整備份所有通訊紀錄、錄音、影片與對方施壓的訊息，保留原始檔與時間戳記，切勿刪除。'
    ],
    immediateSteps: [
      '撥打 113 保護專線諮詢，或依案情嚴重度撥打 110 報案',
      '至醫療院所就醫並取得診斷證明書',
      '向轄區分局報案製作筆錄並聲請保護令',
      '將被威脅散布的內容截圖存證，向相關平臺提出下架與移除申請'
    ],
    timeLimitSuffix: '；採證保存時效可能已過，請改以數位事證、通訊紀錄與證人陳述為主軸。'
  };
}
