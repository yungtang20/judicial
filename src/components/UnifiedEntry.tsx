import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UnifiedHeader } from './unified/UnifiedHeader';
import { HistoryModal } from './unified/HistoryModal';
import { UnifiedProgress } from './unified/UnifiedProgress';
import { InputNode } from './unified/InputNode';
import { TriageNode } from './unified/TriageNode';
import { SafetyNode } from './unified/SafetyNode';
import { CitationNode } from './unified/CitationNode';
import { SyllogismNode } from './unified/SyllogismNode';
import { VerificationNode } from './unified/VerificationNode';
import { UnifiedNav } from './unified/UnifiedNav';
import { SettingsModal } from './unified/SettingsModal';
import { AIProviderSettings, AIProviderConfigDraft } from './unified/AIProviderSettings';
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
  const [aiConfig, setAiConfig] = useState<AIProviderConfigDraft>({
    providerType: 'custom',
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    apiKey: '',
    model: 'agnes-3.0-flash'
  });

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
          , aiConfig
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
          , aiConfig
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


  const sharedProps = { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, aiConfig, setAiConfig, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <UnifiedHeader {...sharedProps} />
        <HistoryModal {...sharedProps} />
        <UnifiedProgress {...sharedProps} />
        <AIProviderSettings value={aiConfig} onChange={setAiConfig} />
        <InputNode {...sharedProps} />
        <TriageNode {...sharedProps} />
        <SafetyNode {...sharedProps} />
        <CitationNode {...sharedProps} />
        <SyllogismNode {...sharedProps} />
        <VerificationNode {...sharedProps} />
        <UnifiedNav {...sharedProps} />
        <SettingsModal {...sharedProps} />
      </div>
    </div>
  );
};
export default UnifiedEntry;
