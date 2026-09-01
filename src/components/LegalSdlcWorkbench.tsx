import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Terminal,
  Clock,
  Send,
  UserCheck,
  RefreshCw,
  FolderGit2
} from 'lucide-react';
import {
  SDLC_STAGES,
  SdlcStageId,
  SdlcProjectState
} from '../domain/sdlc/types';
import { apiClient } from '../lib/apiClient';

export const LegalSdlcWorkbench: React.FC = () => {
  const [projectId] = useState<string>('project_legal_sdlc_master');
  const [projectTitle, setProjectTitle] = useState<string>('民事損害賠償與不當得利 AI 原生交付專案');
  const [legalDomain, setLegalDomain] = useState<string>('CIVIL');
  const [projectState, setProjectState] = useState<SdlcProjectState | null>(null);
  
  const [selectedStageId, setSelectedStageId] = useState<SdlcStageId>('01_plan');
  const [stageInputText, setStageInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'flow' | 'artifacts' | 'gates' | 'feedback'>('flow');
  
  // 審批 Modal 狀態
  const [showGateModal, setShowGateModal] = useState<boolean>(false);
  const [approverName, setApproverName] = useState<string>('資深執業律師 / 訴訟代理人');
  const [approvalNote, setApprovalNote] = useState<string>('已完整複核事實要件、證據對應與法條時效，符合交付與放行標準。');

  // 反饋回流 Modal 狀態
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackTargetStage, setFeedbackTargetStage] = useState<SdlcStageId>('02_design');
  const [feedbackReason, setFeedbackReason] = useState<string>('對造提出消滅時效中斷之新事證抗辯');
  const [feedbackAdjustments, setFeedbackAdjustments] = useState<string>('需於設計階段重構請求權基礎，將主要請求權由侵權行為轉移至不當得利與契約責任。');

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await apiClient.sdlcGetProject(projectId, projectTitle, legalDomain);
      if (res.project) {
        setProjectState(res.project);
        setSelectedStageId(res.project.currentStageId || '01_plan');
      }
    } catch (e) {
      console.error('載入 SDLC 專案失敗:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, []);

  const handleExecuteStage = async () => {
    if (!stageInputText && !projectState?.artifacts[selectedStageId]?.length) {
      if (!confirm('尚未輸入本階段專屬資訊，是否依系統既有上下文直接由 AI Agent 執行交付生成？')) {
        return;
      }
    }
    try {
      setLoading(true);
      const res = await apiClient.sdlcExecuteStage({
        projectId,
        stageId: selectedStageId,
        humanInput: stageInputText
      });
      if (res.project) {
        setProjectState(res.project);
      }
    } catch (err: any) {
      alert('階段執行錯誤: ' + (err?.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveGate = async () => {
    try {
      setLoading(true);
      const res = await apiClient.sdlcAdvanceGate({
        projectId,
        stageId: selectedStageId,
        decidedBy: approverName,
        decisionNote: approvalNote
      });
      if (res.project) {
        setProjectState(res.project);
        setSelectedStageId(res.project.currentStageId);
        setShowGateModal(false);
      }
    } catch (err: any) {
      alert('審批放行失敗: ' + (err?.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerFeedbackLoop = async () => {
    try {
      setLoading(true);
      const res = await apiClient.sdlcFeedbackLoop({
        projectId,
        fromStage: selectedStageId,
        targetStage: feedbackTargetStage,
        reason: feedbackReason,
        suggestedAdjustments: feedbackAdjustments
      });
      if (res.project) {
        setProjectState(res.project);
        setSelectedStageId(feedbackTargetStage);
        setShowFeedbackModal(false);
      }
    } catch (err: any) {
      alert('觸發閉環反饋失敗: ' + (err?.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  const selectedStage = SDLC_STAGES.find(s => s.id === selectedStageId) || SDLC_STAGES[0];
  const stageArtifacts = projectState?.artifacts[selectedStageId] || [];
  const currentGate = projectState?.gates[selectedStageId];
  const stageStatus = projectState?.stageStatuses[selectedStageId] || 'pending';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* 頂部 Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                AI 原生 SDLC 骨架
              </span>
              <span className="text-xs text-slate-400 font-mono">
                「模型只是執行層，流程才是系統骨架」
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {projectTitle}
            </h1>
          </div>
        </div>

        {/* 標籤切換與狀態指示 */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'flow' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              交付流程全景
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'artifacts' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              工件存儲庫 ({Object.values(projectState?.artifacts || {}).flat().length})
            </button>
            <button
              onClick={() => setActiveTab('gates')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'gates' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              人工決策 Gate
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'feedback' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              閉環回流記錄 ({projectState?.feedbackHistory.length || 0})
            </button>
          </div>

          <button
            onClick={loadProject}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            title="重新同步流程狀態"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* 流程總覽 6 大階段進度欄（嚴格對齊圖片佈局） */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[900px]">
          {SDLC_STAGES.map((stage, idx) => {
            const isCurrent = projectState?.currentStageId === stage.id;
            const isSelected = selectedStageId === stage.id;
            const status = projectState?.stageStatuses[stage.id] || 'pending';
            const isPassed = status === 'completed';
            const isIterating = status === 'iterating';

            let statusColor = 'border-slate-700 bg-slate-800/60 text-slate-400';
            if (isSelected) {
              statusColor = 'border-emerald-400 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500/30';
            } else if (isPassed) {
              statusColor = 'border-emerald-500/50 bg-slate-800 text-emerald-400';
            } else if (isIterating) {
              statusColor = 'border-amber-500/60 bg-amber-950/30 text-amber-300 animate-pulse';
            }

            return (
              <React.Fragment key={stage.id}>
                <div
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 flex-1 max-w-[180px] ${statusColor} hover:border-slate-500`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold tracking-wider">{stage.stepNumber}</span>
                    {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {isIterating && <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                    {isCurrent && !isPassed && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                  </div>
                  <div className="font-bold text-sm text-slate-100">{stage.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{stage.englishName}</div>
                </div>

                {idx < SDLC_STAGES.length - 1 && (
                  <div className="px-2 text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 主體工作區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左側：當前階段規格、輸入與輸出契約 */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* 階段核心卡片 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <div className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                  STAGE {selectedStage.stepNumber} / 06
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedStage.name} ({selectedStage.englishName})
                </h2>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${
                stageStatus === 'completed'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : stageStatus === 'iterating'
                  ? 'bg-amber-950 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {stageStatus.toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-slate-300 mb-5 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              {selectedStage.corePurpose}
            </p>

            {/* 嚴格對照圖片：輸入 (Inputs) */}
            <div className="space-y-3 mb-5">
              <div className="text-xs font-bold uppercase font-mono tracking-wider text-rose-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                {selectedStage.inputs.label} — {selectedStage.inputs.description}
              </div>
              <ul className="space-y-1.5 pl-2">
                {selectedStage.inputs.items.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2 font-mono">
                    <span className="text-rose-400/80">▸</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 嚴格對照圖片：輸出 (Outputs) */}
            <div className="space-y-3 mb-5">
              <div className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {selectedStage.outputs.label} — {selectedStage.outputs.description}
              </div>
              <ul className="space-y-1.5 pl-2">
                {selectedStage.outputs.items.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2 font-mono">
                    <span className="text-emerald-400/80">▸</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 關鍵風險人為判斷 (Human Risk Guard) */}
            <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                關鍵風險仍由人判斷 (Human Gate)
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedStage.humanRiskPrompt}
              </p>
            </div>
          </div>

          {/* 驅動面板 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-slate-400 uppercase">
                輸入自訂背景／本階段指令
              </span>
              <span className="text-xs text-slate-500">Agent 即時分析</span>
            </div>
            
            <textarea
              value={stageInputText}
              onChange={(e) => setStageInputText(e.target.value)}
              placeholder={`輸入本階段（${selectedStage.name}）之事實、爭點補強或指令，AI Agent 將依據 SDLC 合約生成可追溯工件...`}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition resize-none font-mono"
            />

            <div className="flex gap-2">
              <button
                onClick={handleExecuteStage}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI 執行本階段交付 (Execute Stage)
              </button>

              <button
                onClick={() => setShowGateModal(true)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                title="審批並放行至下一階段"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                人工審批 Gate
              </button>

              <button
                onClick={() => setShowFeedbackModal(true)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                title="觸發反饋回流迭代"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                閉環回流
              </button>
            </div>
          </div>
        </div>

        {/* 右側：可追溯工件（Artifacts）即時檢視與歷史版本 */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  階段可追溯工件 (Traceable Artifacts)
                </h3>
              </div>
              <div className="text-xs font-mono text-slate-400">
                本階段工件版本數: {stageArtifacts.length}
              </div>
            </div>

            {stageArtifacts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <FileText className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-300 text-sm font-medium mb-1">
                  尚無本階段之生成工件
                </p>
                <p className="text-slate-500 text-xs max-w-sm mb-4">
                  點擊左側「AI 執行本階段交付」按鈕，系統將依照三段論法與 SDLC 規範生成並留存可追溯之意圖、規格、代碼、測試報告或發布紀錄。
                </p>
                <button
                  onClick={handleExecuteStage}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium rounded-lg border border-slate-700 transition"
                >
                  立即生成工件
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {stageArtifacts.map((art, idx) => (
                  <div
                    key={art.id || idx}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex-1 flex flex-col"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded">
                          v{art.version} {art.category.toUpperCase()}
                        </span>
                        <span className="text-slate-200 font-semibold">{art.name}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(art.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono bg-slate-900/80 p-2.5 rounded border border-slate-800">
                      {art.summary}
                    </div>

                    <div className="flex-1 bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 overflow-y-auto max-h-[480px]">
                      <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                        {art.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 人工審批 Gate 彈窗 */}
      {showGateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-950 border border-emerald-500/30 rounded-xl text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  人工決策放行審核 (Human Gate Review)
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedStage.name} ({selectedStage.englishName}) → 推進至下一階段
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-amber-400">
                必要檢核要件 (Checkpoints)：
              </div>
              <ul className="space-y-1 text-slate-300">
                {currentGate?.requiredCheckpoints.map((cp, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {cp}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">審查人身分／姓名</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">放行意見與決策註記</label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowGateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleApproveGate}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                確認簽署並推進階段
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 閉環回流反饋 彈窗 */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-950 border border-amber-500/30 rounded-xl text-amber-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  觸發持續反饋驅動迭代 (Continuous Feedback Loop)
                </h3>
                <p className="text-xs text-slate-400">
                  將後續階段（如 Maintain/Test）的事故或爭點回流至前置架構階段
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">目標回流階段 (Target Stage)</label>
                <select
                  value={feedbackTargetStage}
                  onChange={(e) => setFeedbackTargetStage(e.target.value as SdlcStageId)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {SDLC_STAGES.filter(s => s.id !== '06_maintain').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.stepNumber} {s.name} ({s.englishName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">觸發回流原因 / 裁判或對造事故記錄</label>
                <textarea
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">建議規格/架構修正方針</label>
                <textarea
                  value={feedbackAdjustments}
                  onChange={(e) => setFeedbackAdjustments(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleTriggerFeedbackLoop}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                確認回流並重構該階段
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
