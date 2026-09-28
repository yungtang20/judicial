/**
 * 從 AI 回應中擷取 JSON。
 *
 * 即使提示詞要求「僅輸出 JSON」，模型仍可能加上說明文字、
 * markdown 程式碼區塊或前後問候。直接對整段回應做 JSON.parse
 * 會失敗，於是呼叫端靜默退回規則備援——使用者等了近 30 秒
 * 拿到一份外觀正常、實則沒有 AI 參與的結果。
 *
 * 實測：defense-triage 在只做「去 markdown 後整段 JSON.parse」時，
 * 3 次正式站呼叫有 2 次降級；同一模型的 agent-chat 卻正常，
 * 因為它不依賴 JSON 解析。
 */

/** 字串常值內的跳脫字元，掃描時不得當成結束引號。 */
function isEscaped(text: string, index: number): boolean {
  let 前置反斜線 = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) 前置反斜線++;
  return 前置反斜線 % 2 === 1;
}

/**
 * 找出所有「配對完整」的 JSON 物件或陣列片段。
 *
 * 不能用 /\{[\s\S]*\}/：那是貪婪比對，遇到說明文字裡的
 * 單層大括號（例如「因為{條件}不成立，結論：{...}」）會把兩段併在一起，
 * 解析必然失敗。必須依括號深度與字串常值逐字掃描。
 */
function findBalancedSegments(text: string): string[] {
  const 片段: string[] = [];
  for (let 起始 = 0; 起始 < text.length; 起始++) {
    const 開頭 = text[起始];
    if (開頭 !== '{' && 開頭 !== '[') continue;

    let 深度 = 0;
    let 在字串中 = false;
    for (let i = 起始; i < text.length; i++) {
      const 字元 = text[i];
      if (在字串中) {
        if (字元 === '"' && !isEscaped(text, i)) 在字串中 = false;
        continue;
      }
      if (字元 === '"') { 在字串中 = true; continue; }
      if (字元 === '{' || 字元 === '[') 深度++;
      else if (字元 === '}' || 字元 === ']') {
        深度--;
        if (深度 === 0) {
          片段.push(text.slice(起始, i + 1));
          起始 = i; // 巢狀的內層已被涵蓋，跳過避免重複
          break;
        }
      }
    }
  }
  return 片段;
}

/** 逐一嘗試解析各候選字串，全部失敗回 null。 */
function 嘗試解析<T>(候選: string[]): T | null {
  for (const 片段 of 候選) {
    const text = 片段.trim();
    if (!text) continue;
    try {
      return JSON.parse(text) as T;
    } catch {
      // 換下一個候選。
    }
  }
  return null;
}

/**
 * 由字串中取出 JSON 並解析。
 *
 * 依序嘗試：去掉 markdown 包裝後的整段 → 各個配對完整的片段。
 * 全部失敗才回傳 null，由呼叫端決定如何降級。
 */
export function extractJsonFromText<T>(text: string): T | null {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  if (!cleaned) return null;

  return 嘗試解析<T>([cleaned, ...findBalancedSegments(cleaned)]);
}
