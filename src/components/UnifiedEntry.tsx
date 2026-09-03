import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  FileCheck2,
  FileText,
  RotateCcw,
  Copy,
  Check,
  PhoneCall,
  Loader2,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Clock,
  BookOpen,
  Scale
} from 'lucide-react';
import {
  LegalWorkflowState,
  createInitialWorkflowState
} from '../lib/workflow/unifiedStateGraph';

interface UnifiedEntryProps {
  onSelectSubTool?: (toolId: string) => void;
}

export const UnifiedEntry: React.FC<UnifiedEntryProps> = () => {
  const defaultSample = `事發於民國112年11月15日晚上約11點，在台北市信義區租屋處。我與房東因退租押金發生爭執，房東以無合理依據之清潔費為由拒絕退還新台幣5萬元押金，並威脅若再爭執將把我的私人物品丟到走廊。我有雙方簽署之房屋租賃契約書、歷次匯款房租水電之銀行明細，以及當日 LINE 對話紀錄截圖。請問我的法律權利為何？`;

  const [inputNarrative, setInputNarrative] = useState<string>(defaultSample);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [workflowState, setWorkflowState] = useState<LegalWorkflowState | null>(null);
  const [supplementInput, setSupplementInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [acknowledgeSafetyInSession, setAcknowledgeSafetyInSession] = useState<boolean>(false);

  // 執行統一工作流入口 (POST /api/workflow/execute)
  const handleExecuteWorkflow = async (textToRun?: string, safetyAck?: boolean) => {
    const text = (textToRun !== undefined ? textToRun : inputNarrative).trim();
    if (!text) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: text,
          stateId: workflowState?.id,
          acknowledgeSafety: safetyAck ?? acknowledgeSafetyInSession
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setWorkflowState(data.data);
      } else {
        alert(data.error || '工作流執行失敗，請檢查輸入');
      }
    } catch (err: any) {
      console.error('[UnifiedEntry] 執行工作流網路錯誤:', err);
      alert('連線失敗，請稍候再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理動態追問之補充事實送出 (POST /api/workflow/supplement)
  const handleSupplementFact = async (supplementText?: string) => {
    const supplement = (supplementText !== undefined ? supplementText : supplementInput).trim();
    if (!supplement || !workflowState) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workflow/supplement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingNarrative: workflowState.userNarrative,
          supplementText: supplement,
          acknowledgeSafety: true
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setWorkflowState(data.data);
        setInputNarrative(data.data.userNarrative);
        setSupplementInput('');
      } else {
        alert(data.error || '補充事實處理失敗');
      }
    } catch (err: any) {
      console.error('[UnifiedEntry] 補充事實連線錯誤:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 點選追問選項按鈕，自動追加送出
  const handleSelectSuggestedOption = (option: string) => {
    handleSupplementFact(option);
  };

  // 略過或確認安全引導，繼續進行後續實體法律分析
  const handleProceedFromSafety = () => {
    setAcknowledgeSafetyInSession(true);
    if (workflowState) {
      handleExecuteWorkflow(workflowState.userNarrative, true);
    }
  };

  const handleResetWorkflow = () => {
    setWorkflowState(null);
    setInputNarrative(defaultSample);
    setSupplementInput('');
    setAcknowledgeSafetyInSession(false);
  };

  const handleCopyAnalysis = () => {
    if (!workflowState?.syllogism?.fullAnalysis) return;
    navigator.clipboard.writeText(workflowState.syllogism.fullAnalysis);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* 頂部 Header：統一入口說明 */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Layers className="w-48 h-48 text-indigo-400" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold tracking-wide">
                <Cpu className="w-3.5 h-3.5" />
                <span>統一入口自動化工作流 · Unified StateGraph</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                智慧法律統一分析工作台
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                廢除分散工具跳轉，以單一入口接收文本。由 StateGraph 自動導航執行：
                <span className="text-indigo-300 font-semibold"> Router 分流 ➔ 缺件追問 / 安全保護 ➔ RAG 要件檢索 ➔ 三段論涵攝 ➔ 防偽真確性閘門</span>。
              </p>
            </div>

            {workflowState && (
              <button
                type="button"
                onClick={handleResetWorkflow}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>開立新案件分析</span>
              </button>
            )}
          </div>
        </div>

        {/* 狀態導航節點進度列 (StateGraph Timeline) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
            workflowState ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>文本輸入 (Entry)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
            workflowState?.router ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Router 路由 (JSON)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
            workflowState?.currentStep === 'QUESTIONING' 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : workflowState?.currentStep === 'SAFETY_PROTECTION'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              : workflowState?.router?.is_complete
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">3</span>
            <span>條件邊界分流</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
            workflowState?.rag ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">4</span>
            <span>RAG 要件庫</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
            workflowState?.syllogism ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">5</span>
            <span>三段論涵攝</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
            workflowState?.verification ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">6</span>
            <span>真確性檢核閘門</span>
          </div>
        </div>

        {/* 節點 1：單一入口文本輸入 (UnifiedEntry) */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>案件事實描述 / 法律書狀初稿</span>
            </label>
            <span className="text-xs text-slate-400">
              字數：{inputNarrative.length} 字
            </span>
          </div>

          {/* 快捷情境快速填入按鈕 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">快速載入測試：</span>
            <button
              type="button"
              onClick={() => setInputNarrative(defaultSample)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
            >
              範例 1：租賃押金（完整事實）
            </button>
            <button
              type="button"
              onClick={() => setInputNarrative("我借了朋友一筆錢，結果現在到期了對方都不還我，還封鎖我。")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs transition-colors border border-amber-500/30"
            >
              範例 2：欠款爭議（觸發追問節點）
            </button>
            <button
              type="button"
              onClick={() => setInputNarrative("昨晚在住處前夫動手毆打我，搶走手機並威脅要散布私密照片，我非常害怕。")}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs transition-colors border border-rose-500/30"
            >
              範例 3：家庭暴力與私密影像（觸發安全保護節點）
            </button>
          </div>

          <textarea
            value={inputNarrative}
            onChange={(e) => setInputNarrative(e.target.value)}
            disabled={isSubmitting}
            placeholder="請以平鋪直敘方式輸入案發經過（人、事、時、地、已持有或未持有的客觀佐證資料）..."
            rows={5}
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed placeholder:text-slate-600 disabled:opacity-50"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>支援直接輸入口語事實，系統將自動啟動 StateGraph 進行要件剖析</span>
            </div>

            <button
              type="button"
              onClick={() => handleExecuteWorkflow()}
              disabled={!inputNarrative.trim() || isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white text-sm font-bold shadow-lg shadow-indigo-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>StateGraph 工作流推進中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>啟動統一工作流分析</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 節點 2：RouterNode 輸出卡片 */}
        {workflowState?.router && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">節點 2：RouterNode 結構化分流結果</h2>
                  <p className="text-xs text-slate-400">強制產出標準化分流標籤與事實完整度旗標</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 text-indigo-300 border border-slate-800">
                JSON Standard
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">法律領域 (domain)</span>
                <span className="text-sm font-bold text-indigo-300">{workflowState.router.domain}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">罪章/專節 (chapter)</span>
                <span className="text-sm font-bold text-white truncate block">{workflowState.router.chapter}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">案由罪名 (cause)</span>
                <span className="text-sm font-bold text-amber-300 truncate block">{workflowState.router.cause}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">敏感保護 (is_sensitive)</span>
                <span className={`text-sm font-bold ${
                  workflowState.router.is_sensitive ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {workflowState.router.is_sensitive ? '⚠️ 啟動保護分流' : '一般爭議事件'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-semibold">事實完整度 (is_complete)：</span>
                {workflowState.router.is_complete ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    完整充足 (true)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    缺少要素 (false)
                  </span>
                )}
              </div>

              {!workflowState.router.is_complete && (
                <span className="text-amber-400 font-medium">已觸發條件邊界 ➔ 導向 QuestioningNode</span>
              )}
            </div>
          </div>
        )}

        {/* 條件邊界 1：敏感案件保護路徑 (SafetyProtectionNode) */}
        {workflowState?.currentStep === 'SAFETY_PROTECTION' && workflowState.safety && (
          <div className="p-6 rounded-3xl bg-rose-950/40 border border-rose-500/50 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">
                  保護路徑：緊急人身安全與證據保全指引 (Safety Protection Node)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40">
                優先處置
              </span>
            </div>

            <p className="text-xs text-rose-200 leading-relaxed">
              偵測到您的案情涉及家庭暴力、性侵害或人身安全威脅。法律程序固然重要，但您與家人的人身安全永遠是第一要務。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {workflowState.safety.emergencyHotlines.map((h, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-900/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{h.label}</span>
                    <a href={`tel:${h.number}`} className="flex items-center gap-1 text-sm font-black text-rose-400 hover:text-rose-300">
                      <PhoneCall className="w-3.5 h-3.5" />
                      {h.number}
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{h.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-rose-900/40 text-xs space-y-2">
              <span className="font-bold text-rose-300 block">⚠️ 關鍵 72 小時證據保全清單：</span>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                {workflowState.safety.preservationTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleProceedFromSafety}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>我已確保自身安全，繼續實體法律分析</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 條件邊界 2：QuestioningNode 動態追問補正 */}
        {workflowState?.currentStep === 'QUESTIONING' && workflowState.questioning && (
          <div className="p-6 rounded-3xl bg-amber-950/30 border border-amber-500/40 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-amber-400">
              <HelpCircle className="w-5 h-5" />
              <div>
                <h3 className="text-base font-bold text-white">
                  節點 3：動態追問與事實要件補全 (QuestioningNode)
                </h3>
                <p className="text-xs text-amber-200/70">缺少足以定罪或成案之客觀要素，請撥冗補充</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {workflowState.questioning.rawMessage}
            </div>

            {workflowState.questioning.suggestedOptions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  點選快捷補充選項（點擊將自動作為事實追加）：
                </span>
                <div className="flex flex-wrap gap-2">
                  {workflowState.questioning.suggestedOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestedOption(opt)}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-400 text-amber-200 hover:text-slate-950 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>＋</span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <input
                type="text"
                value={supplementInput}
                onChange={(e) => setSupplementInput(e.target.value)}
                placeholder="或自訂輸入補充（例如：對方是同居伴侶、已於11月16日至和平醫院開立驗傷單）..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => handleSupplementFact()}
                disabled={!supplementInput.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>補充事實並重評</span>
              </button>
            </div>
          </div>
        )}

        {/* 節點 4：RAGNode 檢索構成要件展示 */}
        {workflowState?.rag && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400">
                <BookOpen className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">節點 4：RAGNode 動態法律構成要件庫注入</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                依案由「{workflowState.router?.cause}」檢索
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed">
              {workflowState.rag.legalElements}
            </div>
          </div>
        )}

        {/* 節點 5：SyllogismNode 三段論涵攝引擎 */}
        {workflowState?.syllogism && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">節點 5：SyllogismNode 三段論涵攝分析</h3>
                  <p className="text-xs text-slate-400">嚴格依據大前提構成要件與小前提事實進行比對</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyAnalysis}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">已複製分析</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>複製報告</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {workflowState.syllogism.fullAnalysis}
            </div>
          </div>
        )}

        {/* 節點 6：VerificationGateNode (合併 External Document Checker) */}
        {workflowState?.verification && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      節點 6：External Document Checker 真確性檢核閘門
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      workflowState.verification.passGate
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {workflowState.verification.passGate ? '✓ 檢核閘門通過' : '⚠️ 存在疑義法條'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    自動合併防幽靈假法條驗證與外部裁判字號真實性交叉核對
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">檢驗法規數：</span>
                <span className="font-bold text-white">{workflowState.verification.totalChecked}</span>
                <span className="text-slate-400 ml-2">疑義數：</span>
                <span className={`font-bold ${workflowState.verification.ghostCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {workflowState.verification.ghostCount}
                </span>
              </div>
            </div>

            {/* 警告標語或綠色通行證 */}
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              workflowState.verification.passGate
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
            }`}>
              {workflowState.verification.passGate ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{workflowState.verification.warningNotice}</span>
            </div>

            {/* 查驗細節清單 */}
            {workflowState.verification.results.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">引用法條查驗結果：</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {workflowState.verification.results.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300">{item.citation}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          item.status === 'VERIFIED_REAL'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {item.status === 'VERIFIED_REAL' ? '真實法條' : '疑義法條'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
