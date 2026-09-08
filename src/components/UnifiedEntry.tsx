import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark
} from 'lucide-react';
import {
  LegalWorkflowState,
  createInitialWorkflowState
} from '../lib/workflow/unifiedStateGraph';
import {
  loadHistory, saveToHistory, deleteFromHistory, clearHistory, AnalysisRecord
} from '../lib/analysisHistory';
import {
  exportAsHtml, exportAsText, printReport
} from '../lib/exportReport';
import {
  formatLegalChapter,
  formatVerificationStatus
} from '../lib/legalChapterLabels';
import { saveCrossFeatureContext } from '../lib/crossFeatureContext';
import { useToolContext } from '../contexts/ToolContext';
import { fetchWithAuth } from '../lib/apiClient';
import { extractPdfText } from '../lib/pdfUtils';

interface CustomPresetCase {
  title: string;
  narrative: string;
}

const CUSTOM_PRESET_STORAGE_KEY = 'smart_legal_user_custom_preset';

const DEFAULT_CUSTOM_PRESET: CustomPresetCase = {
  title: '自訂案例：裝潢工程瑕疵扣款與給付尾款爭議',
  narrative: `我去年委託室內裝潢公司裝修住宅，總工程款新台幣120萬元，約定分四期付款，我已如期給付前三期款項共90萬元。完工驗收時我發現客廳天花板嚴重龜裂、木地板受潮突起，且浴室防水層施作瑕疵致使樓下天花板滲水。建築師公會鑑定修復費用需35萬元。我以存證信函催告對方修補，對方置之不理，反而向法院聲請發支付命令向我索討第四期尾款30萬元。請問我能否依法主張瑕疵擔保修補費用抵銷尾款，並請求賠償樓下住戶之損失？`
};

function loadCustomPreset(): CustomPresetCase {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY);
    if (!raw) return DEFAULT_CUSTOM_PRESET;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.title === 'string' && typeof parsed.narrative === 'string') {
      return parsed;
    }
    return DEFAULT_CUSTOM_PRESET;
  } catch {
    return DEFAULT_CUSTOM_PRESET;
  }
}

export const UnifiedEntry: React.FC = () => {
  const { handleSelectTool } = useToolContext();
  const defaultSample = `事發於民國112年11月15日晚上約11點，在台北市信義區租屋處。我與房東因退租押金發生爭執，房東以無合理依據之清潔費為由拒絕退還新台幣5萬元押金，並威脅若再爭執將把我的私人物品丟到走廊。我有雙方簽署之房屋租賃契約書、歷次匯款房租水電之銀行明細，以及當日 LINE 對話紀錄截圖。請問我的法律權利為何？`;

  const [inputNarrative, setInputNarrative] = useState<string>(defaultSample);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [workflowState, setWorkflowState] = useState<LegalWorkflowState | null>(null);
  const [supplementInput, setSupplementInput] = useState<string>('');
  const [showDocTypeModal, setShowDocTypeModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [acknowledgeSafetyInSession, setAcknowledgeSafetyInSession] = useState<boolean>(false);

  // 折疊手風琴卡片狀態（依用戶要求：預設全部收起資料，避免版面雜亂）
  const [isNode2Open, setIsNode2Open] = useState<boolean>(false);
  const [isNode4Open, setIsNode4Open] = useState<boolean>(false);
  const [isNode5Open, setIsNode5Open] = useState<boolean>(false);
  const [isNode6Open, setIsNode6Open] = useState<boolean>(false);

  // 使用者自訂預設案例（非系統預置）
  const [customPreset, setCustomPreset] = useState<CustomPresetCase>(loadCustomPreset);
  const [showCustomPresetModal, setShowCustomPresetModal] = useState<boolean>(false);
  const [editPresetTitle, setEditPresetTitle] = useState<string>('');
  const [editPresetNarrative, setEditPresetNarrative] = useState<string>('');

  // 一鍵展開/收起所有節點
  const handleToggleAllNodes = (open: boolean) => {
    setIsNode2Open(open);
    setIsNode4Open(open);
    setIsNode5Open(open);
    setIsNode6Open(open);
  };

  // 儲存自訂預設案例
  const handleSaveCustomPreset = (title: string, narrative: string) => {
    const updated: CustomPresetCase = {
      title: title.trim() || '我的自訂案例',
      narrative: narrative.trim()
    };
    setCustomPreset(updated);
    try {
      localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('無法儲存自訂預設案例至 localStorage:', e);
    }
    setShowCustomPresetModal(false);
  };

  // 將當前文字框內容設為自訂案例
  const handleSaveCurrentAsCustomPreset = () => {
    if (!inputNarrative.trim()) {
      alert('請先在輸入框內輸入案件事實內容');
      return;
    }
    const title = prompt('請輸入自訂預設案例名稱：', customPreset.title || '我的自訂案例');
    if (title !== null) {
      handleSaveCustomPreset(title || '我的自訂案例', inputNarrative);
    }
  };

  // Batch & file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isParsingFiles, setIsParsingFiles] = useState<boolean>(false);
  const [parsingStatus, setParsingStatus] = useState<string | null>(null);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // History
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<AnalysisRecord[]>(loadHistory());

  // Handle file upload (single or batch, supporting Judicial Yuan .pdf and .txt)
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.txt') || f.type === 'application/pdf' || f.type === 'text/plain';
    });

    if (validFiles.length === 0) {
      alert('請上傳司法院裁判書 PDF 檔案（.pdf）或文字檔案（.txt）');
      return;
    }

    setIsParsingFiles(true);
    setParsingStatus(`正在讀取與解析 ${validFiles.length} 份裁判書...`);

    try {
      const parsedTexts: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        setParsingStatus(`正在解析裁判書 (${i + 1}/${validFiles.length})：${file.name}`);

        let content = '';
        if (isPdf) {
          content = await extractPdfText(file);
        } else {
          content = await file.text();
        }

        const trimmed = content.trim();
        if (trimmed.length > 10) {
          parsedTexts.push(trimmed);
        }
      }

      if (parsedTexts.length === 0) {
        alert('上傳的裁判書檔案內容為空或無法提取文字（若為掃描式 PDF 請確認文字圖層）');
        return;
      }

      if (parsedTexts.length === 1) {
        setInputNarrative(parsedTexts[0]);
      } else {
        setBatchQueue(parsedTexts);
        setBatchIndex(0);
        setInputNarrative(parsedTexts[0]);
      }
    } catch (err) {
      console.error('[UnifiedEntry] 裁判書解析異常:', err);
      alert('解析裁判書檔案時發生錯誤，請確認檔案未損毀或受密碼保護');
    } finally {
      setIsParsingFiles(false);
      setParsingStatus(null);
    }
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
      const res = await fetchWithAuth('/api/workflow/execute', {
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
      const res = await fetchWithAuth('/api/workflow/supplement', {
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
                <span>統一入口自動化工作流 · 全流程狀態圖導航</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                智慧法律統一分析工作台
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                廢除分散工具跳轉，以單一入口接收文本。由狀態機自動導航執行：
                <span className="text-indigo-300 font-semibold"> 智慧分流 ➔ 缺件追問 / 安全保護 ➔ 法規要件檢索 ➔ 三段論涵攝 ➔ 防偽真確性閘門</span>。
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
          <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl max-h-72 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>分析歷史記錄 ({historyList.length})</span>
                </h3>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('確定要清空所有歷史記錄嗎？')) {
                        clearHistory();
                        setHistoryList([]);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清空全部</span>
                  </button>
                )}
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {historyList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">尚無歷史記錄</p>
            ) : (
              historyList.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors group"
                  onClick={() => loadFromHistory(record)}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-semibold text-slate-200 truncate">{record.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                      {' · '}
                      <span className="text-indigo-400">{record.workflowState?.router?.domain || '—'}</span>
                      {record.workflowState?.router?.chapter && (
                        <span className="text-slate-500"> · {formatLegalChapter(record.workflowState.router.chapter)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFromHistory(record.id);
                        setHistoryList(loadHistory());
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                      title="刪除此筆記錄"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>刪除</span>
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
            <span>文本輸入</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.router ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">2</span>
            <span>智慧分流</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.currentStep === 'QUESTIONING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : workflowState?.currentStep === 'SAFETY_PROTECTION' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : workflowState?.router?.is_complete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">3</span>
            <span>條件邊界分流</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.rag ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">4</span>
            <span>法規裁判要件庫</span>
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
                accept=".pdf,.txt,application/pdf,text/plain"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingFiles || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                {isParsingFiles ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>解析 PDF 中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>上傳裁判書 (PDF/TXT)</span>
                  </>
                )}
              </button>
              <span className="text-xs text-slate-400">
                字數：{inputNarrative.length} 字
              </span>
            </div>
          </div>

          {/* PDF / File Parsing Indicator */}
          {isParsingFiles && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3 text-xs text-indigo-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
              <span>{parsingStatus || '正在解析司法院裁判書 PDF 內容，請稍候...'}</span>
            </div>
          )}

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
            <button
              type="button"
              onClick={() => setInputNarrative("我上個月在蝦皮買了一台二手筆電，賣家在私訊裡保證全機功能正常、電池健康度90%，結果收到當天開機不到十分鐘就自動斷電，螢幕還有一條明顯綠線。我傳LINE要求退貨退款，他直接封鎖我，去賣場檢舉也沒用，我轉帳了兩萬八千元，有銀行交易截圖跟聊天對話截圖，我現在該怎麼告他詐欺或要回錢？")}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs transition-colors border border-indigo-500/30"
            >
              範例 5：網購交易糾紛（口語事實直接輸入）
            </button>

            {/* 使用者自訂預設案例（非系統預置，點擊即可載入） */}
            <div className="inline-flex items-center gap-1 pl-1 border-l border-slate-700/60 my-0.5">
              <button
                type="button"
                onClick={() => setInputNarrative(customPreset.narrative)}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-amber-500/25 hover:from-amber-500/35 hover:to-orange-500/35 text-amber-200 text-xs font-bold transition-all border border-amber-500/40 shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="點擊載入此預設案例（非系統預置）"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40 shrink-0" />
                <span className="truncate max-w-[200px]">{customPreset.title}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditPresetTitle(customPreset.title);
                  setEditPresetNarrative(customPreset.narrative);
                  setShowCustomPresetModal(true);
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
                title="編輯自訂預設案例"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsCustomPreset}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] border border-slate-700 transition-colors"
                title="將目前輸入框內容存為自訂預設案例"
              >
                設為自訂
              </button>
            </div>
          </div>

          <textarea
            value={inputNarrative}
            onChange={(e) => setInputNarrative(e.target.value)}
            disabled={isSubmitting || isParsingFiles}
            placeholder="請以平鋪直敘方式直接輸入口語事實或案發經過（例如：我上個月在租屋處退租時房東扣住五萬元押金不還，說要收清潔費但沒收據...）&#10;&#10;亦可點選右上角按鈕或直接拖曳上傳司法院裁判書 PDF 檔（.pdf）或文字檔（.txt），支援多份判決書批次載入分析。"
            rows={5}
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed placeholder:text-slate-600 disabled:opacity-50"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>支援直接輸入口語事實（AI 自動提煉法律爭點），或拖曳上傳多份司法院裁判書（.pdf 與 .txt 格式）</span>
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

        {/* 案件分析概要與收合控制列（依用戶指示：預設收起各節點詳細內容，避免雜亂） */}
        {workflowState?.router && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold">分析簡報：</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                領域：{workflowState.router.domain}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold max-w-xs truncate">
                罪章：{formatLegalChapter(workflowState.router.chapter)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold max-w-xs truncate">
                案由：{workflowState.router.cause}
              </span>
              {workflowState.verification && (
                <span className={`px-2.5 py-1 rounded-lg border font-bold ${workflowState.verification.passGate ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {workflowState.verification.passGate ? '✓ 真確性檢核通過' : '⚠ 待人工法學審核'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500 hidden md:inline">預設已收起詳細資料</span>
              <button
                type="button"
                onClick={() => handleToggleAllNodes(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                全部展開
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllNodes(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                全部收起
              </button>
            </div>
          </div>
        )}

        {/* 節點 2：智慧分流結構化結果 (預設收起，可點擊展開) */}
        {workflowState?.router && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-4 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode2Open(prev => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 2：智慧分流結構化結果</span>
                    {!isNode2Open && (
                      <span className="text-xs font-normal text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 hidden sm:inline">
                        {workflowState.router.domain} · {formatLegalChapter(workflowState.router.chapter)}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">標準化法律分流標籤與事實完整度評估</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {isNode2Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode2Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode2Open && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">法律領域</span>
                    <span className="text-sm font-bold text-indigo-300">{workflowState.router.domain}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">罪章/實體法專節</span>
                    <span className="text-sm font-bold text-white truncate block" title={formatLegalChapter(workflowState.router.chapter)}>
                      {formatLegalChapter(workflowState.router.chapter)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">案由爭點</span>
                    <span className="text-sm font-bold text-amber-300 truncate block">{workflowState.router.cause}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">敏感案件保護</span>
                    <span className={`text-sm font-bold ${workflowState.router.is_sensitive ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {workflowState.router.is_sensitive ? '⚠ 敏感' : '✓ 一般'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">事實完整度評估</span>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          (typeof workflowState.router.completeness === 'number'
                            ? workflowState.router.completeness
                            : workflowState.router.is_complete ? 1 : 0.6) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {Math.round(
                      (typeof workflowState.router.completeness === 'number'
                        ? workflowState.router.completeness
                        : workflowState.router.is_complete ? 1 : 0.6) * 100
                    )}%
                  </span>
                </div>
              </div>
            )}
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
        {workflowState?.questioning && !workflowState?.router?.is_complete && (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-200">動態追問節點</h2>
            </div>
            <p className="text-sm text-amber-200/80">{workflowState.questioning.rawMessage}</p>

            <div className="flex flex-wrap gap-2">
              {workflowState.questioning.suggestedOptions?.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSuggestedOption(opt)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* 節點 4：法規與裁判要件檢索庫 (預設收起，可點擊展開) */}
        {workflowState?.rag && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode4Open(prev => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 4：法規與裁判要件庫檢索</span>
                    {!isNode4Open && (
                      <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md hidden sm:inline">
                        法規 {workflowState.rag.statuteCitations?.length || 0} 筆 · 判例 {workflowState.rag.precedents?.length || 0} 筆
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">智慧法條要件對照與實務裁判先例</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {isNode4Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode4Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode4Open && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{workflowState.rag.legalElements}</p>
                {workflowState.rag.statuteCitations?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {workflowState.rag.statuteCitations.map((citation, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">{citation}</span>
                    ))}
                  </div>
                )}
                {workflowState.rag.precedents?.length > 0 && (
                  <div className="space-y-2">
                    {workflowState.rag.precedents.map((precedent, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="text-xs font-bold text-sky-300">{precedent.caseNumber} · {precedent.courtName}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{precedent.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
                {workflowState.rag.officialEvidence?.length > 0 && (
                  <div className="space-y-1 border-t border-slate-800 pt-3">
                    <p className="text-xs font-bold text-indigo-300">官方查證紀錄</p>
                    {workflowState.rag.officialEvidence.map((item, i) => (
                      <p key={i} className="text-xs text-slate-400">
                        {item.citation} · {item.status} · {item.source} · {new Date(item.checkedAt).toLocaleString()}
                        {item.sourceUrl && <> · <a className="text-sky-400 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">來源</a></>}
                      </p>
                    ))}
                  </div>
                )}
                {(!workflowState.rag.officialEvidence || workflowState.rag.officialEvidence.length === 0) && (
                  <p className="text-xs text-amber-300 border-t border-slate-800 pt-3">官方查證：無可查證引用或尚未取得官方結果（待法學審核）</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 節點 5：三段論涵攝法學分析 (預設收起，可點擊展開) */}
        {workflowState?.syllogism && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-4 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode5Open(prev => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 5：三段論涵攝法學分析</span>
                  </h2>
                  <p className="text-xs text-slate-400">大前提法規要件 ➔ 小前提事實涵攝 ➔ 結論請求權主張</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleCopyAnalysis}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? '已複製' : '複製'}</span>
                  </button>
                  <button
                    onClick={() => exportAsHtml(workflowState)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>HTML</span>
                  </button>
                  <button
                    onClick={() => exportAsText(workflowState)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>
                  <button
                    onClick={() => printReport(workflowState)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>列印</span>
                  </button>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {isNode5Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode5Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode5Open && (
              <div className="pt-3 border-t border-slate-800">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {workflowState.syllogism.fullAnalysis}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 節點 6：真確性檢核閘門 (預設收起，可點擊展開) */}
        {workflowState?.verification && (
          <div className={`p-5 rounded-3xl border shadow-xl space-y-3 transition-all ${workflowState.verification.passGate ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode6Open(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                {workflowState.verification.passGate ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                )}
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 6：真確性檢核閘門</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${workflowState.verification.passGate ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {workflowState.verification.passGate ? '✓ 檢核通過' : '⚠ 待人工法學審核'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    查核 {workflowState.verification.totalChecked} 處 · 幽靈法條 {workflowState.verification.ghostCount} 處
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {isNode6Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode6Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode6Open && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <p className="text-sm text-slate-300">{workflowState.verification.warningNotice || `檢核狀態：${formatVerificationStatus(workflowState.verification.verificationStatus)}`}</p>
                <p className="text-xs text-slate-400">狀態：{formatVerificationStatus(workflowState.verification.verificationStatus)} · 查核 {workflowState.verification.totalChecked} 處 · 幽靈法條 {workflowState.verification.ghostCount} 處</p>
                {workflowState.verification.officialEvidence?.length > 0 && (
                  <div className="space-y-1 border-t border-slate-800 pt-3">
                    <p className="text-xs font-bold text-slate-200">逐筆官方證據</p>
                    {workflowState.verification.officialEvidence.map((item, i) => (
                      <p key={i} className="text-xs text-slate-400">
                        {item.citation} · {item.status} · {new Date(item.checkedAt).toLocaleString()} · <a className="text-sky-400 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a>
                      </p>
                    ))}
                  </div>
                )}
                {(!workflowState.verification.officialEvidence || workflowState.verification.officialEvidence.length === 0) && (
                  <p className="text-xs text-amber-300">逐筆官方證據：無可查證引用（待法學審核）</p>
                )}
              </div>
            )}
          </div>
        )}
        {/* Cross-feature navigation bar */}
        {workflowState?.verification?.passGate && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-slate-400 font-semibold">還需要：</span>
            <button
              onClick={() => handleSelectTool('guide')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              生活情境導診
            </button>
            <button
              onClick={() => handleSelectTool('litigation')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              訴訟與書狀工作台
            </button>
          </div>
        )}

        {/* Quick action buttons — jump to document generation or guide */}
        {workflowState?.verification?.passGate && (
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
                handleSelectTool('guide');
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
                    handleSelectTool('litigation', undefined, { initialTab: 'appeal' });
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
                    handleSelectTool('litigation', undefined, { initialTab: 'toolbox', preselectedToolId: 'CIVIL_DEMAND_LETTER_GENERAL' });
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

        {/* Custom Preset Case Modal */}
        {showCustomPresetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Star className="w-5 h-5 fill-amber-400/40" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">自訂預設案例設定</h3>
                    <p className="text-xs text-slate-400">設定您的專屬自訂案例，點擊按鈕即可一鍵填入（非系統預置）</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomPresetModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    案例名稱 / 按鈕標籤
                  </label>
                  <input
                    type="text"
                    value={editPresetTitle}
                    onChange={(e) => setEditPresetTitle(e.target.value)}
                    placeholder="例如：自訂案例：車禍損害賠償"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    口語事實與案情內容
                  </label>
                  <textarea
                    rows={7}
                    value={editPresetNarrative}
                    onChange={(e) => setEditPresetNarrative(e.target.value)}
                    placeholder="請輸入欲測試的具體口語事實或案情敘述..."
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed placeholder:text-slate-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    字數：{editPresetNarrative.length} 字 · 資料保存在您的本機瀏覽器，重新整理頁面依然保留。
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomPresetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCustomPreset(editPresetTitle, editPresetNarrative);
                    setShowCustomPresetModal(false);
                  }}
                  disabled={!editPresetTitle.trim() || !editPresetNarrative.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-lg shadow-amber-950/50"
                >
                  儲存並套用為預設案例
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UnifiedEntry;
