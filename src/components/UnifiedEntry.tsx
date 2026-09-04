import React, { useState, useRef, useCallback } from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  LegalWorkflowState,
  createInitialWorkflowState
} from '../lib/workflow/unifiedStateGraph';
import {
  loadHistory, saveToHistory, deleteFromHistory, AnalysisRecord
} from '../lib/analysisHistory';
import {
  exportAsHtml, exportAsText, printReport
} from '../lib/exportReport';
import { saveCrossFeatureContext } from '../lib/crossFeatureContext';

interface UnifiedEntryProps {
  onSelectSubTool?: (toolId: string) => void;
}

export const UnifiedEntry: React.FC<UnifiedEntryProps> = ({ onSelectSubTool }) => {
  const defaultSample = `事發於民國112年11月15日晚上約11點，在台北市信義區租屋處。我與房東因退租押金發生爭執，房東以無合理依據之清潔費為由拒絕退還新台幣5萬元押金，並威脅若再爭執將把我的私人物品丟到走廊。我有雙方簽署之房屋租賃契約書、歷次匯款房租水電之銀行明細，以及當日 LINE 對話紀錄截圖。請問我的法律權利為何？`;

  const [inputNarrative, setInputNarrative] = useState<string>(defaultSample);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [workflowState, setWorkflowState] = useState<LegalWorkflowState | null>(null);
  const [supplementInput, setSupplementInput] = useState<string>('');
  const [showDocTypeModal, setShowDocTypeModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [acknowledgeSafetyInSession, setAcknowledgeSafetyInSession] = useState<boolean>(false);

  // Batch upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // History
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<AnalysisRecord[]>(loadHistory());

  // Handle file upload (single or batch)
  const handleFiles = useCallback((files: FileList | File[]) => {
    const textFiles = Array.from(files).filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
    if (textFiles.length === 0) {
      alert('請上傳 .txt 格式的判決書文本');
      return;
    }

    const readers = textFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.readAsText(file, 'utf-8');
      });
    });

    Promise.all(readers).then(texts => {
      const validTexts = texts.filter(t => t.trim().length > 10);
      if (validTexts.length === 0) {
        alert('上傳的檔案內容過短或為空');
        return;
      }
      if (validTexts.length === 1) {
        setInputNarrative(validTexts[0]);
      } else {
        setBatchQueue(validTexts);
        setBatchIndex(0);
        setInputNarrative(validTexts[0]);
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleBatchNext = () => {
    if (batchIndex < batchQueue.length - 1) {
      const next = batchIndex + 1;
      setBatchIndex(next);
      setInputNarrative(batchQueue[next]);
      setWorkflowState(null);
    }
  };

  const handleBatchPrev = () => {
    if (batchIndex > 0) {
      const prev = batchIndex - 1;
      setBatchIndex(prev);
      setInputNarrative(batchQueue[prev]);
      setWorkflowState(null);
    }
  };

  // Save to history after analysis completes
  const saveCurrentToHistory = () => {
    if (!workflowState) return;
    const record = saveToHistory({
      inputText: workflowState.userNarrative,
      workflowState,
      title: workflowState.router?.cause || workflowState.userNarrative.slice(0, 30) + '...',
    });
    setHistoryList(loadHistory());
  };

  // Auto-save when analysis completes
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
        // Auto-save to history
        setTimeout(() => {
          saveToHistory({
            inputText: data.data.userNarrative,
            workflowState: data.data,
            title: data.data.router?.cause || data.data.userNarrative.slice(0, 30) + '...',
          });
          setHistoryList(loadHistory());
        }, 100);
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

  const handleSelectSuggestedOption = (option: string) => {
    handleSupplementFact(option);
  };

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
    setBatchQueue([]);
    setBatchIndex(0);
  };

  const handleCopyAnalysis = () => {
    if (!workflowState?.syllogism?.fullAnalysis) return;
    navigator.clipboard.writeText(workflowState.syllogism.fullAnalysis);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const loadFromHistory = (record: AnalysisRecord) => {
    setWorkflowState(record.workflowState);
    setInputNarrative(record.inputText);
    setShowHistory(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* 頂部 Header */}
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

            <div className="flex items-center gap-2">
              {/* History button */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shadow-md"
              >
                <History className="w-3.5 h-3.5" />
                <span>歷史記錄 ({historyList.length})</span>
              </button>

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
        </div>

        {/* History Panel (collapsible) */}
        {showHistory && (
          <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl max-h-64 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                分析歷史記錄
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {historyList.length === 0 ? (
              <p className="text-xs text-slate-500">尚無歷史記錄</p>
            ) : (
              historyList.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors group"
                  onClick={() => loadFromHistory(record)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{record.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                      {' · '}
                      <span className="text-indigo-400">{record.workflowState?.router?.domain || '—'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFromHistory(record.id); setHistoryList(loadHistory()); }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 狀態導航節點進度列 (StateGraph Timeline) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>文本輸入 (Entry)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.router ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Router 路由 (JSON)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.currentStep === 'QUESTIONING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : workflowState?.currentStep === 'SAFETY_PROTECTION' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : workflowState?.router?.is_complete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">3</span>
            <span>條件邊界分流</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.rag ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">4</span>
            <span>RAG 要件庫</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.syllogism ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">5</span>
            <span>三段論涵攝</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.verification ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">6</span>
            <span>真確性檢核閘門</span>
          </div>
        </div>

        {/* Batch upload bar */}
        {batchQueue.length > 1 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-amber-300">
              <FilePlus className="w-4 h-4" />
              <span className="font-bold">批量模式：第 {batchIndex + 1} / {batchQueue.length} 份</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchPrev}
                disabled={batchIndex === 0}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold border border-slate-700"
              >
                上一份
              </button>
              <button
                onClick={handleBatchNext}
                disabled={batchIndex === batchQueue.length - 1}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold border border-slate-700"
              >
                下一份
              </button>
              <button
                onClick={() => { setBatchQueue([]); setBatchIndex(0); }}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30"
              >
                結束批量
              </button>
            </div>
          </div>
        )}

        {/* 節點 1：單一入口文本輸入 + 拖曳上傳 */}
        <div
          className={`p-6 rounded-3xl bg-slate-900/90 border shadow-xl space-y-4 transition-colors ${isDragOver ? 'border-indigo-400 bg-indigo-500/5' : 'border-slate-800'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>案件事實描述 / 法律書狀初稿</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>上傳判決書</span>
              </button>
              <span className="text-xs text-slate-400">
                字數：{inputNarrative.length} 字
              </span>
            </div>
          </div>

          {/* Quick sample buttons */}
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
              onClick={() => setInputNarrative("我的同居伴侶長期對我施暴，昨天又動手毆打我致全身多處瘀傷，還在未經我同意下偷拍我的私密影像，威脅若我報警就要將影像散布到網路。我已前往醫院驗傷並取得診斷證明書，現場亦有破碎家具與血跡。")}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs transition-colors border border-rose-500/30"
            >
              範例 2：家暴與私密影像威脅（觸發安全保護節點）
            </button>
            <button
              type="button"
              onClick={() => setInputNarrative("我三年前借了朋友新台幣十萬元，當時只有口頭約定，沒有簽借條。對方一直拖延說會還，但至今分文未付且已讀不回。我手上只有銀行轉帳記錄可以證明有匯款。")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs transition-colors border border-amber-500/30"
            >
              範例 3：欠款追討（觸發追問節點）
            </button>
            <button
              type="button"
              onClick={() => setInputNarrative("上週騎機車行經台北市忠孝東路與復興南路口時收到一張闖紅燈罰單，但我確定當時是綠燈才通過。我有行車記錄器畫面可以佐證，路口也有監視器。希望針對這張罰單提出異議。")}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs transition-colors border border-emerald-500/30"
            >
              範例 4：交通罰單異議（行政爭訟）
            </button>
          </div>

          <textarea
            value={inputNarrative}
            onChange={(e) => setInputNarrative(e.target.value)}
            disabled={isSubmitting}
            placeholder="請以平鋪直敘方式輸入案發經過（人、事、時、地、已持有或未持有的客觀佐證資料）...&#10;&#10;或拖曳 .txt 判決書檔案到此區域上傳"
            rows={5}
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed placeholder:text-slate-600 disabled:opacity-50"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>支援直接輸入口語事實，或拖曳上傳多份 .txt 判決書</span>
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
                <span className={`text-sm font-bold ${workflowState.router.is_sensitive ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {workflowState.router.is_sensitive ? '⚠ 敏感' : '✓ 一般'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">事實完整度評估 (completeness)</span>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${(workflowState.router.completeness || 0) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">{Math.round((workflowState.router.completeness || 0) * 100)}%</span>
            </div>
          </div>
        )}

        {/* Safety Protection Node */}
        {workflowState?.currentStep === 'SAFETY_PROTECTION' && !acknowledgeSafetyInSession && (
          <div className="p-6 rounded-3xl bg-rose-950/40 border border-rose-500/40 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              <h2 className="text-lg font-bold text-rose-200">安全保護節點觸發</h2>
            </div>
            <p className="text-sm text-rose-200/80 leading-relaxed">
              您的案件涉及敏感法律領域（家庭暴力、性侵、自殺等），系統將啟動安全保護機制。
              分析結果將附帶心理健康資源資訊，並優先建議尋求專業協助。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleProceedFromSafety}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
              >
                我已了解，繼續分析
              </button>
              <button
                onClick={handleResetWorkflow}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-700 transition-colors"
              >
                重新輸入
              </button>
            </div>
          </div>
        )}

        {/* Questioning Node */}
        {workflowState?.currentStep === 'QUESTIONING' && workflowState.questioning && (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-200">動態追問節點</h2>
            </div>
            <p className="text-sm text-amber-200/80">{workflowState.questioning.question}</p>

            <div className="flex flex-wrap gap-2">
              {workflowState.questioning.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSuggestedOption(opt)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-500/40 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                value={supplementInput}
                onChange={(e) => setSupplementInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSupplementFact(); }}
                placeholder="或自行輸入補充事實..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={() => handleSupplementFact()}
                disabled={!supplementInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
              >
                送出補充
              </button>
            </div>
          </div>
        )}

        {/* RAG Results */}
        {workflowState?.rag && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">節點 4：RAG 要件庫檢索結果</h2>
            </div>
            <div className="space-y-3">
              {workflowState.rag.statutes?.map((statute, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <p className="text-sm font-bold text-indigo-300">{statute.title}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{statute.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Syllogism Analysis + Export buttons */}
        {workflowState?.syllogism && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">節點 5：三段論涵攝分析</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? '已複製' : '複製分析'}</span>
                </button>
                <button
                  onClick={() => exportAsHtml(workflowState)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯出 HTML</span>
                </button>
                <button
                  onClick={() => exportAsText(workflowState)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯出 TXT</span>
                </button>
                <button
                  onClick={() => printReport(workflowState)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>列印</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {workflowState.syllogism.fullAnalysis}
              </p>
            </div>
          </div>
        )}

        {/* Verification Gate */}
        {workflowState?.verification && (
          <div className={`p-6 rounded-3xl border shadow-xl space-y-3 ${workflowState.verification.gate_passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-3">
              {workflowState.verification.gate_passed ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              )}
              <h2 className="text-lg font-bold text-white">節點 6：真確性檢核閘門</h2>
            </div>
            <p className="text-sm text-slate-300">{workflowState.verification.notes}</p>
          </div>
        )}
        {/* Cross-feature navigation bar */}
        {onSelectSubTool && workflowState?.verification?.gate_passed && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-slate-400 font-semibold">還需要：</span>
            <button
              onClick={() => onSelectSubTool('guide')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              生活情境導診
            </button>
            <button
              onClick={() => onSelectSubTool('legalToolbox')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              法律工具箱
            </button>
          </div>
        )}

        {/* Quick action buttons — jump to document generation or guide */}
        {onSelectSubTool && workflowState?.verification?.gate_passed && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setShowDocTypeModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              生成對應文書
            </button>
            <button
              onClick={() => {
                saveCrossFeatureContext({
                  scenarioKeywords: workflowState?.router?.cause || '',
                  domain: workflowState?.router?.domain,
                  cause: workflowState?.router?.cause,
                  sourceTool: 'unified'
                });
                onSelectSubTool('guide');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              獲取後續導診建議
            </button>
          </div>
        )}

        {/* Document Type Selection Modal */}
        {showDocTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[380px] shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">選擇文書類型</h3>
              <p className="text-xs text-slate-400">根據您的案件類型，推薦以下文書：</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowDocTypeModal(false);
                    saveCrossFeatureContext({
                      documentType: 'appeal',
                      partyName: workflowState?.router?.cause || '',
                      scenarioKeywords: workflowState?.router?.cause || '',
                      domain: workflowState?.router?.domain,
                      cause: workflowState?.router?.cause,
                      sourceTool: 'unified'
                    });
                    onSelectSubTool?.('legalToolbox');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <div className="font-bold text-sm text-white">上訴狀</div>
                  <div className="text-xs text-slate-400 mt-1">不服地方法院判決，向上級法院提起上訴</div>
                </button>
                <button
                  onClick={() => {
                    setShowDocTypeModal(false);
                    saveCrossFeatureContext({
                      documentType: 'demand_letter',
                      partyName: workflowState?.router?.cause || '',
                      scenarioKeywords: workflowState?.router?.cause || '',
                      domain: workflowState?.router?.domain,
                      cause: workflowState?.router?.cause,
                      sourceTool: 'unified'
                    });
                    onSelectSubTool?.('legalToolbox');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <div className="font-bold text-sm text-white">存證信函</div>
                  <div className="text-xs text-slate-400 mt-1">以正式書面通知對方，留存法律證據</div>
                </button>
              </div>
              <button
                onClick={() => setShowDocTypeModal(false)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 py-1 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UnifiedEntry;
