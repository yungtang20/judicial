import fs from 'node:fs';
import path from 'node:path';

async function main() {
  process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'agnes';
  const { defaultAIProvider } = await import('../src/ai/providers/providerRegistry.js');
  const cases = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/test/case-fixture.json'), 'utf8'));
  const results: any[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const prompt = `請依照台灣法律分類以下案件：
案由：${c.案由}
案情摘要：${c.案情摘要}

請輸出 JSON，且必須包含：
- caseType: 案件類型（如 CRIMINAL_COMPLAINT_FRAUD、CIVIL_TORT_GENERAL、DOMESTIC_VIOLENCE_PROTECTION、CRIMINAL_COMPLAINT_THREAT、DEFAMATION_INSULT 等）
- legalBasis: 相關法條陣列（每一筆請以法條名稱開頭，例如「刑法第339條」）
- statuteOfLimitations: 時效或施行期間文字
- suggestedActions: 對民眾建議的行動陣列
- isSensitive: 是否涉及性自主、家暴等敏感議題
- missingElements: 這份案情還缺哪些關鍵資訊

不得輸出任何 markdown 或 code fence，僅輸出可解析的 JSON 物件。`;
    try {
      const out = await defaultAIProvider.generateStructured<any>(prompt, {
        type: 'object',
        properties: {
          caseType: { type: 'string' },
          legalBasis: { type: 'array', items: { type: 'string' } },
          statuteOfLimitations: { type: 'string' },
          suggestedActions: { type: 'array', items: { type: 'string' } },
          isSensitive: { type: 'boolean' },
          missingElements: { type: 'array', items: { type: 'string' } }
        },
        required: ['caseType', 'legalBasis', 'suggestedActions', 'isSensitive']
      }, { temperature: 0.1 });
      results.push({ 案由: c.案由, ok: true, ai: out });
      console.log((i + 1) + '. ' + c.案由 + ' => ok, caseType=' + (out.caseType || '').slice(0, 40));
    } catch (e: any) {
      results.push({ 案由: c.案由, ok: false, error: e.message || String(e) });
      console.log((i + 1) + '. ' + c.案由 + ' => error: ' + (e.message || e));
    }
  }
  fs.writeFileSync(path.join(process.cwd(), 'src/test/case-fixture-ai-eval.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('written src/test/case-fixture-ai-eval.json, ok: ' + results.filter(r => r.ok).length + '/' + results.length);
}

main();
