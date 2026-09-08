import React, { useState, useMemo } from 'react';
import { 
  FileText, Check, Copy, Download, Search, AlertTriangle, 
  FolderLock, ArrowRight, BookOpen, Clock, Printer, LayoutTemplate, Sparkles, Scale, SearchCheck, CheckCircle2, ShieldCheck, HandHeart
} from 'lucide-react';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';
// NOTE: This file utilizes LEGAL_TOOLS.length indirectly via ToolboxHeader
import { LegalToolboxResult } from '../types';
import { useCaseStore, getActiveCase } from '../store/useCaseStore';
import { useToolContext } from '../contexts/ToolContext';
import { apiClient } from '../lib/apiClient';
import { DocumentProgressTracker } from './DocumentProgressTracker';
import { DEFAULT_FORM_INPUTS } from '../lib/toolFormDefaults';
import { ToolboxHeader } from './toolbox/ToolboxHeader';
import { ToolSelectorGrid } from './toolbox/ToolSelectorGrid';
import { DynamicToolForm } from './toolbox/DynamicToolForm';
import { ToolResultPanel } from './toolbox/ToolResultPanel';

type DocumentGenerationStage = 'input' | 'analyzing' | 'formatting' | 'ready' | 'error';

export const LegalToolbox: React.FC<{ initialToolId?: string }> = ({ initialToolId }) => {
  const activeCase = useCaseStore(getActiveCase);
  const { handleSelectTool } = useToolContext();
  const addDocument = useCaseStore(state => state.addDocument);
  const presetToolId = initialToolId;

  const [activeToolId, setActiveToolId] = useState<string>(presetToolId || 'CRIMINAL_COMPLAINT_TRAFFIC');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formInputs, setFormInputs] = useState<Record<string, any>>(DEFAULT_FORM_INPUTS);

  React.useEffect(() => {
    if (!activeCase.facts && activeCase.issues.length === 0) return;
    setFormInputs(prev => ({
      ...prev,
      incidentDetails: activeCase.facts || prev.incidentDetails,
      issueSummary: activeCase.issues.map(issue => issue.title).join('\n') || prev.issueSummary,
      evidenceList: activeCase.evidences.map(evidence => evidence.provenFact).join('\n') || prev.evidenceList
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
      const matchGroup = selectedGroup === 'ALL' || tool.categoryGroup === selectedGroup;
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

  const handleGenerate = async () => {
    setIsLoading(true);
    setGenerationStage('analyzing');
    setGenerateError(null);

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
    } catch (err: any) {
      clearTimeout(formattingTimer);
      console.error('Toolbox generate error:', err);
      setGenerationStage('error');
      setGenerateError(err?.message || '文件產製未通過法規引用驗證，請稍候重試或調整案情內容');
    } finally {
      setIsLoading(false);
    }
  };

  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleFullVerify = async (textToVerify?: string) => {
    const text = textToVerify || result?.documentText;
    if (!text) return;
    
    setIsVerifyingAi(true);
    setVerifyNotice(null);
    try {
      const verifyRes = await apiClient.toolboxVerifyCitations({ documentText: text });
      if (verifyRes?.antiGhostVerification) {
        setResult(prev => prev ? { ...prev, antiGhostVerification: verifyRes.antiGhostVerification } : null);
        const { totalCitationsChecked, ghostCitationsFound } = verifyRes.antiGhostVerification;
        setVerifyNotice(`全篇引用檢查完成：共核對 ${totalCitationsChecked} 處法律引用，疑似幽靈引用：${ghostCitationsFound} 處；結果仍需人工查證。`);
      }
    } catch (err: any) {
      console.error('Full AI verification failed:', err);
      setVerifyNotice('引用檢查暫時無法完成，請稍後重試並人工查證來源。');
    } finally {
      setIsVerifyingAi(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6" id="legal-toolbox-root" data-tools-count={LEGAL_TOOLS.length}>
      <ToolboxHeader 
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateGuide={() => handleSelectTool('guide')}
        onNavigateUnified={() => handleSelectTool('unified')}
      />

      <ToolSelectorGrid 
        tools={filteredTools}
        activeToolId={activeToolId}
        onSelect={(id) => {
          setActiveToolId(id);
          setResult(null); 
          document.getElementById('tool-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <DocumentProgressTracker 
         currentStage={generationStage} 
         errorMessage={generateError}
         onResetToInput={() => {
           setGenerationStage('input');
           setGenerateError(null);
         }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div id="tool-form-section" className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl sticky top-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <currentTool.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">{currentTool.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium tracking-wide">
                    {currentTool.badge}
                  </span>
                  <span className="text-[10px] text-slate-400">{currentTool.legalBasis}</span>
                </div>
              </div>
            </div>

            <DynamicToolForm 
              toolId={activeToolId} 
              formInputs={formInputs} 
              onChange={handleInputChange} 
              currentToolName={currentTool.name} 
            />

            <button
              onClick={handleGenerate}
              disabled={isLoading || generationStage === 'analyzing' || generationStage === 'formatting'}
              className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        />
      </div>
    </div>
  );
};
