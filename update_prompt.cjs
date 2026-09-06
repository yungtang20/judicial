const fs = require('fs');
let code = fs.readFileSync('src/prompts/legalProcessPrompts.ts', 'utf-8');
code = code.replace(
  /export function buildSyllogismEnginePrompt\(legalElements: string, userFacts: string\): string \{([\s\S]*?)\}/,
  `export function buildSyllogismEnginePrompt(legalElements: string, userFacts: string, missingElements?: string[]): string {
  const missingWarning = missingElements && missingElements.length > 0
    ? \`\\n\\n【注意：這是一份初步評估草稿】\\n由於用戶提供的資訊中仍缺乏以下關鍵要素：\${missingElements.join('、')}。\\n請在結論或涵攝中明確標註這是一份「初步草稿」，並具體說明缺失這些資訊將如何影響法律判斷，引導使用者後續補充。\`
    : '';
  return \`你是一位資深法律分析專家。請根據以下「大前提（構成要件）」與「小前提（案件事實）」，嚴格執行三段論法涵攝分析。\${missingWarning}

【大前提（構成要件）】：\${legalElements} (由 RAG 動態抓取注入)

【小前提（案件事實）】：\${userFacts}

輸出格式：
1. 大前提：簡述適用法條與構成要件。
2. 小前提：簡述用戶輸入的相關事實與證據。
3. 涵攝：逐一比對事實與要件（明確指出符合、不符合或事實仍不足）。
4. 結論：給出初步法律評估與下一步行動建議。

約束：
絕對禁止編造用戶未提供的事實。若事實與要件有落差，必須在涵攝中明確指出。
\`;
}`
);
fs.writeFileSync('src/prompts/legalProcessPrompts.ts', code);
