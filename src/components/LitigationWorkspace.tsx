import React, { useState, useEffect } from 'react';
import {
  Table, 
  FileSpreadsheet, 
  Gavel
} from 'lucide-react';
import { loadCrossFeatureContext } from '../lib/crossFeatureContext';
import { buildAppealContext } from '../domain/case/appealContext';
import type { AppealSection, LitigationSection, RouteHandoff, WorkspaceRoot } from '../types/navigation';

const SmartAppealAssistant = React.lazy(() => import('./SmartAppealAssistant'));
const DefenseWorkflowTool = React.lazy(() => import('./DefenseWorkflowTool').then(module => ({ default: module.DefenseWorkflowTool })));
const IssueTableGenerator = React.lazy(() => import('./IssueTableGenerator'));
const EvidenceListGenerator = React.lazy(() => import('./EvidenceListGenerator'));
const AppealDeadlineTool = React.lazy(() => import('./AppealDeadlineTool'));
const LegalToolbox = React.lazy(() => import('./LegalToolbox').then(module => ({ default: module.LegalToolbox })));
const LegalGuideHome = React.lazy(() => import('./LegalGuideHome').then(module => ({ default: module.LegalGuideHome })));

type WorkspaceSection = LitigationSection | AppealSection | 'appeal';

interface LitigationWorkspaceProps {
  root?: WorkspaceRoot;
  section?: WorkspaceSection;
  handoff?: RouteHandoff;
  initialTab?: WorkspaceSection;
  initialToolId?: string;
  initialFacts?: string;
  appealOnly?: boolean;
  onSectionChange?: (section: 'issues' | 'evidence') => void;
}

export const LitigationWorkspace: React.FC<LitigationWorkspaceProps> = ({
  root,
  section,
  handoff,
  initialTab,
  initialToolId,
  initialFacts,
  appealOnly = false,
  onSectionChange,
}) => {
  const crossCtx = loadCrossFeatureContext();
  const hasHandoff = handoff !== undefined && Object.keys(handoff).length > 0;
  const canUseCrossContext = !hasHandoff;
  const effectiveSection: WorkspaceSection = section || initialTab ||
    (appealOnly ? 'analysis' : crossCtx?.initialTab || 'toolbox');
  const workspaceRoot: WorkspaceRoot = root ||
    (appealOnly || effectiveSection === 'analysis' || effectiveSection === 'deadline' ? 'appeal' : 'litigation');
  const effectiveToolId = handoff?.toolId || (canUseCrossContext ? initialToolId || crossCtx?.preselectedToolId : undefined);
  const effectiveFacts = handoff?.facts || (canUseCrossContext ? initialFacts || crossCtx?.facts : undefined);
  const effectiveIssueSummary = handoff?.issuesSummary || (canUseCrossContext ? crossCtx?.issuesSummary : undefined);
  const appealContext = buildAppealContext(
    handoff,
    canUseCrossContext && crossCtx?.sourceTool === 'unified' ? crossCtx : null
  );

  const getInitialMainTab = (tab: WorkspaceSection) => {
    if (tab === 'guide') return 'guide';
    if (tab === 'toolbox') return 'toolbox';
    if (tab === 'defense') return 'defense';
    if (tab === 'issues' || tab === 'evidence') return 'issues_evidence';
    if (tab === 'analysis' || tab === 'appeal') return 'appeal';
    if (tab === 'deadline') return 'deadline';
    return 'guide';
  };

  const [activeMainTab, setActiveMainTab] = useState<'guide' | 'toolbox' | 'defense' | 'issues_evidence' | 'appeal' | 'deadline'>(getInitialMainTab(effectiveSection));
  const [issuesSubTab, setIssuesSubTab] = useState<'issues' | 'evidence'>(
    effectiveSection === 'evidence' ? 'evidence' : 'issues'
  );
  useEffect(() => {
    setActiveMainTab(getInitialMainTab(effectiveSection));
    if (effectiveSection === 'evidence' || effectiveSection === 'issues') {
      setIssuesSubTab(effectiveSection);
    }
  }, [effectiveSection]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-surface-base)] text-slate-100">
      {/* 工作台標題列 */}
      <div className="bg-[var(--color-surface-raised)] border-b border-slate-800 px-6 py-3.5 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${workspaceRoot === 'appeal' ? 'bg-[var(--color-module-appeal)]' : 'bg-[var(--color-module-litigation)]'}`}
                  aria-hidden="true"
                />
                <h1 className="text-sm font-bold text-white tracking-tight">{workspaceRoot === 'appeal' ? '智慧判決分析工作台' : '全方位實用法務工具箱'}</h1>
                <span className="hidden md:inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                  {workspaceRoot === 'appeal' ? '上訴救濟' : '書狀製作'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {workspaceRoot === 'appeal' ? '整合期限試算、判決剖析、訴訟防禦與爭點證據' : '依生活情境選擇文件，填寫資料後產製並檢核'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 子分頁切換列：極簡細邊線與 12px 圓角 */}
      {activeMainTab === 'issues_evidence' && (
        <div className="bg-[var(--color-surface-overlay)] border-b border-slate-800 px-6 py-2 flex justify-center">
          <div className="flex bg-[var(--color-surface-base)] p-1 rounded-xl border border-slate-800 text-xs font-medium gap-1">
            <button
              onClick={() => {
                setIssuesSubTab('issues');
                onSectionChange?.('issues');
              }}
              className={`px-4 py-1.5 rounded-xl flex items-center gap-2 transition-colors ${issuesSubTab === 'issues' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-[var(--color-text-muted)] hover:text-slate-200'}`}
            >
              <Table className="w-3.5 h-3.5" />
              法庭爭點整理表
            </button>
            <button
              onClick={() => {
                setIssuesSubTab('evidence');
                onSectionChange?.('evidence');
              }}
              className={`px-4 py-1.5 rounded-xl flex items-center gap-2 transition-colors ${issuesSubTab === 'evidence' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-[var(--color-text-muted)] hover:text-slate-200'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              調查證據聲請清單
            </button>
          </div>
        </div>
      )}

      {/* 內容區塊：手機版採 p-3.5 緊湊防擠壓，平板/桌面採 p-6 內邊距與自適應高度 */}
      <div className="flex-1 overflow-y-auto">
        <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">工具載入中…</div>}>
          {activeMainTab === 'guide' && <LegalGuideHome />}

          {activeMainTab === 'toolbox' && (
            <div className="p-3.5 sm:p-6 max-w-7xl mx-auto h-full">
              <LegalToolbox initialToolId={effectiveToolId} initialFacts={effectiveFacts} formSeed={handoff?.formSeed} />
            </div>
          )}
        
          {activeMainTab === 'defense' && (
            <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
              <DefenseWorkflowTool />
            </div>
          )}
        
          {activeMainTab === 'issues_evidence' && issuesSubTab === 'issues' && (
            <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[var(--color-surface-overlay)]">
                <IssueTableGenerator initialFacts={effectiveFacts} initialIssueSummary={effectiveIssueSummary} />
              </div>
            </div>
          )}
        
          {activeMainTab === 'issues_evidence' && issuesSubTab === 'evidence' && (
            <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[var(--color-surface-overlay)]">
                <EvidenceListGenerator initialIssueSummary={effectiveIssueSummary} />
              </div>
            </div>
          )}
        
          {activeMainTab === 'appeal' && (
            <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <SmartAppealAssistant
                  initialFacts={effectiveFacts}
                  workflowContext={appealContext}
                />
              </div>
            </div>
          )}
        
          {activeMainTab === 'deadline' && (
            <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
              <AppealDeadlineTool />
            </div>
          )}
        </React.Suspense>
      </div>
    </div>
  );
};

export default LitigationWorkspace;
