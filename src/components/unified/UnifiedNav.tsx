
import React from 'react';
import {
  FileText, ArrowRight, Briefcase, Table, Scale, Compass
} from 'lucide-react';
import { canUseWorkflowResult } from './UnifiedResult';
import { resolveDocumentTool } from '../../lib/documentSelectionRules';

export interface UnifiedNavProps {
  [key: string]: any;
}

export const UnifiedNav: React.FC<UnifiedNavProps> = (props) => {
  const { workflowState, handleSelectTool, saveCrossFeatureContext, setShowDocTypeModal } = props;

  if (!workflowState?.syllogism) return null;
  const canUseResult = canUseWorkflowResult(workflowState);
  const canOpenNextStep = !workflowState.error;
  const hasJudgmentContext = workflowState.inputType === 'judgment_document';
  const documentSelection = resolveDocumentTool({
    inputType: workflowState.inputType,
    domain: workflowState.router?.domain,
    caseType: workflowState.router?.caseType,
    sensitive: workflowState.router?.is_sensitive,
    recommendedToolId: workflowState.router?.recommendedToolId
  });

  const handleJumpToLitigation = (tab: 'toolbox' | 'issues' | 'appeal') => {
    const prioritizedTab = tab === 'toolbox' && documentSelection.destination === 'appeal' ? 'appeal' : tab;
    saveCrossFeatureContext({
      scenarioKeywords: workflowState?.router?.cause || '',
      domain: workflowState?.router?.domain,
      cause: workflowState?.router?.cause,
      facts: workflowState?.userNarrative || '',
      issuesSummary: workflowState?.syllogism?.majorPremise || '',
      initialTab: prioritizedTab,
      sourceTool: 'unified',
      timestamp: Date.now()
    });
    handleSelectTool(prioritizedTab === 'appeal' ? 'appeal' : 'litigation', prioritizedTab, {
      initialTab: prioritizedTab,
      facts: workflowState?.userNarrative,
      ...(prioritizedTab === 'toolbox' && documentSelection.toolId ? { preselectedToolId: documentSelection.toolId } : {})
    });
  };

  const handleJumpToGuide = () => {
    saveCrossFeatureContext({
      scenarioKeywords: workflowState?.router?.cause || '',
      domain: workflowState?.router?.domain,
      cause: workflowState?.router?.cause,
      facts: workflowState?.userNarrative || '',
      sourceTool: 'unified',
      timestamp: Date.now()
    });
    handleSelectTool('litigation', 'guide');
  };

  return (
    <div className="border-t border-slate-800 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">下一步</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {canUseResult ? '可產生草稿，仍需律師審閱' : '可選擇書狀，正式產出仍需驗證'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setShowDocTypeModal(true)}
          disabled={!canOpenNextStep}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
            <div>
              <div className="font-bold">選擇書狀類型</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{canUseResult ? '仍需律師審閱' : '正式產出仍需驗證'}</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('toolbox')}
          disabled={!canOpenNextStep}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold">實用法務書狀</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{canUseResult ? '起訴狀與存證信函' : '僅帶入參考資料'}</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('issues')}
          disabled={!canOpenNextStep}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2.5">
            <Table className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="font-bold">法庭爭點整理表</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{canUseResult ? '帶入三段論爭點' : '僅帶入參考資料'}</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('appeal')}
          disabled={!canOpenNextStep}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold">判決剖析與上訴</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{hasJudgmentContext ? (canUseResult ? '20天期間與上訴狀' : '僅帶入參考資料') : '可先選擇，需補充判決書'}</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      <div className="pt-1 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>需要一般生活狀況解方？</span>
        <button
          onClick={handleJumpToGuide}
          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
        >
          <Compass className="w-3.5 h-3.5" />
          前往生活法律導診
        </button>
      </div>
    </div>
  );
};
