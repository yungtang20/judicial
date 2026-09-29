/**
 * 法條與函釋的「相關性」判斷。
 *
 * 背景：系統過去只比對條號字串，導致純粹因為引用了「民法第184條」而被推薦的函釋，
 * 內容卻是「物之毀損修繕費折舊計算」，與性自主／家暴案件毫無關係卻出現在主要畫面。
 *
 * 本模組以「案件爭點關鍵詞」與「引用內容」的實質重疊作為相關性判準，
 * 條號相同只是必要條件，不是充分條件。
 */

/** 案件類型常見爭點關鍵詞。 */
const ALL_TOPICS: ReadonlyArray<readonly [RegExp, string]> = [
  [/性交|性行為|性關係|做愛/, '性交'],
  [/猥褻|性騷擾|性侵/, '猥褻'],
  [/趁.{0,4}睡|熟睡|昏睡|泥醉|酒醉|昏迷|不能抗拒|不知抗拒/, '不能抗拒'],
  [/威脅|恐嚇|脅迫|強迫|要脅/, '脅迫'],
  [/偷拍|竊錄|私密|裸照|性影像|散布|外流|下架/, '私密影像'],
  [/保護令|家暴|家庭暴力/, '保護令'],
  [/性自主/, '性自主'],
  [/侵權|損害賠償|精神慰撫/, '損害賠償'],
  [/車禍|交通事故|擦撞|撞擊/, '交通事故'],
  [/醫療費|醫藥費|營業損失|不能工作/, '損害額'],
  [/合約|契約|違約|解除/, '契約'],
  [/租金|押金|租屋|房東/, '租賃'],
  [/損害賠償|賠償|折舊|修繕|耐用年數|回復原狀/, '物之損害'],
  [/折舊|修繕|修復|耐用年數|回復原狀|物之/, '物之損害'],
];

/**
 * 同時命中「案件」與「引用內容」的爭點主題。
 * 條號相同只是必要條件；這裡要求的是實質主題重疊。
 */
function findSharedTopics(narrative: string, text: string): string[] {
  return ALL_TOPICS
    .filter(([pattern]) => pattern.test(narrative) && pattern.test(text))
    .map(([, topic]) => topic);
}

export interface InterpretationRelevanceInput {
  /** 函釋的標題與內容合併文字。 */
  text: string;
  /** 使用者案情。 */
  narrative: string;
}

export interface InterpretationRelevance {
  relevant: boolean;
  sharedTopics: string[];
}

/**
 * 判斷函釋與案情是否具備實質相關性。
 * 規則：函釋內容必須命中至少一個「案件也命中」的爭點關鍵詞才算相關；
 * 完全沒有交集者視為無關，不得出現在主要畫面。
 */
export function assessInterpretationRelevance(input: InterpretationRelevanceInput): InterpretationRelevance {
  const narrative = input.narrative || '';
  const text = input.text || '';
  if (!narrative.trim() || !text.trim()) return { relevant: false, sharedTopics: [] };
  const sharedTopics = findSharedTopics(narrative, text);
  return { relevant: sharedTopics.length > 0, sharedTopics };
}

/** 官方查核通過的法條狀態值。 */
const AUTHORITATIVE_STATUSES = ['VALID', 'VERIFIED', 'AUTHORITATIVE'];

/**
 * 條號正規化：官方證據使用純條號（如「刑法第315條之1」），
 * 引用清單則可能帶上罪名（如「刑法第315條之1（妨害秘密罪）」）
 * 或項次（如「民法第184條第1項前段」）。
 *
 * 不正規化會讓已查驗的條文被誤判為查無此筆並丟進「不可引用」區塊。
 * 實測缺陷：同一條法條在畫面上同時出現於主要清單與「不可引用」區塊，
 * 使用者看到「已由全國法規資料庫確認」與「不得用於書狀」兩種互斥指示：
   主要清單：民法第184條第1項前段（侵權損害賠償…）
   不可引用：民法第184條（侵權行為）
 原本只剝括號與空白，項次造成鍵不相等，去重失效。
 *
 * 條號層級是正確粒度：官方法規資料庫的即時查驗也是以條為單位
 * （verify(lawName, article)），不逐項查核。
 */
export function normalizeStatuteCitation(value: string): string {
  return value
    .replace(/[（(][^）)]*[）)]/g, '')
    // 項次與款次，含「前段／後段」
    .replace(/第[0-9０-９一二三四五六七八九十]+[項款](?:[前後]段)?/g, '')
    .replace(/[前後]段$/, '')
    .replace(/[\s　]/g, '');
}

/**
 * 判斷法條是否已完成官方即時查驗。
 * 純即時查詢下，未通過查驗的引用不得進入主要分析畫面，只能在獨立區塊標示為不可引用。
 */
export function isLiveVerified(officialStatuses: ReadonlyArray<{ citation: string; status: string }>, citation: string): boolean {
  const target = normalizeStatuteCitation(citation);
  const match = officialStatuses.find(item => normalizeStatuteCitation(item.citation) === target);
  if (!match) return false;
  return AUTHORITATIVE_STATUSES.includes(match.status);
}
