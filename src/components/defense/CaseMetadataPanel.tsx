import React from 'react';
import { SlidersHorizontal, Book, FileText, CheckCircle } from 'lucide-react';

export interface CaseMetadataPanelProps {
  caseType: string;
  setCaseType: (t: string) => void;
  courtName: string;
  setCourtName: (t: string) => void;
  caseNo: string;
  setCaseNo: (t: string) => void;
  clientRole: string;
  setClientRole: (t: string) => void;
  clientName: string;
  setClientName: (t: string) => void;
  opponentRole: string;
  setOpponentRole: (t: string) => void;
  opponentName: string;
  setOpponentName: (t: string) => void;
  caseBackground: string;
  setCaseBackground: (t: string) => void;
  onSaveGlobal: () => void;
  lawyerName: string;
  setLawyerName: (t: string) => void;
}

export const CaseMetadataPanel: React.FC<CaseMetadataPanelProps> = ({
  caseType, setCaseType, courtName, setCourtName, caseNo, setCaseNo,
  clientRole, setClientRole, clientName, setClientName,
  opponentRole, setOpponentRole, opponentName, setOpponentName,
  caseBackground, setCaseBackground, onSaveGlobal,
  lawyerName, setLawyerName
}) => {
  return (
    <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
        <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2 text-sm">
          <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          案件基礎資訊配置
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">用於自動具狀排版</span>
      </div>
      
      <div className="space-y-3 text-xs">
        <div>
          <label className="block font-medium text-[var(--color-text-secondary)] mb-1">訴訟類型</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'civil', label: '民事訴訟' },
              { id: 'criminal', label: '刑事訴訟' },
              { id: 'administrative', label: '行政訴訟' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCaseType(t.id)}
                className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-all ${
                  caseType === t.id
                    ? 'bg-[var(--color-status-warning-bg)] border-amber-400 text-[var(--color-status-warning)] font-bold'
                    : 'bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-medium text-[var(--color-text-secondary)] mb-1">受訴法院</label>
            <input
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--color-text-secondary)] mb-1">案號</label>
            <input
              type="text"
              value={caseNo}
              onChange={(e) => setCaseNo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-medium text-[var(--color-text-secondary)] mb-1">我方稱謂 / 姓名</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={clientRole}
                onChange={(e) => setClientRole(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-center"
              />
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--color-text-secondary)] mb-1">對方稱謂 / 姓名</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={opponentRole}
                onChange={(e) => setOpponentRole(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-center"
              />
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>
        
        <div>
           <label className="block font-medium text-[var(--color-text-secondary)] mb-1">代理人律師姓名</label>
           <input
             type="text"
             value={lawyerName}
             onChange={(e) => setLawyerName(e.target.value)}
             className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
           />
        </div>

        <div>
          <label className="block font-medium text-[var(--color-text-secondary)] mb-1">全案背景摘要 (全局)</label>
          <textarea
            rows={3}
            value={caseBackground}
            onChange={(e) => setCaseBackground(e.target.value)}
            placeholder="訴訟背景..."
            className="w-full px-2.5 py-2 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
          />
        </div>
        
        <button
          onClick={onSaveGlobal}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-semibold"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          更新並同步至全域案件記憶
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
        <h4 className="font-bold text-[var(--color-text-secondary)] text-xs mb-2 flex items-center gap-1.5">
          <Book className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> 操作說明
        </h4>
        <ul className="space-y-1.5 text-[11px] text-[var(--color-text-muted)] list-disc pl-4">
          <li>此工具針對「被告 / 抗辯方」當事人情緒化原始陳述進行法律實益過濾。</li>
          <li>【律師軌】僅提取有法律意義的事實。</li>
          <li>【當事人軌】設計提問式引導與地雷掃描，最終產出安全的《個人陳報狀》。</li>
        </ul>
      </div>
    </div>
  );
};
