import { UNIVERSAL_SYLLOGISM_RULES } from "./universal-syllogism.js";

export function getGenerateAppealPetitionPrompt(data: any): string {
  const caseNo = data.caseNo || "113年度上字第123號";
  const caseType = data.caseType || "CIVIL";
  const courtName = data.courtName || "臺灣高等法院";
  const appealCourtName = data.appealCourtName || courtName;
  const appellantName = data.appellantName || "上訴人";
  const appellantRole = data.appellantRole || "上訴人";
  const appelleeName = data.appelleeName || "被上訴人";
  const appelleeRole = data.appelleeRole || "被上訴人";
  const claims = typeof data.claims === "string" ? data.claims : JSON.stringify(data.claims || "原判決不利於上訴人部分廢棄");
  const judgmentSummary = typeof data.judgmentSummary === "string" ? data.judgmentSummary : JSON.stringify(data.judgmentSummary || "原審判決認事用法顯有未盡之處");
  const issues = Array.isArray(data.issues) ? data.issues.map((i: any) => typeof i === "string" ? i : (i.title || i.point || JSON.stringify(i))).join("\n") : (data.issues || "原審認定事實未憑客觀證據");
  const evidences = Array.isArray(data.evidences) ? data.evidences.map((e: any) => typeof e === "string" ? e : (e.investigationItem || e.provenFact || JSON.stringify(e))).join("\n") : "";
  const precedents = Array.isArray(data.selectedPrecedents) ? data.selectedPrecedents.map((p: any) => typeof p === "string" ? p : (p.citation || p.title || JSON.stringify(p))).join("\n") : "";

  return `${UNIVERSAL_SYLLOGISM_RULES}
你是一位精通台灣上訴審訴訟實務的資深訴訟律師。請依據下列第一審裁判爭點、上訴人主張及事證資料，撰寫一份嚴謹、專業且完全符合台灣法院書狀慣例的上訴理由狀。

【案件基本資訊】
- 案由案號：${caseNo}
- 原審法院：${courtName}
- 管轄上訴法院：${appealCourtName}
- 上訴人：${appellantName}（稱謂：${appellantRole}）
- 被上訴人：${appelleeName}（稱謂：${appelleeRole}）
- 訴訟類型：${caseType}

【原審裁判摘要與認定缺失】
${judgmentSummary}

【上訴之聲明與廢棄範圍】
${claims}

【原判決違背法令與事實爭點】
${issues}

${evidences ? `【相關證據與調查聲請】\n${evidences}\n` : ""}
${precedents ? `【引註實務裁判與判例見解】\n${precedents}\n` : ""}

【書狀撰寫要求】
1. 嚴格依照法院書狀標準格式，包含：書狀名稱（如「民事上訴理由狀」或「刑事上訴理由狀」）、案號股別、當事人欄位、上訴聲明、事實及理由、證據清單、管轄法院結語與具狀日期署名。
2. 嚴格落實「三段論法」（大前提：構成要件與法律原則；小前提：案件事實與原審違誤；涵攝：具體指駁原判決如何不當或違法；結論：請求廢棄或改判之法律效果）。
3. 嚴格禁止虛構或捏造任何不存在之法條與裁判字號（Fail-Closed 防幻覺規則）。
4. 針對原審判決認定事實不憑證據、違背採證法則（民事訴訟法第277條、經驗法則、論理法則等）進行精準反駁。

請直接輸出完整之上訴書狀全文：`;
}
