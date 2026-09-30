/**
 * 法律案件分流、動態追問與三段論涵攝引擎提示詞 (3-Node Legal Process Prompts)
 */

import { TRADITIONAL_CHINESE_REQUIREMENT } from './languageRequirements';

export interface RouterEvaluationResult {
  domain: '刑事' | '民事' | '家事' | '行政' | string;
  chapter: string;
  cause: string;
  is_sensitive: boolean;
  is_complete: boolean;
  missing_elements: string[];
  has_judgment?: boolean;
  is_new_case?: boolean;
}

/**
 * 節點 1：智能路由與完整度檢查 (Router Prompt)
 * 用途：統一入口的第一道閘門，強制 AI 輸出不帶任何廢話的純 JSON，供後端程式碼判斷。
 */
export function buildRouterPrompt(userInput: string): string {
  return `你是一位法律案件分流與事實評估專家。請分析使用者的案情描述，並嚴格輸出純 JSON 格式（禁止包含任何 Markdown 標記或解釋文字）：

{
  "domain": "刑事/民事/家事/行政",
  "chapter": "刑法罪章或法律領域（如：妨害性自主罪章、租賃糾紛）",
  "cause": "具體案由或罪名（如：強制性交、返還押金）",
  "is_sensitive": true/false,
  "is_complete": true/false,
  "missing_elements": ["缺少的關鍵事實1", "缺少的關鍵事實2"],
  "has_judgment": true/false,
  "is_new_case": true/false
}

判斷標準：
- ${TRADITIONAL_CHINESE_REQUIREMENT}

domain（依下列順序判斷，命中即停止，務必自上而下優先）：
1. 涉及家庭暴力、性侵害、強制性交、猥褻、兒童少年保護、監護權、離婚、未成年子女親權 → 家事
2. 有人受傷、被毆打、被恐嚇、被威脅、被偷、被騙、被搶奪，且可能構成犯罪行為 → 刑事
3. 遭行政機關做成處分、收到罰單、稅單已被查報、與公務員或機關發生爭執 → 行政
4. 其餘金錢給付、債務不還、買賣、租賃、物品毀損、車禍、勞資、婚姻財產 → 民事
（同一案情同時涉及數個領域時，以人身安全與刑事風險最優先。）

chapter（必須自對應清單中擇一最貼近者，不得自創）：
- 刑事：妨害性自主罪章／傷害罪章／恐嚇危害安全罪章／竊盜侵占罪章／詐欺背信罪章／毀損罪章／交通犯罪
- 民事：民法債權契約（借貸、買賣、服務契約）／民法債權租賃專節／民法物權／侵權行為損害賠償／家事事件法相關
- 家事：家庭暴力防治法與保護令／離婚與夫妻財產／子女親權與監護／遺產繼承
- 行政：行政程序（訴願、訴訟）／行政處分異議／稅捐爭議／公務人員保障

cause（寫出最具體的案由或罪名，須與 chapter 相符；例如：強制性交、普通傷害、清償借款、返還押金、返還借款本息、核准保護令）

禁止事項：
- 案情描述並非空白時，domain／chapter／cause 一律不得填「未知」「未提供」「無法判斷」等佔位用字。
- 不得因為難以歸類就填入與案情無關的領域；確實判斷不出時，請填最接近的領域並在 missing_elements 說明尚缺什麼。

其他欄位：
- is_sensitive：若案情涉及性侵害、家庭暴力、跟蹤騷擾，必須為 true。
- is_complete：若缺少「人、事、時、地、證據」中的關鍵要素，導致無法判斷是否成罪或侵權，必須為 false。
- has_judgment：若使用者提到「收到判決」「法官判了」「已經宣判」等字眼，代表已經有第一審判決，必須為 true。
- is_new_case：若使用者尚未報案、尚未起訴、尚未進入任何司法程序，必須為 true。

使用者案情描述（三引號內為原文，務必依據實際內容判斷）：
"""
${userInput}
"""`;
}

/**
 * 節點 2：動態追問 (Questioning Prompt)
 * 用途：當節點 1 判定 is_complete == false 時，觸發此提示詞生成引導話術。
 */
export function buildQuestioningPrompt(
  missingElements: string[],
  userInput: string,
  /** 呼叫端如何承接選項。兩種模式的輸出要求不同，混淆會讓標記外洩到畫面上。 */
  mode: 'plain_text' | 'json' = 'plain_text'
): string {
  const 選項要求 = mode === 'json'
    ? '4. 提出封閉式問題，並在 suggestedOptions 陣列中提供 2~3 個簡短選項。' +
      'rawMessage 只放給使用者看的追問文字，絕對不要把選項或「【選項：…】」之類的標記寫進 rawMessage。'
    : '4. 提出封閉式問題，並在句末另起一行，以「【選項：甲】【選項：乙】【選項：丙】」的格式附上 2~3 個供使用者點選的選項。選項文字直接寫在書名號內，請勿輸出「選項按鈕」之類的佔位詞。';

  const 範例 = mode === 'json'
    ? ''
    : `

輸出範例（請比照此結構）：
我已理解您的現況。為了確認適用法規，需要知道事發當下您是否在場。
【選項：我在現場並全程參與對話】【選項：我不在場，事後才得知】【選項：僅部分時間在場】`;

  return `你是一位富有同理心的法律諮詢助手。根據以下缺失的關鍵事實，向使用者提出 1~2 個簡短、具體的追問，並提供快捷選項。

缺失事實：${JSON.stringify(missingElements, null, 2)}
原始案情：${userInput}
要求：
1. ${TRADITIONAL_CHINESE_REQUIREMENT}
2. 先簡短確認目前理解的現狀（一句話即可）。
3. 說明為什麼需要補充這些資訊（例如：這決定了是否適用家暴法或影響罪名判定）。
${選項要求}${範例}`;
}

/**
 * 節點 3：三段論涵攝引擎 (Syllogism Engine Prompt)
 * 用途：當資訊完整時，結合 tw-legal-rag 抓取的構成要件，執行穩定的法律分析。
 */
export function buildSyllogismEnginePrompt(legalElements: string, userFacts: string, missingElements?: string[]): string {
  const missingWarning = missingElements && missingElements.length > 0
    ? `\n\n【注意：這是一份初步評估草稿】\n由於用戶提供的資訊中仍缺乏以下關鍵要素：${missingElements.join('、')}。\n請在結論或涵攝中明確標註這是一份「初步草稿」，並具體說明缺失這些資訊將如何影響法律判斷，引導使用者後續補充。`
    : '';
  return `你是一位資深法律分析專家。請根據以下「大前提（構成要件）」與「小前提（案件事實）」，嚴格執行三段論法涵攝分析。${missingWarning}

【大前提（構成要件）】：${legalElements} (由 RAG 動態抓取注入)

【小前提（案件事實）】：${userFacts}

輸出格式：
1. 大前提：簡述適用法條與構成要件。
2. 小前提：簡述用戶輸入的相關事實與證據。
3. 涵攝：逐一比對事實與要件（明確指出符合、不符合或事實仍不足）。
4. 結論：給出初步法律評估與下一步行動建議。

約束：
絕對禁止編造用戶未提供的事實。若事實與要件有落差，必須在涵攝中明確指出。

${TRADITIONAL_CHINESE_REQUIREMENT}
`;
}
