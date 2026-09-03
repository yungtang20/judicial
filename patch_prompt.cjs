const fs = require('fs');
const path = './server/routes/triage.ts';
let code = fs.readFileSync(path, 'utf8');

const updatedPrompt = `const triagePrompt = \`你是一位全領域精準法律診斷專家兼司法程序架構師。請根據當事人或委任人之案件敘述，以嚴謹的中華民國實務法理與程序法為基礎進行全能導診分流。

【分類與法理準則】
1. 涉及配偶或親屬間未經同意拿取財物、盜刷信用卡等行為，同時構成刑事犯罪（如刑法竊盜、偽造文書、詐欺）與民事侵權，請歸類為 CRIMINAL_COMPLAINT_THEFT，並依刑法第324條標示為刑事告訴乃論。不得僅歸類為純民事 CIVIL。
2. 乘機性交（刑法第225條）不論是否為配偶，絕對是非告訴乃論。性自主案件嚴禁引用物上請求權(民法767)。

【本系統已內建之訴訟工具庫（共 \${LEGAL_TOOLS.length} 項）】：
\${toolsSummary}

【當事人案件事實敘述】：
"""\${rawInput}"""
身分角色：\${role || "未指定"}

請輸出標準 JSON 格式（勿包含 markdown 標籤或額外文字）：
{
  "identifiedIssue": "具體的法律爭議或罪名標題",
  "category": "對應的工具類別或 ID",
  "recommendedToolId": "最適合的工具 ID",
  "caseType": "CIVIL", // CIVIL, CRIMINAL_PUBLIC, 或 CRIMINAL_PRIVATE
  "isPublicProsecution": false, // 是否為公訴罪
  "legalBasis": ["民法第184條", "刑法第320條", "刑法第324條"], // 適用法條清單
  "timeLimit": "具體時效，例如：2年、6個月內",
  "litigationNatureText": "案件性質說明",
  "plainExplanation": "給當事人的白話文實體與程序法理分析（三段論法：前提、事實、結論）",
  "suggestedActions": ["第一步", "第二步"], // 具體行動建議
  "evidenceChecklist": ["證據1", "證據2"], // 需準備的證據清單
  "pleadingDraft": "若有初步訴狀或書狀草稿可放此"
}\`;`;

code = code.replace(/const triagePrompt = `你是一位全領域[\s\S]*?pleadingDraft": "若有初步訴狀或書狀草稿可放此"}`;/, updatedPrompt);

fs.writeFileSync(path, code, 'utf8');
