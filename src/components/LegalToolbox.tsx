import React, { useState, useMemo } from 'react';
import { 
  FileText, Check, Copy, Download, Search, AlertTriangle, 
  FolderLock, ArrowRight, BookOpen, Clock, Printer, LayoutTemplate, Sparkles, Scale, SearchCheck, CheckCircle2, ShieldCheck, HandHeart
} from 'lucide-react';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';
// NOTE: This file utilizes LEGAL_TOOLS.length indirectly via ToolboxHeader
import { LegalToolboxResult } from '../types';
import { useCaseStore, getActiveCase } from '../store/useCaseStore';
import { apiClient } from '../lib/apiClient';
import { DocumentProgressTracker } from './DocumentProgressTracker';
import { DEFAULT_FORM_INPUTS } from '../lib/toolFormDefaults';
import { ToolboxHeader, TOOLBOX_GROUPS } from './toolbox/ToolboxHeader';
import { ToolSelectorGrid } from './toolbox/ToolSelectorGrid';
import { DynamicToolForm } from './toolbox/DynamicToolForm';
import { ToolResultPanel } from './toolbox/ToolResultPanel';
import { UIConstants } from '../constants/ui';
import { useGlobalUI } from '../contexts/GlobalUIContext';
import { getCalculatorConfig } from '../lib/calculatorEngines';
import { InteractiveCalculatorView } from './toolbox/InteractiveCalculatorView';

type DocumentGenerationStage = 'input' | 'analyzing' | 'formatting' | 'ready' | 'error';

export const LegalToolbox: React.FC<{ initialToolId?: string }> = ({ initialToolId }) => {
  const { startLoading, stopLoading } = useGlobalUI();
  const activeCase = useCaseStore(getActiveCase);
  const addDocument = useCaseStore(state => state.addDocument);
  const presetToolId = initialToolId;

  const [activeToolId, setActiveToolId] = useState<string>(presetToolId || 'CRIMINAL_COMPLAINT_TRAFFIC');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formInputs, setFormInputs] = useState<Record<string, any>>(DEFAULT_FORM_INPUTS);

  React.useEffect(() => {
    if (!activeCase.facts && !activeCase.issues?.length) return;
    setFormInputs(prev => ({
      ...prev,
      incidentDetails: activeCase.facts || prev.incidentDetails,
      issueSummary: activeCase.issues?.map(issue => issue.title).join('\n') || prev.issueSummary,
      evidenceList: activeCase.evidences?.map(evidence => evidence.provenFact).join('\n') || prev.evidenceList
    }));
  }, [activeCase]);

  const handleInputChange = (field: string, value: any) => {
    setFormInputs(prev => ({ ...prev, [field]: value }));
    if (generationStage === 'ready' || generationStage === 'error') {
      setGenerationStage('input');
    }
  };

  const filteredTools = useMemo(() => {
    return LEGAL_TOOLS.filter(tool => {
      const matchGroup = Boolean(searchQuery.trim()) || selectedGroup === 'ALL' || tool.categoryGroup === selectedGroup;
      const matchQuery = !searchQuery.trim() || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.legalBasis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchQuery;
    });
  }, [selectedGroup, searchQuery]);

  const currentTool = useMemo(() => {
    return LEGAL_TOOLS.find(t => t.id === activeToolId) || LEGAL_TOOLS[0];
  }, [activeToolId]);

  const [generationStage, setGenerationStage] = useState<DocumentGenerationStage>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LegalToolboxResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    if (groupId === 'ALL' || currentTool.categoryGroup === groupId) return;
    const firstTool = LEGAL_TOOLS.find(tool => tool.categoryGroup === groupId);
    if (!firstTool) return;
    setActiveToolId(firstTool.id);
    setResult(null);
    setGenerationStage('input');
  };

  const selectedGroupLabel = searchQuery.trim()
      ? '搜尋結果'
    : selectedGroup === 'ALL'
      ? '全部書狀與文件'
      : TOOLBOX_GROUPS.find(group => group.id === selectedGroup)?.label || '書狀與文件';

  const handleGenerate = async () => {
    setIsLoading(true);
    setGenerationStage('analyzing');
    setGenerateError(null);
    startLoading();

    const formattingTimer = setTimeout(() => {
      setGenerationStage('formatting');
    }, 1200);

    try {
      const res = await apiClient.toolboxGenerate({
        toolCategory: activeToolId,
        params: formInputs
      });
      clearTimeout(formattingTimer);
      setResult(res);
      setGenerationStage('ready');

      if (res?.documentText) {
        addDocument({
          id: `toolbox-${activeToolId}-${Date.now()}`,
          kind: activeToolId,
          title: res.title || currentTool.name,
          text: res.documentText,
          status: res.antiGhostVerification?.ghostCitationsFound ? 'NEEDS_HUMAN_REVIEW' : 'VERIFIED',
          sourceTool: 'LegalToolbox',
          createdAt: new Date().toISOString(),
          verification: res.antiGhostVerification
        });
      }

      if (res?.documentText) {
        handleFullVerify(res.documentText);
      }
      stopLoading({ message: '文件產製完成', type: 'success' });
    } catch (err: any) {
      clearTimeout(formattingTimer);
      console.error('Toolbox generate error:', err);
      setGenerationStage('error');
      setGenerateError(err?.message || '文件產製未通過法規引用驗證，請稍候重試或調整案情內容');
      stopLoading({ message: '產製失敗', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [injectedNotice, setInjectedNotice] = useState<string | null>(null);

  const handleFullVerify = async (textToVerify?: string) => {
    const text = textToVerify || result?.documentText;
    if (!text) return;
    
    setIsVerifyingAi(true);
    setVerifyNotice(null);
    startLoading();
    try {
      const verifyRes = await apiClient.toolboxVerifyCitations({ documentText: text });
      if (verifyRes?.antiGhostVerification) {
        setResult(prev => prev ? { ...prev, antiGhostVerification: verifyRes.antiGhostVerification } : null);
        const { totalCitationsChecked, ghostCitationsFound } = verifyRes.antiGhostVerification;
        setVerifyNotice(`全篇引用檢查完成：共核對 ${totalCitationsChecked} 處法律引用，疑似幽靈引用：${ghostCitationsFound} 處；結果仍需人工查證。`);
      }
      stopLoading(); // Optional: show toast here, but user might be overwhelmed, so no toast.
    } catch (err: any) {
      console.error('Full AI verification failed:', err);
      setVerifyNotice('引用檢查暫時無法完成，請稍後重試並人工查證來源。');
      stopLoading();
    } finally {
      setIsVerifyingAi(false);
    }
  };

  const activeCalculatorConfig = useMemo(() => {
    return getCalculatorConfig(activeToolId);
  }, [activeToolId]);

  const handleSendClauseToDocument = (clauseText: string) => {
    // 依據目前特定試算器尋找最精準對應的書狀產生器
    let targetDocTool = 'DIVORCE_AGREEMENT';
    let targetDocName = '離婚協議書起草';

    switch (activeToolId) {
      case 'CHILD_SUPPORT_CALCULATOR':
      case 'CHILD_CUSTODY_ASSESSMENT':
      case 'RESIDUAL_PROPERTY_CALCULATOR':
      case 'DIVORCE_PROCEDURE_ASSESSMENT':
        targetDocTool = 'DIVORCE_AGREEMENT';
        targetDocName = '離婚協議書起草';
        break;
      case 'INHERITANCE_PORTION_CALCULATOR':
      case 'INHERITANCE_CALCULATOR':
      case 'FORCED_SHARE_CALCULATOR':
        targetDocTool = 'SELF_WRITTEN_WILL';
        targetDocName = '自書遺囑起草';
        break;
      case 'PROPERTY_VALUATION_ESTIMATOR':
        targetDocTool = 'RESIDENTIAL_LEASE_CONTRACT';
        targetDocName = '房屋租賃契約書';
        break;
      case 'TRAFFIC_COMPENSATION_CALCULATOR':
      case 'VEHICLE_VALUATION_ESTIMATOR':
      case 'TRAFFIC_PROCEDURE_ASSESSMENT':
        targetDocTool = 'TRAFFIC_SETTLEMENT_GENERATOR';
        targetDocName = '車禍和解書產生器';
        break;
      case 'COURT_FEE_CALCULATOR':
      case 'DEBT_COLLECTION_SELECTOR':
      case 'STATUTE_LIMITATIONS_CALCULATOR':
        targetDocTool = 'CIVIL_COMPLAINT_GENERAL';
        targetDocName = '民事起訴狀產生器';
        break;
      case 'SEVERANCE_PAY_CALCULATOR':
        targetDocTool = 'DEMAND_LETTER_LABOR';
        targetDocName = '工資與資遣費催告存證信函';
        break;
      default:
        if (currentTool.categoryGroup === 'TRAFFIC') {
          targetDocTool = 'TRAFFIC_SETTLEMENT_GENERATOR';
          targetDocName = '車禍和解書產生器';
        } else if (currentTool.categoryGroup === 'DEBT') {
          targetDocTool = 'CIVIL_COMPLAINT_GENERAL';
          targetDocName = '民事起訴狀產生器';
        } else if (currentTool.categoryGroup === 'LABOR_CRIMINAL_CONTRACT') {
          targetDocTool = 'DEMAND_LETTER_GENERAL';
          targetDocName = '存證信函產生器';
        }
    }

    setActiveToolId(targetDocTool);
    setFormInputs(prev => ({
      ...prev,
      incidentDetails: `${prev.incidentDetails || ''}\n\n【試算約定條款】\n${clauseText}`.trim()
    }));
    
    setInjectedNotice(`已成功將「${currentTool.name}」的試算條款帶入【${targetDocName}】！`);
    stopLoading({ message: `已帶入【${targetDocName}】`, type: 'success' });

    setTimeout(() => {
      document.getElementById('tool-workspace-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto" id="legal-toolbox-root" data-tools-count={LEGAL_TOOLS.length}>
      <div className="no-print space-y-6">
        <ToolboxHeader 
          selectedGroup={selectedGroup}
          onSelectGroup={handleGroupSelect}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <section aria-labelledby="tool-list-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="tool-list-heading" className="text-lg font-bold text-white">{selectedGroupLabel}</h2>
              <p className="mt-1 text-xs text-slate-400">找到 {filteredTools.length} 項；選擇後再到下方填寫文件資料或進行即時試算。</p>
            </div>
          </div>
          <ToolSelectorGrid
            tools={filteredTools}
            activeToolId={activeToolId}
            onSelect={(id) => {
              setActiveToolId(id);
              setResult(null);
              setGenerationStage('input');
              document.getElementById('tool-workspace-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </section>
      </div>

      <div id="tool-workspace-section" className="scroll-mt-6">
        {activeCalculatorConfig ? (
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <InteractiveCalculatorView 
              config={activeCalculatorConfig} 
              onSendToDocument={handleSendClauseToDocument}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="no-print">
              <DocumentProgressTracker 
                currentStage={generationStage} 
                errorMessage={generateError}
                onResetToInput={() => {
                  setGenerationStage('input');
                  setGenerateError(null);
                }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div id="tool-form-section" className="lg:col-span-5 space-y-4 no-print">
                <div className={`${UIConstants.card} sticky top-6`}>
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                      <currentTool.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white leading-tight">{currentTool.name}</h2>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={UIConstants.badgePrimary}>
                          {currentTool.badge}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{currentTool.legalBasis}</span>
                      </div>
                    </div>
                  </div>

                  <DynamicToolForm 
                    toolId={activeToolId} 
                    formInputs={formInputs} 
                    onChange={handleInputChange} 
                    currentToolName={currentTool.name}
                    injectedClauseNotice={injectedNotice}
                    onClearInjectedNotice={() => setInjectedNotice(null)}
                  />

                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || generationStage === 'analyzing' || generationStage === 'formatting'}
                    className={`mt-6 w-full ${UIConstants.buttonPrimary}`}
                  >
                    {(isLoading || generationStage === 'analyzing' || generationStage === 'formatting') ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>AI 智能起草中...</span>
                      </>
                    ) : (
                      <>
                        <LayoutTemplate className="w-4 h-4" />
                        <span>一鍵生成專業法律書狀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <ToolResultPanel 
                result={result}
                currentTool={currentTool}
                isVerifyingAi={isVerifyingAi}
                verifyNotice={verifyNotice}
                onFullVerify={() => handleFullVerify()}
                isLoading={isLoading || generationStage === 'analyzing' || generationStage === 'formatting'}
                generationStage={generationStage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
