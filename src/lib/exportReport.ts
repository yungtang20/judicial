import { LegalWorkflowState } from './workflow/unifiedStateGraph';

function triggerDownload(content: string, filename: string, mimeType: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsText(state?: LegalWorkflowState | null): void {
  if (!state) return;
  const lines: string[] = [];
  lines.push('====================================');
  lines.push('          智慧法律分析報告');
  lines.push('====================================\n');

  if (state.userNarrative) {
    lines.push('【當事人陳述與事實事實】');
    lines.push(state.userNarrative);
    lines.push('');
  }

  if (state.router) {
    lines.push('【領域分流與主責法條】');
    lines.push(`領域：${state.router.domain || '一般法律'}`);
    if (state.router.chapter) lines.push(`章節：${state.router.chapter}`);
    if (state.router.cause) lines.push(`案由案由：${state.router.cause}`);
    lines.push('');
  }

  if (state.citations && state.citations.length > 0) {
    lines.push('【法規與裁判檢索依據】');
    state.citations.forEach((c, idx) => {
      lines.push(`${idx + 1}. [${c.type || '法規'}] ${c.title || c.article || ''}`);
      if (c.holding || c.summary) lines.push(`   重點：${c.holding || c.summary}`);
    });
    lines.push('');
  }

  if (state.syllogism) {
    lines.push('【三段論法法律論證分析】');
    if (state.syllogism.majorPremise) {
      lines.push('一、大前提（法律原則與構成要件）：');
      lines.push(state.syllogism.majorPremise);
    }
    if (state.syllogism.minorPremise) {
      lines.push('\n二、小前提（具體事實涵攝核實）：');
      lines.push(state.syllogism.minorPremise);
    }
    if (state.syllogism.subsumption) {
      lines.push('\n三、涵攝分析（事實如何該當要件）：');
      lines.push(state.syllogism.subsumption);
    }
    if (state.syllogism.conclusion) {
      lines.push('\n四、結論（法律效果與具體救濟途徑）：');
      lines.push(state.syllogism.conclusion);
    }
    lines.push('');
  }

  triggerDownload(lines.join('\n'), `法律分析報告_${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain;charset=utf-8');
}

export function exportAsHtml(state?: LegalWorkflowState | null): void {
  if (!state) return;
  const title = `法律分析報告 - ${state.router?.cause || '智能法務'}`;
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #334155; margin-top: 28px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 6px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>智慧法律分析報告</h1>
  <p><strong>產出日期：</strong>${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>

  ${state.userNarrative ? `<h2>一、當事人陳述事實</h2><div class="box">${escapeHtml(state.userNarrative)}</div>` : ''}

  ${state.router ? `<h2>二、案件分流分析</h2><div class="box">
    <p><strong>法律領域：</strong>${escapeHtml(state.router.domain || '一般法律')}</p>
    ${state.router.cause ? `<p><strong>案由案號：</strong>${escapeHtml(state.router.cause)}</p>` : ''}
  </div>` : ''}

  ${state.citations && state.citations.length > 0 ? `<h2>三、法律依據與裁判引註</h2><div class="box"><ul>
    ${state.citations.map(c => `<li><span class="tag">${escapeHtml(c.type || '法規')}</span><strong>${escapeHtml(c.title || c.article || '')}</strong>${c.holding || c.summary ? `<br/><small>${escapeHtml(c.holding || c.summary || '')}</small>` : ''}</li>`).join('')}
  </ul></div>` : ''}

  ${state.syllogism ? `<h2>四、三段論法論述結果</h2><div class="box">
    ${state.syllogism.majorPremise ? `<h3>大前提（法律要件）</h3><p>${escapeHtml(state.syllogism.majorPremise)}</p>` : ''}
    ${state.syllogism.minorPremise ? `<h3>小前提（事實查核）</h3><p>${escapeHtml(state.syllogism.minorPremise)}</p>` : ''}
    ${state.syllogism.subsumption ? `<h3>涵攝分析</h3><p>${escapeHtml(state.syllogism.subsumption)}</p>` : ''}
    ${state.syllogism.conclusion ? `<h3>結論與救濟</h3><p>${escapeHtml(state.syllogism.conclusion)}</p>` : ''}
  </div>` : ''}
</body>
</html>`;

  triggerDownload(html, `法律分析報告_${new Date().toISOString().slice(0, 10)}.html`, 'text/html;charset=utf-8');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

export function printReport(state?: LegalWorkflowState | null): void {
  if (typeof window === 'undefined') return;
  window.print();
}
