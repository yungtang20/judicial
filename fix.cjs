const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The incorrect string
const badStr = `caseType,
          isSyllogismComplete: jsonParsed.isSyllogismComplete !== false,
          missingQuestions: jsonParsed.missingQuestions || [],`;

// Replace all with caseType,
code = code.split(badStr).join('caseType,');

// Re-insert correctly into /api/triage/universal
// We know it was at return res.json({ identifiedIssue..., category..., caseType, ... })
const targetStr = `return res.json({
          identifiedIssue: jsonParsed.identifiedIssue || "法律爭議案件分析",
          category: jsonParsed.category || "UNIVERSAL_AI_PLEADING",
          caseType,`;

const goodStr = targetStr + `
          isSyllogismComplete: jsonParsed.isSyllogismComplete !== false,
          missingQuestions: jsonParsed.missingQuestions || [],`;

code = code.replace(targetStr, goodStr);

fs.writeFileSync('server.ts', code);
console.log("Fixed server.ts");
