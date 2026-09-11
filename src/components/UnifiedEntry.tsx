import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UnifiedHeader } from './unified/UnifiedHeader';
import { HistoryModal } from './unified/HistoryModal';
import { UnifiedProgress } from './unified/UnifiedProgress';
import { InputNode } from './unified/InputNode';
import { SafetyNode } from './unified/SafetyNode';
import { UnifiedResult } from './unified/UnifiedResult';
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
import { useGlobalUI } from '../contexts/GlobalUIContext';
import { fetchWithAuth } from '../lib/apiClient';
import { extractPdfText } from '../lib/pdfUtils';
import { buildIntelligentRuleBasedTriage, enforceTriageConsistency, detectTemporalConflict } from '../lib/universalTriage';
import { verifyLegalCitations } from '../lib/citationVerifier';

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
  const { startLoading, stopLoading } = useGlobalUI();
  const defaultSample = `事發於民國112年11月15日晚上約11點，在台北市信義區租屋處。我與房東因退租押金發生爭執，房東以無合理依據之清潔費為由拒絕退還新台幣5萬元押金，並威脅若再爭執將把我的私人物品丟到走廊。我有雙方簽署之房屋租賃契約書、歷次匯款房租水電之銀行明細，以及當日 LINE 對話紀錄截圖。請問我的法律權利為何？`;

  const [inputNarrative, setInputNarrative] = useState<string>('');
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
    startLoading();

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
        stopLoading({ message: '解析失敗，內容為空', type: 'error' });
        return;
      }

      if (parsedTexts.length === 1) {
        setInputNarrative(parsedTexts[0]);
      } else {
        setBatchQueue(parsedTexts);
        setBatchIndex(0);
        setInputNarrative(parsedTexts[0]);
      }
      stopLoading({ message: '檔案解析完成', type: 'success' });
    } catch (err) {
      console.error('[UnifiedEntry] 裁判書解析異常:', err);
      alert('解析裁判書檔案時發生錯誤，請確認檔案未損毀或受密碼保護');
      stopLoading({ message: '檔案解析失敗', type: 'error' });
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

  // 本機確定性規則備援工作流（當網路或後端短暫不可達時自動接管）
  const executeLocalFallbackWorkflow = (userInputText: string, safetyAck?: boolean): LegalWorkflowState => {
    const trimmed = userInputText.trim();
    const state = createInitialWorkflowState(trimmed);
    const baseTriage = buildIntelligentRuleBasedTriage(trimmed);
    const triage = enforceTriageConsistency(baseTriage, trimmed);
    const temporal = detectTemporalConflict(trimmed);
    let isComplete = triage.isComplete !== false && !temporal.hasConflict;
    const missingElements = [...(triage.missingElements || [])];

    if (temporal.hasConflict && temporal.questionPrompt) {
      isComplete = false;
      if (!missingElements.some(m => m.includes("時間矛盾"))) {
        missingElements.unshift(`【時間矛盾】${temporal.questionPrompt}`);
      }
    }

    let domain = "民事";
    if (triage.caseType?.startsWith("CRIMINAL") || triage.isSensitive) {
      domain = "刑事";
    } else if (triage.category?.includes("DOMESTIC") || triage.category?.includes("DIVORCE")) {
      domain = "家事";
    } else if (triage.category?.includes("LABOR")) {
      domain = "勞動";
    }

    state.router = {
      domain,
      chapter: formatLegalChapter(triage.category),
      cause: triage.identifiedIssue || "法律爭議請求權與程序分析",
      is_sensitive: Boolean(triage.isSensitive),
      is_complete: isComplete,
      missing_elements: missingElements
    };

    const isSexualAutonomy = triage.category === 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT' ||
      Boolean(triage.identifiedIssue?.includes("性自主")) ||
      /性自主|性侵|猥褻|乘機性交|強制性交/.test(trimmed);

    if (triage.isSensitive) {
      state.safety = {
        emergencyHotlines: [
          { label: "全國婦幼保護專線", number: "113", desc: "24 小時免付費，提供家暴、性侵、兒少保護諮詢與通報" },
          { label: "警察報案電話", number: "110", desc: "緊急危難或立即性人身安全威脅時請立即撥打" },
          { label: "衛福部安心專線", number: "1925", desc: "24 小時心理諮商與心理支持熱線" }
        ],
        preservationTips: [
          "【生物檢體保全】：性自主案件切勿沐浴更衣，請立即將案發衣物以乾淨紙袋保全存證。",
          "【醫療驗傷】：黃金72小時內請至醫院急診驗傷，請醫師開立驗傷診斷書並保存生物檢體。",
          "【數位事證】：保留所有 LINE、通話錄音、監視器畫面及事發現場截圖，切勿刪除對話紀錄。"
        ],
        immediateSteps: [
          "撥打 113 保護專線或 110 報案",
          "至醫療院所開立驗傷診斷證明書並採證"
        ],
        acknowledged: true
      };
    }

    const legalBasis = triage.legalBasis || ["民法第184條", "民事訴訟法第277條"];
    const basisText = legalBasis.slice(0, 3).join("、");

    state.rag = {
      searchQuery: `${state.router.cause} ${basisText}`,
      legalElements: `【法定構成要件】依據${basisText}之法定構成要件：行為主體、客體、客觀侵害事實、損害結果與因果關係。`,
      statuteCitations: legalBasis,
      precedents: []
    };

    const fullAnalysis = `1. 大前提（法定構成要件）：\n依中華民國現行實體法規（如${basisText}），權利受侵害且具客觀可歸責性與因果關係時，得依法主張侵權損害賠償、契約履行或追究法律責任。\n\n2. 小前提（案件事實）：\n使用者陳述事實：「${trimmed}」。\n\n3. 涵攝：\n經比對事證與法定構成要件：\n- 客觀事實：敘述行為已初步對應相關法規之請求權或告訴要件。\n- 舉證門檻：宜備妥書面契約、金流明細、通訊軟體對話紀錄以達民刑事舉證門檻。\n\n4. 結論：\n具備實體法上救濟或申訴基礎，建議保全客觀原始紀錄，並得循調解或司法途徑保障權益。`;

    state.syllogism = {
      majorPremise: `依${basisText}與我國司法實務見解`,
      minorPremise: `用戶陳述事實：「${trimmed.slice(0, 80)}...」`,
      subsumption: "比對事實樣態與法定構成要件之關聯性及舉證門檻",
      conclusion: "具備初步法律主張與救濟程序基礎，應保全關鍵佐證",
      fullAnalysis
    };

    const verification = verifyLegalCitations(`${fullAnalysis}\n\n${legalBasis.join(" ")}`);
    state.verification = {
      totalChecked: verification.totalChecked,
      ghostCount: verification.ghostCount,
      results: verification.results,
      sanitizedText: verification.sanitizedText,
      passGate: false,
      verificationStatus: verification.ghostCount > 0 ? 'FAIL' : 'NEEDS_REVIEW',
      warningNotice: verification.ghostCount === 0 ? "已完成本機法條格式檢查；尚未完成官方來源查驗，目前只能參考，不能直接用於書狀或法律主張。" : "查核發現疑義法條，目前不可使用，請先修正後重新分析。"
    };

    state.currentStep = 'COMPLETED';
    state.updatedAt = Date.now();
    return state;
  };

  // Auto-save when analysis completes
  const handleExecuteWorkflow = async (textToRun?: string, safetyAck?: boolean) => {
    const text = (textToRun !== undefined ? textToRun : inputNarrative).trim();
    if (!text) return;

    const effectiveSafetyAck = true;

    setIsSubmitting(true);
    startLoading();
    try {
      const res = await fetchWithAuth('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: text,
          stateId: workflowState?.id,
          acknowledgeSafety: effectiveSafetyAck,
          aiConfig
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }

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
        stopLoading({ message: '分析完成', type: 'success' });
      } else {
        throw new Error(data.error || '工作流執行失敗');
      }
    } catch (err: any) {
      console.warn('[UnifiedEntry] 執行工作流網路異常，啟動本機規則備援引擎:', err);
      // 網路或後端暫時無回應時，啟動本機確定性規則推論引擎，確保使用者永不卡死
      const fallbackState = executeLocalFallbackWorkflow(text, safetyAck);
      setWorkflowState(fallbackState);
      saveToHistory({
        inputText: fallbackState.userNarrative,
        workflowState: fallbackState,
        title: fallbackState.router?.cause || fallbackState.userNarrative.slice(0, 30) + '...',
      });
      setHistoryList(loadHistory());
      stopLoading({ message: '本機規則分析完成', type: 'success' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplementFact = async (supplementText?: string) => {
    const supplement = (supplementText !== undefined ? supplementText : supplementInput).trim();
    if (!supplement || !workflowState) return;

    setIsSubmitting(true);
    startLoading();
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
        stopLoading({ message: '事實補充分析完成', type: 'success' });
      } else {
        throw new Error(data.error || '補充事實處理失敗');
      }
    } catch (err: any) {
      console.warn('[UnifiedEntry] 補充事實連線異常，啟動本機規則備援:', err);
      const combinedNarrative = `${workflowState.userNarrative}\n【補充事實】：${supplement}`;
      const fallbackState = executeLocalFallbackWorkflow(combinedNarrative, true);
      setWorkflowState(fallbackState);
      setInputNarrative(combinedNarrative);
      setSupplementInput('');
      saveToHistory({
        inputText: fallbackState.userNarrative,
        workflowState: fallbackState,
        title: fallbackState.router?.cause || fallbackState.userNarrative.slice(0, 30) + '...',
      });
      setHistoryList(loadHistory());
      stopLoading({ message: '本機事實補充完成', type: 'success' });
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
    setInputNarrative('');
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

  useEffect(() => {
    if (!workflowState?.syllogism) return;
    document.getElementById('analysis-result-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [workflowState?.syllogism]);


  const sharedProps = { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, aiConfig, setAiConfig, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal };
  const hasResult = Boolean(workflowState?.syllogism);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#090d16] text-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <UnifiedHeader {...sharedProps} />
        <HistoryModal {...sharedProps} />
        {!hasResult && <InputNode {...sharedProps} />}
        {!hasResult && <AIProviderSettings value={aiConfig} onChange={setAiConfig} />}
        {(isSubmitting || workflowState?.error) && <UnifiedProgress {...sharedProps} />}
        {hasResult && workflowState?.safety && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200">
            若有人身危險，請先撥打 110 或 113；完整保護指引列於結果下方。
          </div>
        )}
        <SafetyNode {...sharedProps} showSafety={!hasResult} />
        {workflowState && <UnifiedResult {...sharedProps} workflowState={workflowState} />}
        {hasResult && <UnifiedNav {...sharedProps} />}
        {hasResult && (
          <details className="rounded-xl border border-slate-800 bg-[#0e1424]">
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white">查看或修改案件內容</summary>
            <div className="p-4 border-t border-slate-800 space-y-4">
              <InputNode {...sharedProps} />
              <AIProviderSettings value={aiConfig} onChange={setAiConfig} />
            </div>
          </details>
        )}
        {hasResult && workflowState?.safety && <SafetyNode {...sharedProps} showQuestioning={false} />}
        <SettingsModal {...sharedProps} />
      </div>
    </div>
  );
};
export default UnifiedEntry;
