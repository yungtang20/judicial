import { LegalWorkflowState } from './workflow/unifiedStateGraph';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtmlReport(state: LegalWorkflowState): string {
  const router = state.router;
  const rag = state.rag;
  const syllogism = state.syllogism;
  const verification = state.verification;
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>智慧法律分析報告 — ${escapeHtml(router?.cause || '未分類')}</title>
<style>
  body { font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.8; }
  h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 8px; }
  h2 { color: #0f3460; margin-top: 28px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .section { background: #f8f9fa; border-left: 4px solid #0f3460; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-right: 8px; }
  .badge-blue { background: #e8f0fe; color: #1a73e8; }
  .badge-amber { background: #fef3cd; color: #856404; }
  .badge-green { background: #d4edda; color: #155724; }
  .full-analysis { white-space: pre-wrap; background: #fff; border: 1px solid #dee2e6; padding: 16px; border-radius: 8px; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #dee2e6; font-size: 12px; color: #999; text-align: center; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>智慧法律分析報告</h1>
<div class="meta">生成時間：${now} | 分析工具：智慧法律書狀系統 v2.5</div>

<h2>一、案件事實</h2>
<div class="section">${escapeHtml(state.userNarrative)}</div>

<h2>二、分流結果</h2>
<div class="section">
  <span class="badge badge-blue">${escapeHtml(router?.domain || '—')}</span>
  <span class="badge badge-blue">${escapeHtml(router?.chapter || '—')}</span>
  <span class="badge badge-amber">${escapeHtml(router?.cause || '—')}</span>
  ${router?.is_sensitive ? '<span class="badge badge-amber">⚠ 敏感案件</span>' : '<span class="badge badge-green">一般案件</span>'}
</div>

<h2>三、法規要件</h2>
<div class="section">
${rag?.legalElements ? `<p>${escapeHtml(rag.legalElements)}</p>` : '<p>（尚無法規要件）</p>'}
${rag?.statuteCitations?.length ? `<p><strong>法規引用：</strong>${rag.statuteCitations.map((c: string) => escapeHtml(c)).join('、')}</p>` : ''}
${rag?.precedents?.length ? rag.precedents.map((p: any) => `<p><strong>${escapeHtml(p.caseNumber)}</strong>（${escapeHtml(p.courtName)}）${escapeHtml(p.summary)}</p>`).join('') : ''}
</div>

<h2>四、三段論涵攝分析</h2>
<div class="full-analysis">${escapeHtml(syllogism?.fullAnalysis || '（尚未完成分析）')}</div>

${verification?.passGate ? `
<h2>五、真確性檢核</h2>
<div class="section">
  <span class="badge badge-green">✓ 通過真確性閘門</span>
  <p>${escapeHtml(verification.warningNotice || '')}</p>
</div>
` : ''}

<div class="footer">
  本報告由智慧法律書狀系統自動生成，僅供參考，不構成法律意見。<br>
  如需專業法律諮詢，請聯繫執業律師。
</div>
</body>
</html>`;
}

export function exportAsHtml(state: LegalWorkflowState) {
  const html = buildHtmlReport(state);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `法律分析報告_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsText(state: LegalWorkflowState) {
  const router = state.router;
  const syllogism = state.syllogism;
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const lines = [
    '═══════════════════════════════════════',
    '       智慧法律分析報告',
    '═══════════════════════════════════════',
    `生成時間：${now}`,
    '',
    '【案件事實】',
    state.userNarrative,
    '',
    '【分流結果】',
    `法律領域：${router?.domain || '—'}`,
    `罪章：${router?.chapter || '—'}`,
    `案由：${router?.cause || '—'}`,
    `敏感案件：${router?.is_sensitive ? '是' : '否'}`,
    '',
    '【三段論涵攝分析】',
    syllogism?.fullAnalysis || '（尚未完成分析）',
    '',
    '═══════════════════════════════════════',
    '本報告由智慧法律書狀系統自動生成，僅供參考。',
  ];

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `法律分析報告_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport(state: LegalWorkflowState) {
  const html = buildHtmlReport(state);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}
