import React, { useState, useEffect } from 'react';
import {
  Table, 
  FileSpreadsheet, 
  Gavel
} from 'lucide-react';
import { loadCrossFeatureContext } from '../lib/crossFeatureContext';

const SmartAppealAssistant = React.lazy(() => import('./SmartAppealAssistant'));
const DefenseWorkflowTool = React.lazy(() => import('./DefenseWorkflowTool').then(module => ({ default: module.DefenseWorkflowTool })));
const IssueTableGenerator = React.lazy(() => import('./IssueTableGenerator'));
const EvidenceListGenerator = React.lazy(() => import('./EvidenceListGenerator'));
const AppealDeadlineTool = React.lazy(() => import('./AppealDeadlineTool'));
const LegalToolbox = React.lazy(() => import('./LegalToolbox').then(module => ({ default: module.LegalToolbox })));
const LegalGuideHome = React.lazy(() => import('./LegalGuideHome').then(module => ({ default: module.LegalGuideHome })));

interface LitigationWorkspaceProps {
  initialTab?: 'guide' | 'toolbox' | 'defense' | 'issues' | 'evidence' | 'appeal' | 'deadline';
  initialToolId?: string;
  appealOnly?: boolean;
}

export const LitigationWorkspace: React.FC<LitigationWorkspaceProps> = ({ initialTab = 'guide', initialToolId, appealOnly = false }) => {
  // Check cross-feature context if available
  const crossCtx = loadCrossFeatureContext();
  const effectiveInitialTab = initialTab || crossCtx?.initialTab || 'guide';
  const effectiveToolId = initialToolId || crossCtx?.preselectedToolId;

  // Determine main tab from initial tab
  const getInitialMainTab = (tab: string) => {
    if (tab === 'guide') return 'guide';
    if (tab === 'toolbox') return 'toolbox';
    if (tab === 'defense') return 'defense';
    if (['issues', 'evidence'].includes(tab)) return 'issues_evidence';
    if (tab === 'appeal') return 'appeal';
    if (tab === 'deadline') return 'deadline';
    return 'guide';
  };

  const [activeMainTab, setActiveMainTab] = useState<'guide' | 'toolbox' | 'defense' | 'issues_evidence' | 'appeal' | 'deadline'>(getInitialMainTab(effectiveInitialTab));
  
  // Keep track of subtabs
  const [issuesSubTab, setIssuesSubTab] = useState<'issues' | 'evidence'>(
    effectiveInitialTab === 'evidence' ? 'evidence' : 'issues'
  );
  useEffect(() => {
    setActiveMainTab(getInitialMainTab(effectiveInitialTab));
    if (effectiveInitialTab === 'evidence' || effectiveInitialTab === 'issues') {
      setIssuesSubTab(effectiveInitialTab);
    }
  }, [effectiveInitialTab]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090d16] text-slate-100">
      {/* 工作台標題列 */}
      <div className="bg-[#0e1424] border-b border-slate-800 px-6 py-3.5 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${appealOnly ? 'bg-[var(--color-module-appeal)]' : 'bg-[var(--color-module-litigation)]'}`}
                  aria-hidden="true"
                />
                <h1 className="text-sm font-bold text-white tracking-tight">{appealOnly ? '智慧判決分析工作台' : '全方位實用法務工具箱'}</h1>
                <span className="hidden md:inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                  {appealOnly ? '上訴救濟' : '一站式法務'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {appealOnly ? '整合期限試算、判決剖析、訴訟防禦與爭點證據' : '整合生活法律導診、日常法務與書狀工具'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 子分頁切換列：極簡細邊線與 12px 圓角 */}
      {activeMainTab === 'issues_evidence' && (
        <div className="bg-[#0b101d] border-b border-slate-800 px-6 py-2 flex justify-center">
          <div className="flex bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs font-medium gap-1">
            <button
              onClick={() => setIssuesSubTab('issues')}
              className={`px-4 py-1.5 rounded-xl flex items-center gap-2 transition-colors ${issuesSubTab === 'issues' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-[var(--color-text-muted)] hover:text-slate-200'}`}
            >
              <Table className="w-3.5 h-3.5" />
              法庭爭點整理表
            </button>
            <button
              onClick={() => setIssuesSubTab('evidence')}
              className={`px-4 py-1.5 rounded-xl flex items-center gap-2 transition-colors ${issuesSubTab === 'evidence' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-[var(--color-text-muted)] hover:text-slate-200'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              調查證據聲請清單
            </button>
          </div>
        </div>
      )}

      {/* 內容區塊：統一平緩的 p-6 內邊距與自適應高度 */}
      <div className="flex-1 overflow-y-auto">
        <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">工具載入中…</div>}>
          {activeMainTab === 'guide' && <LegalGuideHome />}

          {activeMainTab === 'toolbox' && (
            <div className="p-6 max-w-7xl mx-auto h-full">
              <LegalToolbox initialToolId={effectiveToolId} />
            </div>
          )}
        
          {activeMainTab === 'defense' && (
            <div className="p-6 max-w-7xl mx-auto">
              <DefenseWorkflowTool />
            </div>
          )}
        
          {activeMainTab === 'issues_evidence' && issuesSubTab === 'issues' && (
            <div className="p-6 max-w-7xl mx-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[var(--color-surface-overlay)]">
                <IssueTableGenerator />
              </div>
            </div>
          )}
        
          {activeMainTab === 'issues_evidence' && issuesSubTab === 'evidence' && (
            <div className="p-6 max-w-7xl mx-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[var(--color-surface-overlay)]">
                <EvidenceListGenerator />
              </div>
            </div>
          )}
        
          {activeMainTab === 'appeal' && (
            <div className="p-6 max-w-7xl mx-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <SmartAppealAssistant />
              </div>
            </div>
          )}
        
          {activeMainTab === 'deadline' && (
            <div className="p-6 max-w-7xl mx-auto">
              <AppealDeadlineTool />
            </div>
          )}
        </React.Suspense>
      </div>
    </div>
  );
};

export default LitigationWorkspace;
