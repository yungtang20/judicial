
import React, { useState } from 'react';
import {
  FileText, ArrowRight, Briefcase, Table, Scale, Compass, AlertCircle, HelpCircle, CheckCircle2, Sparkles, Send
} from 'lucide-react';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';

export interface UnifiedNavProps {
  [key: string]: any;
}

export function canCarryWorkflowResult(state: LegalWorkflowState): boolean {
  return !state.error && state.router?.is_complete === true &&
    (state.verification?.verificationStatus === 'PASS' || state.verification?.verificationStatus === 'NEEDS_REVIEW');
}

export const UnifiedNav: React.FC<UnifiedNavProps> = (props) => {
  const {
    workflowState,
    setWorkflowState,
    handleSelectTool,
    saveCrossFeatureContext,
    setShowDocTypeModal,
    setInputNarrative,
    handleSupplementFact
  } = props;

  const [localSupplement, setLocalSupplement] = useState<string>('');
  const [isQuickUnlocking, setIsQuickUnlocking] = useState<boolean>(false);

  if (!workflowState?.syllogism) return null;
  const canCarryResult = canCarryWorkflowResult(workflowState);
  const verificationStatus = workflowState.verification?.verificationStatus;

  // 取得缺少之事實要素清單
  const missingElements: string[] = workflowState?.router?.missing_elements || [];

  // 就地直接補充並立即解除鎖定（無須回到頂部重跑）
  const handleInPlaceSupplement = (customText?: string) => {
    const textToAdd = (customText || localSupplement).trim();
    if (!textToAdd) return;

    setIsQuickUnlocking(true);
    const existing = workflowState.userNarrative || '';
    const updatedNarrative = `${existing}\n【補充事實】：${textToAdd}`.trim();

    // 同步到上方輸入框（保留歷史紀錄）
    if (setInputNarrative) {
      setInputNarrative(updatedNarrative);
    }

    // 就地將目前 workflowState 標記為完成並解鎖按鈕
    if (setWorkflowState) {
      setWorkflowState((prev: LegalWorkflowState) => {
        if (!prev) return prev;
        const currentRouter = prev.router || {
          domain: '民事',
          chapter: '一般訴訟',
          cause: '法律爭點請求權',
          is_sensitive: false,
          is_complete: true,
          missing_elements: []
        };

        return {
          ...prev,
          userNarrative: updatedNarrative,
          router: {
            ...currentRouter,
            is_complete: true,
            completeness: 1,
            missing_elements: []
          },
          currentStep: 'COMPLETED',
          updatedAt: Date.now()
        };
      });
    }

    setLocalSupplement('');
    setIsQuickUnlocking(false);
  };

  const handleJumpToLitigation = (tab: 'toolbox' | 'issues' | 'appeal') => {
    saveCrossFeatureContext({
      scenarioKeywords: workflowState?.router?.cause || '',
      domain: workflowState?.router?.domain,
      cause: workflowState?.router?.cause,
      facts: workflowState?.userNarrative || '',
      ...(verificationStatus === 'PASS' ? { issuesSummary: workflowState?.syllogism?.majorPremise || '' } : {}),
      verificationStatus,
      initialTab: tab,
      sourceTool: 'unified',
      timestamp: Date.now()
    });
    handleSelectTool(tab === 'appeal' ? 'appeal' : 'litigation', tab, {
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
      verificationStatus,
      sourceTool: 'unified',
      timestamp: Date.now()
    });
    handleSelectTool('litigation', 'guide');
  };

  return (
    <div className="border-t border-slate-800 pt-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">下一步</span>
          {canCarryResult ? (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              要件已齊全，可直接點擊下方書狀
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              尚未完全具備
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {canCarryResult
            ? verificationStatus === 'PASS' ? '可帶入，點擊後才生成' : '可帶入待查驗內容，點擊後才生成'
            : '就地補充後即可解鎖書狀按鈕'}
        </span>
      </div>

      {/* 待補齊要素詳細指引卡片（支援直接就地補充，不需回上方重跑） */}
      {!canCarryResult && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-3">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-amber-300 text-sm">
              <HelpCircle className="w-4 h-4" />
              需要補齊的案件事實（您可在此直接填寫，立即解鎖下方書狀）：
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-3 border border-amber-500/20 space-y-2">
            {missingElements.length > 0 ? (
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {missingElements.map((elem, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="text-amber-200 font-semibold">{elem}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-300 leading-relaxed">
                訴訟法基本要件尚不充分：請直接補充「<span className="text-amber-200 font-semibold">發生時間</span>、<span className="text-amber-200 font-semibold">發生地點</span>、或<span className="text-amber-200 font-semibold">手邊佐證（例如契約、匯款單、對話紀錄截圖）</span>」。
              </p>
            )}

            {/* 一鍵快捷常用要件按鈕 */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
              <span className="text-2xs text-[var(--color-text-muted)]">點擊快捷填入：</span>
              <button
                type="button"
                onClick={() => handleInPlaceSupplement('事發於上個月，在台中市，手邊存有通訊軟體對話截圖與匯款紀錄。')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-2xs transition-colors"
              >
                + 時間在上個月、有對話截圖與匯款紀錄
              </button>
              <button
                type="button"
                onClick={() => handleInPlaceSupplement('案發時間約在今年初，手邊留存契約書影本及存證信函回執。')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-2xs transition-colors"
              >
                + 時間在今年初、有契約影本及回執
              </button>
              <button
                type="button"
                onClick={() => handleInPlaceSupplement('事發地點於台北市租屋處，雙方有簽署紙本協議與照片為證。')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-2xs transition-colors"
              >
                + 租屋處協議與照片佐證
              </button>
            </div>
          </div>

          {/* 就地輸入框與直接補充按鈕 */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={localSupplement}
                onChange={(e) => setLocalSupplement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInPlaceSupplement();
                  }
                }}
                placeholder="在此直接補充（例如：發生在今年3月，我有轉帳明細和LINE對話截圖）..."
                className="flex-1 bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={!localSupplement.trim() || isQuickUnlocking}
                onClick={() => handleInPlaceSupplement()}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>直接補充並解鎖</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-2xs text-[var(--color-text-muted)]">
              <span>✅ 補充後直接就地生效，下方按鈕會立刻點亮，完全不必重新分析！</span>
              <button
                type="button"
                onClick={() => handleInPlaceSupplement('（使用者確認以目前陳述之事實直接產生初稿）')}
                className="text-amber-300 hover:text-amber-200 underline font-medium"
              >
                略過補充，直接以現有資料解鎖
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setShowDocTypeModal(true)}
          disabled={!canCarryResult}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
            <div>
              <div className="font-bold">產生文書草稿</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-normal">仍需律師審閱</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        <button
          onClick={() => handleJumpToLitigation('toolbox')}
          disabled={!canCarryResult}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
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
          disabled={!canCarryResult}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
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
          disabled={!canCarryResult}
          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
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
          前往生活法律導診
        </button>
      </div>
    </div>
  );
};
