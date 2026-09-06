const fs = require('fs');
let code = fs.readFileSync('server/routes/unifiedWorkflow.ts', 'utf-8');
const suggestEndpoint = `
/**
 * POST /api/workflow/suggest-field
 * 提供表單欄位的 AI 建議
 */
router.post("/api/workflow/suggest-field", async (req: Request, res: Response) => {
  try {
    const { fieldLabel, toolName, incidentDetails } = req.body;
    const prompt = \`你是一位專業的法律表單填寫助手。使用者正在準備【\${toolName}】，但在「\${fieldLabel}」欄位不知道該填什麼。
請根據以下案件事實（若無則依一般常見情境），提供 3 個簡短、具體、且符合該欄位要求的填寫選項，讓使用者可以直接套用。

案件事實：\${incidentDetails || "未提供"}

請直接輸出一個 JSON 陣列，包含 3 個字串，例如：["選項一", "選項二", "選項三"]。絕不輸出任何其他文字或 Markdown 標記（不要有 \`\`\`json 等）。\`;

    const response = await defaultAIProvider.generate(prompt, { temperature: 0.7 });
    let text = response.text.trim();
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    }
    const match = text.match(/\\[.*\\]/s);
    const jsonStr = match ? match[0] : '[]';
    const options = JSON.parse(jsonStr);
    return res.json({ success: true, options });
  } catch (error: any) {
    console.error('[SuggestField] 取得建議失敗:', error);
    return res.status(500).json({ error: error.message || "取得建議失敗" });
  }
});

export default router;
`;
code = code.replace(/export default router;/, suggestEndpoint);
fs.writeFileSync('server/routes/unifiedWorkflow.ts', code);
