import React, { useState } from 'react';
import { DefenseHeader } from './defense/DefenseHeader';
import { WorkflowFlowchart } from './defense/WorkflowFlowchart';
import { CaseMetadataPanel } from './defense/CaseMetadataPanel';
import { Stage1Ingest } from './defense/Stage1Ingest';
import { Stage2Triage } from './defense/Stage2Triage';
import { Stage3Communication } from './defense/Stage3Communication';
import { Stage4MineScan } from './defense/Stage4MineScan';
import { Stage5PleadingOutput } from './defense/Stage5PleadingOutput';

import { 
  ShieldAlert, 
  ShieldCheck,
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Scale, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  HelpCircle, 
  ListChecks, 
  Search, 
  FileCheck2, 
  UserCheck, 
  AlertOctagon, 
  Layers, 
  Printer, 
  BookOpen, 
  TrendingUp, 
  ChevronRight,
  Send,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { 
  BPointDecision, 
  GPointDecision, 
  DefenseTriageResult, 
  MineScanResult, 
  GeneratedPleadingResult,
  ConcreteFactItem,
  UnfruitfulPointItem,
  QuestionnaireItem,
  AdmissionMineItem
} from '../types';
import { useAppealStore } from '../store/useAppealStore';
import { AntiGhostBadge } from './AntiGhostBadge';
import { LegalSourcesDisplay } from './LegalSourcesDisplay';
import { getActiveCase, useCaseStore } from '../store/useCaseStore';

const PRESET_CASES = [
  {
    id: 'loan_dispute',
    title: '民間借款爭議（當事人急欲主張對方詐騙、自述曾拿錢但無借據）',
    category: '民事消費借貸',
    caseType: 'civil',
    courtName: '臺灣臺北地方法院',
    caseNo: '113年度訴字第2841號',
    clientRole: '被告',
    clientName: '林小明',
    opponentRole: '原告',
    opponentName: '高利祥',
    lawyerName: '訴訟代理人律師',
    background: '原告主張被告向其借款新臺幣 80 萬元未清償，提出銀行匯款單為證；被告主張該筆款項實係兩造合夥代墊款，且雙方根本沒有簽立任何借據。',
    rawStatement: `律師你好，原告根本是個大騙子！他告我借錢不還完全是在敲詐！法官如果相信他就是恐龍法官！
我跟他說過很多次了，那筆80萬我確實有收到進我帳戶，我也確實拿去付工廠租金了，但我不是不還他錢，是因為他之前也欠我貨款沒結清啊！
而且我們根本沒簽借據，他憑什麼告我借貸？我去年就傳訊跟他說過等我手頭寬裕或工程結案再處理，他現在居然直接去法院告我！
請律師一定要在狀子裡狠狠罵他背信忘義、天理不容，把民法第184條、第179條、刑法第339條全部寫上去告死他！`
  },
  {
    id: 'contractor_defect',
    title: '裝潢承攬工程瑕疵爭議（當事人指控偷工減料、自述未驗收即入住）',
    category: '民事承攬瑕疵',
    caseType: 'civil',
    courtName: '臺灣新北地方法院',
    caseNo: '113年度建字第109號',
    clientRole: '原告（定作人）',
    clientName: '張大華',
    opponentRole: '被告（承攬人）',
    opponentName: '大鼎室內設計工程行',
    lawyerName: '訴訟代理人律師',
    background: '原告委託被告裝修住宅，總工程款 250 萬元，已給付 200 萬元。完工後原告發現衛浴漏水、地板翹起，被告反訴請求給付尾款 50 萬元。',
    rawStatement: `這家裝潢公司真的沒良心，偷工減料！我早在半年前剛搬進去就發現衛浴水管在漏水了，地板也全爛掉。
合約書上的簽名確實是我簽的沒錯，但我當時根本沒仔細看那些免責小字就被他騙著簽了。
雖然我承認我當時沒有立刻找他做正式書面驗收就先搬進去了，而且我尾款50萬確實還扣著沒給他，但他做成這樣根本是黑心！
我手上有112年11月5日用LINE傳漏水照片給他工務主任的對話紀錄，還有水電師傅陳師傅在現場檢測的估價單15萬元。我要請求他賠償我重新裝修費80萬！`
  },
  {
    id: 'car_accident',
    title: '車禍過失傷害爭議（當事人抱怨對方獅子大開口、自述當下有看導航）',
    category: '刑事過失傷害 / 民事侵權',
    caseType: 'criminal',
    courtName: '臺灣士林地方法院',
    caseNo: '113年度交易字第77號',
    clientRole: '被告',
    clientName: '陳威廉',
    opponentRole: '告訴人',
    opponentName: '黃志強',
    lawyerName: '訴訟代理人律師',
    background: '被告駕車於路口左轉時與對向直行之告訴人機車發生碰撞，告訴人受有左腿骨折傷害，請求賠償 200 萬元並提起刑事告訴。',
    rawStatement: `對方根本是假車禍真敲詐！只是小腿骨折居然跟我要200萬賠償金，簡直獅子大開口！
事發當天113年3月12日下午2點在承德路四段路口，我確實有在開車，當時我正在看手機Google導航找路，車速大概只有20公里，我是綠燈左轉，對方騎超快撞上來。
警察來做筆錄時我也老實說我有看導航，但明明是他超速！而且我隔天就有買水果去醫院看他，他家人態度惡劣把我趕出來。
法官如果判我有罪根本沒有公理，請律師幫我寫狀子把對方的貪婪全部寫出來！`
  }
];

export const DefenseWorkflowTool: React.FC = () => {
  const activeCase = useCaseStore(getActiveCase);
  const saveAnalysis = useCaseStore(s => s.saveAnalysis);
  const addDocument = useCaseStore(s => s.addDocument);
  // Case metadata & input states
  const [caseType, setCaseType] = useState<string>('civil');
  const [courtName, setCourtName] = useState<string>('臺灣臺北地方法院');
  const [caseNo, setCaseNo] = useState<string>('113年度訴字第2841號');
  const [clientRole, setClientRole] = useState<string>('被告');
  const [clientName, setClientName] = useState<string>('林小明');
  const [opponentRole, setOpponentRole] = useState<string>('原告');
  const [opponentName, setOpponentName] = useState<string>('高利祥');
  const [lawyerName, setLawyerName] = useState<string>('訴訟代理人律師');
  const [caseBackground, setCaseBackground] = useState<string>(activeCase.facts);
  const [clientStatement, setClientStatement] = useState<string>(activeCase.facts || PRESET_CASES[0].rawStatement);

  // Workflow stages & results
  const [currentStage, setCurrentStage] = useState<'INGEST' | 'B_POINT' | 'PHASE_2' | 'PHASE_3' | 'OUTPUT'>('INGEST');
  const [isLoadingTriage, setIsLoadingTriage] = useState<boolean>(false);
  const [isLoadingMineScan, setIsLoadingMineScan] = useState<boolean>(false);
  const [isLoadingPleading, setIsLoadingPleading] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  // AI Outputs
  const [triageResult, setTriageResult] = useState<DefenseTriageResult | null>(null);
  const [gPointDecision, setGPointDecision] = useState<GPointDecision>('INSIST_SUBMIT');
  const [mineScanResult, setMineScanResult] = useState<MineScanResult | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'LAWYER' | 'PERSONAL'>('PERSONAL');
  const [lawyerPleading, setLawyerPleading] = useState<GeneratedPleadingResult | null>(null);
  const [personalPleading, setPersonalPleading] = useState<GeneratedPleadingResult | null>(null);

  // Load preset
  const handleLoadPreset = (preset: typeof PRESET_CASES[0]) => {
    setCaseType(preset.caseType);
    setCourtName(preset.courtName);
    setCaseNo(preset.caseNo);
    setClientRole(preset.clientRole);
    setClientName(preset.clientName);
    setOpponentRole(preset.opponentRole);
    setOpponentName(preset.opponentName);
    setLawyerName(preset.lawyerName);
    setCaseBackground(preset.background);
    setClientStatement(preset.rawStatement);
    setTriageResult(null);
    setMineScanResult(null);
    setLawyerPleading(null);
    setPersonalPleading(null);
    setWorkflowError(null);
    setCurrentStage('INGEST');
  };

  // Step 1: Run B-Point Triage
  const handleRunTriage = async () => {
    if (!clientStatement.trim()) return;
    setIsLoadingTriage(true);
    setWorkflowError(null);
    try {
      const res = await apiClient.defenseTriage({
        clientInput: clientStatement,
        caseType,
        caseBackground,
        courtName,
        caseNo
      });
      setTriageResult(res);
      saveAnalysis(res, { facts: clientStatement, caseType, issues: activeCase.issues, evidences: activeCase.evidences, citations: activeCase.candidateCitations });
      setCurrentStage('B_POINT');
      
      // If decision is TRACK_1_FACTS, default G-point to COOPERATE; otherwise INSIST_SUBMIT
      if (res.decision === 'TRACK_1_FACTS') {
        setGPointDecision('COOPERATE');
      } else {
        setGPointDecision('INSIST_SUBMIT');
      }
    } catch (err: any) {
      console.error("Triage failed:", err);
      setWorkflowError(err.message || '分流分析連線失敗，請檢查網路或稍後再試');
    } finally {
      setIsLoadingTriage(false);
    }
  };

  // Step 2 -> Phase 3: Run 6-Mine Scan
  const handleRunMineScan = async () => {
    setIsLoadingMineScan(true);
    setWorkflowError(null);
    try {
      const res = await apiClient.defenseScanMines({
        clientInput: clientStatement,
        caseType,
        caseBackground
      });
      setMineScanResult(res);
      setCurrentStage('PHASE_3');
    } catch (err: any) {
      console.error("Mine scan failed:", err);
      setWorkflowError(err.message || '不利自認地雷掃描失敗，請檢查網路或稍後再試');
    } finally {
      setIsLoadingMineScan(false);
    }
  };

  // Step 3 -> Generate Pleadings (Dual Track)
  const handleSaveGlobal = () => {};
  const handleGeneratePleading = async (type: 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT') => {
    setIsLoadingPleading(true);
    setWorkflowError(null);
    try {
      const res = await apiClient.defenseGeneratePleading({
        pleadingType: type,
        clientInput: clientStatement,
        triageData: triageResult,
        mineData: mineScanResult,
        caseInfo: {
          caseType,
          courtName,
          caseNo,
          clientRole,
          clientName,
          opponentRole,
          opponentName,
          lawyerName
        }
      });
      if (type === 'LAWYER_PLEADING') {
        setLawyerPleading(res);
        setActiveOutputTab('LAWYER');
      } else {
        setPersonalPleading(res);
        setActiveOutputTab('PERSONAL');
      }
      if (res?.pleadingText) {
        addDocument({
          id: `defense-${type}-${Date.now()}`,
          kind: type,
          title: res.title || '防禦書狀',
          text: res.pleadingText,
          status: res.antiGhostVerification?.ghostCitationsFound ? 'NEEDS_HUMAN_REVIEW' : 'VERIFIED',
          sourceTool: 'DefenseWorkflowTool',
          createdAt: new Date().toISOString(),
          verification: res.antiGhostVerification
        });
      }
      setCurrentStage('OUTPUT');
      // Auto-trigger full AI citation verification check upon document generation
      if (res?.pleadingText) {
        handleFullVerify(type, res.pleadingText);
      }
    } catch (err: any) {
      console.error("Generate pleading failed:", err);
      setWorkflowError(err.message || '書狀產製失敗，請檢查網路或稍後再試');
    } finally {
      setIsLoadingPleading(false);
    }
  };

  // Explicit AI Full Citation Verification
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleFullVerify = async (targetTab?: 'LAWYER' | 'PERSONAL' | 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT', textToVerify?: string) => {
    const isLawyer = targetTab === 'LAWYER' || targetTab === 'LAWYER_PLEADING' || (activeOutputTab === 'LAWYER' && !targetTab);
    const text = textToVerify || (isLawyer ? lawyerPleading?.pleadingText : personalPleading?.pleadingText);
    if (!text) return;
    setIsVerifyingAi(true);
    setVerifyNotice(null);
    try {
      const verifyRes = await apiClient.toolboxVerifyCitations({ documentText: text });
      if (verifyRes?.antiGhostVerification) {
        if (isLawyer) {
          setLawyerPleading(prev => prev ? { ...prev, antiGhostVerification: verifyRes.antiGhostVerification } : null);
        } else {
          setPersonalPleading(prev => prev ? { ...prev, antiGhostVerification: verifyRes.antiGhostVerification } : null);
        }
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

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Export helper
  const handleDownloadTxt = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto" id="defense-workflow-root">

      <DefenseHeader 
        onLoadPreset1={() => handleLoadPreset(PRESET_CASES[0])}
        onLoadPreset2={() => handleLoadPreset(PRESET_CASES[1])}
        onLoadPreset3={() => handleLoadPreset(PRESET_CASES[2])}
      />

      <WorkflowFlowchart 
        currentStage={currentStage}
        setCurrentStage={setCurrentStage}
        triageResult={triageResult}
        mineScanResult={mineScanResult}
        lawyerPleading={lawyerPleading}
        personalPleading={personalPleading}
        isProcessing={isLoadingTriage || isLoadingMineScan || isLoadingPleading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-4 space-y-6">
          <CaseMetadataPanel 
            caseType={caseType}
            setCaseType={setCaseType}
            courtName={courtName}
            setCourtName={setCourtName}
            caseNo={caseNo}
            setCaseNo={setCaseNo}
            clientRole={clientRole}
            setClientRole={setClientRole}
            clientName={clientName}
            setClientName={setClientName}
            opponentRole={opponentRole}
            setOpponentRole={setOpponentRole}
            opponentName={opponentName}
            setOpponentName={setOpponentName}
            caseBackground={caseBackground}
            setCaseBackground={setCaseBackground}
            onSaveGlobal={() => {}}
            lawyerName={lawyerName}
            setLawyerName={setLawyerName}
          />
        </div>

        <div className="lg:col-span-8 space-y-6">
          {workflowError && (
            <div className="bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger)]/30 text-[var(--color-status-danger)] p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">工作流執行錯誤</h4>
                <p className="text-xs opacity-90">{workflowError}</p>
              </div>
            </div>
          )}

          {currentStage === 'INGEST' && (
            <Stage1Ingest 
              clientStatement={clientStatement}
              setClientStatement={setClientStatement}
              isLoadingTriage={isLoadingTriage}
              handleRunTriage={handleRunTriage}
            />
          )}

          {currentStage === 'B_POINT' && (
            <Stage2Triage 
              triageResult={triageResult}
              setCurrentStage={setCurrentStage}
              handleRunMineScan={handleRunMineScan}
            />
          )}

          {currentStage === 'PHASE_2' && (
            <Stage3Communication 
              currentStage={currentStage}
              triageResult={triageResult}
              gPointDecision={gPointDecision}
              setGPointDecision={setGPointDecision}
              handleRunMineScan={handleRunMineScan}
              isLoadingMineScan={isLoadingMineScan}
              copiedSection={copiedSection}
              handleCopyText={handleCopyText}
              handleGeneratePleading={handleGeneratePleading}
              isLoadingPleading={isLoadingPleading}
            />
          )}

          {currentStage === 'PHASE_3' && (
            <Stage4MineScan 
              mineScanResult={mineScanResult}
              handleGeneratePleading={handleGeneratePleading}
              isLoadingPleading={isLoadingPleading}
              copiedSection={copiedSection}
              handleCopyText={handleCopyText}
            />
          )}

          {currentStage === 'OUTPUT' && (
            <Stage5PleadingOutput 
              activeOutputTab={activeOutputTab}
              setActiveOutputTab={setActiveOutputTab}
              lawyerPleading={lawyerPleading}
              personalPleading={personalPleading}
              handleGeneratePleading={handleGeneratePleading}
              verifyNotice={verifyNotice}
              setVerifyNotice={setVerifyNotice}
              handleFullVerify={handleFullVerify}
              isVerifyingAi={isVerifyingAi}
              copiedSection={copiedSection}
              handleCopyText={handleCopyText}
              handleDownloadTxt={handleDownloadTxt}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default DefenseWorkflowTool;
