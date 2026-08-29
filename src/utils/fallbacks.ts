// 智慧案件事實故事化生成器（綜合被害人、涉嫌人/被告、證人多方觀點，以小說紀實故事體裁呈現）
// 本地離線智慧判決解析器（當 API 完全 429 超額時自動保底，避免系統崩潰）
export function buildFallbackJudgmentAnalysis(_judgmentText: string) {
  return {
    isFallback: true,
    warning: "無法可靠分析判決內容，未產生任何案號、主文、上訴期間或法律結論。請補充完整判決原文並人工查證。",
    caseType: "",
    courtName: "",
    appealCourtName: "",
    caseNo: "",
    judgeDate: "",
    courtLevel: "",
    appealEligibility: "UNKNOWN",
    eligibilityStatusTitle: "無法確認上訴或覆審資格",
    eligibilityReason: "輸入不足或 AI 服務不可用，系統不判斷上訴期間。",
    judgmentSummary: null,
    suggestedPrecedents: [],
    suggestedIssues: [],
    suggestedEvidences: []
  };
}
export function buildFallbackPetition(body: any): string {
  const {
    caseType,
    courtName,
    appealCourtName,
    caseNo,
    claims,
    issues = [],
    appellantRole,
    appellantName,
    appellantId,
    appellantAddress,
    appellantPhone,
    appelleeRole,
    appelleeName,
    appelleeAddress,
  } = body;

  let petitionTitle = "民事上訴狀";
  if (caseType === "criminal") {
    petitionTitle = "刑事上訴理由狀";
  } else if (caseType === "administrative") {
    petitionTitle = "行政訴訟上訴狀（兼上訴理由狀）";
  } else if (caseType === "criminal_compensation") {
    petitionTitle = "刑事補償覆審聲請狀";
  }

  const issuesText = Array.isArray(issues) && issues.length > 0
    ? issues.map((item: any, idx: number) => `
（${idx + 1}）爭點【${item.title || `爭點 ${idx + 1}`}】——『原審瑕疵 × 客觀證據 × 權威見解』三位一體扣合：
• 指摘原審瑕疵：${item.originalHolding || "原審採認事實未憑客觀證據，心證採認顯有未盡指摘之處。"}
• 扣合我方客觀證據：【${item.relatedEvidenceCodes || "對應證物詳如聲請調查證據表"}】
• 我方上訴主張：${item.appealArgument || "請上訴審撤銷原判決。"}
• 法律依據：${item.legalBasis || "相關訴訟法規定"}
`).join("\n")
    : "";

  return `${petitionTitle}
案號：${caseNo || "未填寫"}
原審法院：${courtName || "臺灣臺北地方法院"}
上訴審法院：${appealCourtName || "臺灣高等法院"}

上訴人（原審${appellantRole || "被告"}）：${appellantName || "當事人"}
身分證號/統一編號：${appellantId || "未填寫"}
地址：${appellantAddress || "未填寫"}
電話：${appellantPhone || "未填寫"}

被上訴人（原審${appelleeRole || "原告"}）：${appelleeName || "相對人"}
地址：${appelleeAddress || "未填寫"}

聲明事項：
${claims || "一、原判決廢棄。\n二、被上訴人在第一審之訴駁回。"}

上訴理由：
${issuesText || "原審採認事實顯有違背法令及證據法則之處，懇請 貴院撤銷原判決。"}

此致
${appealCourtName || "臺灣高等法院"} 公鑑

具狀人：${appellantName || "當事人"} （蓋章）
中華民國 115 年 ${new Date().getMonth() + 1} 月 ${new Date().getDate()} 日
`;
}

// 本地離線警察刑事卷宗智慧解析器（保底機制）
export function buildFallbackPoliceAnalysis(_dossierText: string) {
  return {
    isFallback: true,
    warning: "無法可靠分析警詢卷宗，未產生任何案件事實、人物、時間、證據或程序結論。請人工複核原始卷宗。",
    caseOverview: null,
    incidentSummary: "",
    executiveSummary: "",
    timeline: [],
    interrogationQA: [],
    evidenceChecklist: [],
    proceduralVerification: [],
    legalElementsAnalysis: [],
    quickFAQ: [],
    ocrTranscription: ""
  };
}
