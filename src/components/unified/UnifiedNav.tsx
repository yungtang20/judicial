
import React from 'react';
import {
  FileText, ArrowRight, Briefcase, Table, Scale, Compass, CheckCircle2
} from 'lucide-react';

export interface UnifiedNavProps {
  [key: string]: any;
}

export const UnifiedNav: React.FC<UnifiedNavProps> = (props) => {
  const { workflowState, handleSelectTool, saveCrossFeatureContext, setShowDocTypeModal } = props;

  if (!workflowState) return null;

  const handleJumpToLitigation = (tab: 'toolbox' | 'issues' | 'appeal') => {
    saveCrossFeatureContext({
      scenarioKeywords: workflowState?.router?.cause || '',
      domain: workflowState?.router?.domain,
      cause: workflowState?.router?.cause,
      facts: workflowState?.userNarrative || '',
      issuesSummary: workflowState?.syllogism?.majorPremise || '',
      initialTab: tab,
      sourceTool: 'unified',
      timestamp: Date.now()
    });
    handleSelectTool('litigation', tab, {
      initialTab: tab,
      facts: workflowState?.userNarrative
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
    handleSelectTool('guide');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white">案件分析完成 · 跨模組後續行動指引</span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">數據已就緒，可直接帶入各訴訟模組</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setShowDocTypeModal(true)}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
            <div>
              <div className="font-bold">生成對應文書</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">依分析結果產製</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('toolbox')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold">實用法務書狀</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">起訴狀與存證信函</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('issues')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Table className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="font-bold">法庭爭點整理表</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">帶入三段論爭點</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('appeal')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold">判決剖析與上訴</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">20天期間與上訴狀</div>
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
          前往生活情境導診
        </button>
      </div>
    </div>
  );
};
