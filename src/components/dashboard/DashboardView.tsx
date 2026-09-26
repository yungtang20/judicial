import React, { useMemo, useState } from 'react';
import { buildDashboardModel } from '../../lib/ui/dashboardGenerator';
import { explainLegalConcept } from '../../lib/ai/legalConceptExplainer';
import FilingGuideModal from './FilingGuideModal';
import DraftRefiner from './DraftRefiner';
import type { CaseDocumentArtifact } from '../../domain/case/types';

export function SafetyAndResourcePanel({ notice, visible }: { notice: string; visible: boolean }) {
  if (!visible) return null;
  return <section className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-amber-100" aria-label="安全與資源"><strong>安全與求助</strong><p className="mt-1 text-sm">{notice}</p></section>;
}

export function PlainLanguageSummaryCard({ summary, rights }: { summary: string; rights: DashboardModelRights[] }) {
  return <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-label="白話法律分析"><strong className="text-emerald-300">白話法律分析</strong><p className="mt-2 text-sm text-slate-300">{summary}</p>{rights.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">請求權</th><th className="p-2">Status</th><th className="p-2">待補證據</th></tr></thead><tbody>{rights.map(item => <tr key={item.label} className="border-t border-slate-800"><td className="p-2">{item.label}</td><td className="p-2">{item.status}</td><td className="p-2">{item.evidence.join('、') || '—'}</td></tr>)}</tbody></table></div>}</section>;
}

export function LegalConceptList({ concepts, status = '待確認' }: { concepts: string[]; status?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (concepts.length === 0) return null;
  return <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-label="法律術語解釋"><strong className="text-cyan-300">法律術語白話解釋</strong><div className="mt-2 flex flex-wrap gap-2">{concepts.map(concept => <button type="button" key={concept} onClick={() => setSelected(concept)} className="rounded-lg border border-cyan-800 bg-cyan-950/50 px-2 py-1 text-xs hover:bg-cyan-900">{concept}</button>)}</div>{selected && <p className="mt-3 text-sm text-slate-300" role="status">{explainLegalConcept(selected, status)}</p>}</section>;
}

type DashboardModelRights = { label: string; status: string; evidence: string[] };

export function EvidenceChecklist({ evidence }: { evidence: string[] }) {
  return <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-label="證據清單"><strong className="text-sky-300">證據保全清單</strong><ul className="mt-2 space-y-1 text-sm text-slate-300">{evidence.map(item => <li key={item}><label><input type="checkbox" className="mr-2" />{item}</label></li>)}</ul></section>;
}

export function DocumentBundleKit({ bundles, onSelectBundle, draftText, allowedCitations }: { bundles: string[]; onSelectBundle?: (bundleId: string) => void | Promise<void>; draftText?: string; allowedCitations?: string[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 沒有可用的已產製文件時不渲染微調工具，避免出現空殼輸入框。
  const refinableDraftText = draftText?.trim() ? draftText : '';
  const select = async (bundleId: string) => {
    if (!onSelectBundle) return;
    setBusy(bundleId);
    setError(null);
    try { await onSelectBundle(bundleId); } catch (err) { setError(err instanceof Error ? err.message : '文件產製失敗'); } finally { setBusy(null); }
  };
  return <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-label="文件組合包"><strong className="text-indigo-300">建議任務組合包</strong><div className="mt-2 flex flex-wrap gap-2">{bundles.length ? bundles.map(item => <button type="button" key={item} disabled={!onSelectBundle || busy !== null} onClick={() => void select(item)} className="rounded-lg border border-indigo-800 bg-indigo-950/60 px-2 py-1 text-xs hover:bg-indigo-900 disabled:cursor-wait disabled:opacity-60">{busy === item ? '產製中…' : item}</button>) : <span className="text-sm text-slate-400">尚無安全推薦。</span>}</div>{error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}{refinableDraftText && <DraftRefiner draftText={refinableDraftText} allowedCitations={allowedCitations || []} />}</section>;
}

export function AdvancedLegalReasoningPanel({ result }: { result: any }) {
  return <details className="rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-label="進階法律底稿"><summary className="cursor-pointer font-semibold text-purple-300">進階法律底稿</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{JSON.stringify(result?.syllogism || result?.analysis || {}, null, 2)}</pre></details>;
}

export default function DashboardView({ result, onSelectBundle, documents }: { result: any; onSelectBundle?: (bundleId: string) => void | Promise<void>; documents?: CaseDocumentArtifact[] }) {
  const model = useMemo(() => buildDashboardModel(result, documents), [result, documents]);
  return <div className="space-y-3"><SafetyAndResourcePanel {...model.safety} /><PlainLanguageSummaryCard summary={model.summary} rights={model.rights} /><LegalConceptList concepts={Array.isArray(result?.legalBasis) ? result.legalBasis : []} status={result?.isComplete === false ? '待補充' : '待確認'} /><EvidenceChecklist evidence={model.evidence} /><DocumentBundleKit bundles={model.bundles} onSelectBundle={onSelectBundle} draftText={model.draftText} allowedCitations={result?.allowedCitations || result?.antiGhostVerification?.verifiedCitations?.map((citation: any) => citation.citationText) || []} /><FilingGuideModal {...model.filing} /><AdvancedLegalReasoningPanel result={result} /></div>;
}
