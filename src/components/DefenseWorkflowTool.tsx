import React, { useState } from 'react';
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
  // Case metadata & input states
  const [caseType, setCaseType] = useState<string>('civil');
  const [courtName, setCourtName] = useState<string>('臺灣臺北地方法院');
  const [caseNo, setCaseNo] = useState<string>('113年度訴字第2841號');
  const [clientRole, setClientRole] = useState<string>('被告');
  const [clientName, setClientName] = useState<string>('林小明');
  const [opponentRole, setOpponentRole] = useState<string>('原告');
  const [opponentName, setOpponentName] = useState<string>('高利祥');
  const [lawyerName, setLawyerName] = useState<string>('訴訟代理人律師');
  const [caseBackground, setCaseBackground] = useState<string>('');
  const [clientStatement, setClientStatement] = useState<string>(PRESET_CASES[0].rawStatement);

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
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <ShieldAlert className="w-80 h-80 text-amber-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> 訴訟防禦 × 當事人雙軌協同
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
                民訴§279自認防禦 · 7大問卷 · 責任隔離
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              AI 訴訟防禦與當事人雙軌工作流
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              依據臺灣訴訟審判實務，針對當事人原始陳述進行「B點實益分流」。有實益事實進入【律師專業攻防軌】；無實益情緒啟動【Phase 2 溝通話術與 7 大問卷】。當事人若堅持送交法院，則啟動【Phase 3 6大不利自認地雷掃描】並產製責任隔離之《個人陳報狀》。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleLoadPreset(PRESET_CASES[0])}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="載入借款自認案例"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" /> 載入借款自認爭議
            </button>
            <button
              onClick={() => handleLoadPreset(PRESET_CASES[1])}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="載入裝潢瑕疵案例"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> 載入工程瑕疵時效
            </button>
            <button
              onClick={() => handleLoadPreset(PRESET_CASES[2])}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="載入車禍過失案例"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> 載入車禍自述爭議
            </button>
          </div>
        </div>

        {/* Visual Workflow Flowchart Diagram */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> 雙軌防禦工作流程拓撲圖（點擊可快速瀏覽各階段）
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
            {/* Step 1 */}
            <div 
              onClick={() => setCurrentStage('INGEST')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                currentStage === 'INGEST' 
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400">1. Ingest 輸入</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">陳述與案情</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">當事人原始對話、筆記、抱怨或補充意見輸入</p>
            </div>

            {/* Step 2 */}
            <div 
              onClick={() => triageResult && setCurrentStage('B_POINT')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                currentStage === 'B_POINT' 
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
                  : triageResult ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400">2. 【B點判定】</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  triageResult?.decision === 'TRACK_1_FACTS' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                }`}>
                  {triageResult ? (triageResult.decision === 'TRACK_1_FACTS' ? '有實益' : '無實益') : 'AI分流'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">具體人事時地物 vs 純情緒/法理拼貼分流</p>
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => triageResult && setCurrentStage('PHASE_2')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                currentStage === 'PHASE_2' 
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
                  : triageResult ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400">3. Phase 2 溝通</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">話術+7問卷</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">發送風險評估、建議方向與對造證據核對問卷</p>
            </div>

            {/* Step 4 */}
            <div 
              onClick={() => mineScanResult && setCurrentStage('PHASE_3')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                currentStage === 'PHASE_3' 
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
                  : mineScanResult ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400">4. 【G點與自認掃描】</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  mineScanResult?.hasFatalMines ? 'bg-rose-950 text-rose-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {mineScanResult ? `${mineScanResult.totalMinesCount}個風險` : '6大地雷'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">堅持送件者執行民訴§279自認掃描與防禦</p>
            </div>

            {/* Step 5 */}
            <div 
              onClick={() => (lawyerPleading || personalPleading) && setCurrentStage('OUTPUT')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                currentStage === 'OUTPUT' 
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
                  : (lawyerPleading || personalPleading) ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400">5. 雙軌書狀產製</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">責任隔離</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">律師準備書狀 / 當事人個人陳報狀（律師不背書）</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form / Navigation Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                案件基礎資訊配置
              </h3>
              <span className="text-xs text-slate-400">用於自動具狀排版</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">訴訟類型</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'civil', label: '民事訴訟' },
                    { id: 'criminal', label: '刑事訴訟' },
                    { id: 'administrative', label: '行政訴訟' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCaseType(t.id)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-all ${
                        caseType === t.id
                          ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">受訴法院</label>
                  <input
                    type="text"
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">案號</label>
                  <input
                    type="text"
                    value={caseNo}
                    onChange={(e) => setCaseNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">我方稱謂 / 姓名</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={clientRole}
                      onChange={(e) => setClientRole(e.target.value)}
                      placeholder="被告"
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:border-amber-500 outline-none"
                    />
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="林小明"
                      className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">對造稱謂 / 姓名</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={opponentRole}
                      onChange={(e) => setOpponentRole(e.target.value)}
                      placeholder="原告"
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:border-amber-500 outline-none"
                    />
                    <input
                      type="text"
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      placeholder="高利祥"
                      className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">承辦/受任律師</label>
                <input
                  type="text"
                  value={lawyerName}
                  onChange={(e) => setLawyerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">爭端背景簡述（選填）</label>
                <textarea
                  value={caseBackground}
                  onChange={(e) => setCaseBackground(e.target.value)}
                  rows={5}
                  placeholder="簡述爭端原委、標的金額或主要抗辯主張..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Action Box */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-200/70 rounded-xl p-4 text-xs space-y-3">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-600" /> 臺灣訴訟審判實務防禦準則
            </div>
            <ul className="text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><strong>民訴§279自認：</strong>未經律師過濾之當事人個人意見陳報，極易自認不利事實，使對造免除舉證責任。</li>
              <li><strong>情緒 vs 證據：</strong>法官僅依客觀證據（民訴§222）判決，空泛爭執反易引起心證反感。</li>
              <li><strong>責任隔離：</strong>個人陳報狀尾端必須明確排除律師具名，維護律師專業獨立性與紀律。</li>
            </ul>
          </div>
        </div>

        {/* Right Stage Panel Column */}
        <div className="lg:col-span-8 space-y-6">
          {workflowError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-fadeIn">
              <span className="flex items-center gap-2 font-medium">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                {workflowError}
              </span>
              <button
                onClick={() => setWorkflowError(null)}
                className="text-rose-600 hover:text-rose-800 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* STAGE 1: INGEST INPUT */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">1</span>
                  當事人原始陳述、筆記與抱怨內容輸入
                </h2>
                <p className="text-xs text-slate-500">可直接貼上當事人之 LINE 對話、會議錄音摘要、手寫筆記或情緒性長文</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">
                {clientStatement.length} 字元
              </span>
            </div>

            <div>
              <textarea
                value={clientStatement}
                onChange={(e) => setClientStatement(e.target.value)}
                rows={7}
                placeholder="請在此輸入或貼上當事人所提供之原始文字..."
                className="w-full p-4 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-sans"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                系統將自動提取人事時地物、金流單據線索，並進行 B 點實益分流分析
              </div>
              <button
                onClick={handleRunTriage}
                disabled={isLoadingTriage || !clientStatement.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoadingTriage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    正在執行 B 點實益分流判定...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    執行【B點實益分流判定】
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STAGE 2: B-POINT TRIAGE RESULTS */}
          {triageResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">2</span>
                    <h2 className="text-base font-bold text-slate-800">
                      【B點判定結果】：
                      {triageResult.decision === 'TRACK_1_FACTS' ? (
                        <span className="text-emerald-600 ml-1.5">🟢 【有實益】含客觀具體事實/新證據線索</span>
                      ) : (
                        <span className="text-blue-600 ml-1.5">🟡 【無實益】多屬純法理拼貼/情緒空泛爭執</span>
                      )}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">
                    信心分數：{triageResult.confidenceScore}% · {triageResult.decisionReason}
                  </p>
                </div>

                <div className="flex items-center gap-2 pl-8 sm:pl-0">
                  <button
                    onClick={() => setCurrentStage('PHASE_2')}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 檢視溝通話術與問卷
                  </button>
                  <button
                    onClick={handleRunMineScan}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> 執行自認地雷掃描
                  </button>
                </div>
              </div>

              {/* Dual Column: Extracted Facts vs Unfruitful Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Track 1: Concrete Facts */}
                <div className="border border-emerald-200/80 bg-emerald-50/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      提煉出之客觀事實與待證清單（{triageResult.concreteFacts?.length || 0}項）
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      軌道一：律師專業攻防
                    </span>
                  </div>

                  {triageResult.concreteFacts && triageResult.concreteFacts.length > 0 ? (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {triageResult.concreteFacts.map((fact, idx) => (
                        <div key={fact.id || idx} className="bg-white border border-emerald-100 p-3 rounded-lg text-xs space-y-1.5 shadow-2xs">
                          <div className="font-semibold text-slate-800 flex items-center justify-between">
                            <span>#{idx + 1} {fact.factDescription}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              fact.strategicValue === 'HIGH' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-600'
                            }`}>
                              價值：{fact.strategicValue}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                            <div>時地：{fact.timeframe || '未載明'} / {fact.location || '現場'}</div>
                            <div>對象：{fact.involvedParties || '相關人'}</div>
                          </div>
                          <div className="text-[11px] text-emerald-800 bg-emerald-50/60 p-1.5 rounded border border-emerald-100/50">
                            <strong>待證事實：</strong>{fact.pendingProof}
                            {fact.evidenceClues && <div className="mt-0.5 text-slate-600"><strong>證據線索：</strong>{fact.evidenceClues}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-emerald-200">
                      陳述中未發現明確之客觀單據或時點事實，建議依問卷引導當事人補強。
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => handleGeneratePleading('LAWYER_PLEADING')}
                      disabled={isLoadingPleading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      納入《民事準備書狀/答辯狀》（由律師具狀簽章）
                    </button>
                  </div>
                </div>

                {/* Phase 2: Unfruitful Points */}
                <div className="border border-blue-200/80 bg-blue-50/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      過濾無實益/情緒/空泛爭點（{triageResult.unfruitfulPoints?.length || 0}項）
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Phase 2：啟動溝通
                    </span>
                  </div>

                  {triageResult.unfruitfulPoints && triageResult.unfruitfulPoints.length > 0 ? (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {triageResult.unfruitfulPoints.map((item, idx) => (
                        <div key={item.id || idx} className="bg-white border border-blue-100 p-3 rounded-lg text-xs space-y-1.5 shadow-2xs">
                          <div className="font-semibold text-slate-800">
                            爭議點：「{item.point}」
                          </div>
                          <div className="text-[11px] text-slate-600">
                            <strong>實務不採理由：</strong>{item.whyUnfruitful}
                          </div>
                          <div className="text-[11px] text-rose-700 bg-rose-50/60 p-1.5 rounded border border-rose-100/60">
                            <strong>法官心證風險：</strong>{item.judgePerspectiveRisk}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-blue-200">
                      未發現明顯之情緒謾罵或空泛無益爭點。
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => setCurrentStage('PHASE_2')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      產製三大標準溝通話術與 7 大問卷
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: PHASE 2 COMMUNICATION SCRIPT & 7 QUESTIONNAIRE */}
          {(currentStage === 'PHASE_2' || (triageResult && triageResult.section1EvidenceRiskAssessment)) && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">3</span>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      Phase 2：三大標準板塊話術與對造證據核對 7 大問卷
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">
                    供律師向當事人發送（Email / LINE / 備忘錄），引導當事人跳脫情緒、聚焦關鍵舉證
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-8 sm:pl-0">
                  <button
                    onClick={() => handleCopyText(
                      `${triageResult?.section1EvidenceRiskAssessment || ''}\n\n${triageResult?.section2LawyerAdvice || ''}\n\n【三、對造書狀與證據核對 7 大問卷】\n${(triageResult?.section3Questionnaire || []).map(q => `${q.qId}. ${q.title}：${q.question}\n（引導：${q.guideNote}）`).join('\n')}`,
                      'full_phase2'
                    )}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedSection === 'full_phase2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    一鍵複製全文話術
                  </button>
                </div>
              </div>

              {/* Section 1 & Section 2 Text Blocks */}
              <div className="space-y-4">
                {/* Block 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-600" /> 一、關鍵證據評估與訴訟風險說明
                    </h3>
                    <button
                      onClick={() => handleCopyText(triageResult?.section1EvidenceRiskAssessment || '', 'sec1')}
                      className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1"
                    >
                      {copiedSection === 'sec1' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} 複製
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {triageResult?.section1EvidenceRiskAssessment || '（請先執行 B 點判定以產製話術）'}
                  </p>
                </div>

                {/* Block 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" /> 二、律師建議之訴訟方向
                    </h3>
                    <button
                      onClick={() => handleCopyText(triageResult?.section2LawyerAdvice || '', 'sec2')}
                      className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1"
                    >
                      {copiedSection === 'sec2' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} 複製
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {triageResult?.section2LawyerAdvice || '（請先執行 B 點判定以產製話術）'}
                  </p>
                </div>
              </div>

              {/* Section 3: 7 Questions Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-emerald-600" /> 三、對造書狀與證據核對 7 大問卷
                  </h3>
                  <span className="text-xs text-slate-400">標準事實調查問卷模板</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-12 text-center">序號</th>
                        <th className="p-3 w-40">核對板塊</th>
                        <th className="p-3">引導提問與待證目標</th>
                        <th className="p-3 w-44">建議檢附之附件證據</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(triageResult?.section3Questionnaire || []).map((q) => (
                        <tr key={q.qId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400 text-center">{q.qId}</td>
                          <td className="p-3 font-bold text-slate-800">{q.title}</td>
                          <td className="p-3 space-y-1">
                            <div className="text-slate-800 font-medium">{q.question}</div>
                            <div className="text-[11px] text-slate-500"><strong>引導指引：</strong>{q.guideNote}</div>
                            <div className="text-[11px] text-emerald-700"><strong>待證標的：</strong>{q.targetFact}</div>
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            <span className="inline-block bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700 font-medium">
                              📎 {q.suggestedAttachment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* G-Point Forking Decision Panel */}
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-700" />
                      【G點判定】：當事人溝通後續態度分流
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    依據當事人對於 Phase 2 溝通話術之反饋，決定下一步防禦軌道走向：
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fork 1: Rational Cooperation */}
                  <div 
                    onClick={() => setGPointDecision('COOPERATE')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      gPointDecision === 'COOPERATE'
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        【態度一】回歸理性配合提供事實
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        走軌道一
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      當事人理解訴訟風險，配合提供具體單據或客觀事實，由律師納入《民事準備書狀/答辯狀》並具狀簽章。
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGPointDecision('COOPERATE');
                        handleGeneratePleading('LAWYER_PLEADING');
                      }}
                      disabled={isLoadingPleading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      生成《律師專業準備書狀/答辯狀》
                    </button>
                  </div>

                  {/* Fork 2: Insist Submitting Everything */}
                  <div 
                    onClick={() => setGPointDecision('INSIST_SUBMIT')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      gPointDecision === 'INSIST_SUBMIT'
                        ? 'bg-rose-50/90 border-rose-500 shadow-sm ring-1 ring-rose-400'
                        : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                        【態度二】堅持將全部意見送交法院
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        啟動 Phase 3
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      當事人堅持不改情緒文字與全部意見。律師啟動 6 大不利自認地雷掃描，並產製律師不背書之《當事人個人陳報狀》。
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGPointDecision('INSIST_SUBMIT');
                        handleRunMineScan();
                      }}
                      disabled={isLoadingMineScan}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoadingMineScan ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          正在掃描自認地雷...
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          執行【6大不利自認地雷掃描】
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: PHASE 3 - 6 ADMISSION MINE SCAN RESULTS */}
          {mineScanResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">4</span>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      Phase 3：民事訴訟法第 279 條【6 大不利自認地雷掃描結果】
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">
                    自認拘束力判定：共偵測出 {mineScanResult.totalMinesCount} 項潛在陷阱
                  </p>
                </div>
                <div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                    mineScanResult.hasFatalMines ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {mineScanResult.hasFatalMines ? '🔴 含有致命自認地雷' : '🟡 具備常規訴訟風險'}
                  </span>
                </div>
              </div>

              {/* Overall Summary Box */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                mineScanResult.hasFatalMines ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <AlertTriangle className="w-4 h-4" /> 自認風險綜合診斷
                </div>
                <p>{mineScanResult.overallRiskSummary}</p>
              </div>

              {/* Detailed Mine Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700">偵測出之自認陷阱清單：</h3>
                <div className="space-y-3">
                  {mineScanResult.mines.map((mine, idx) => (
                    <div 
                      key={mine.id || idx}
                      className={`border rounded-xl p-4 space-y-2 text-xs transition-all ${
                        mine.riskLevel === 'FATAL_ADMISSION' 
                          ? 'border-rose-300 bg-rose-50/40' 
                          : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mine.riskLevel === 'FATAL_ADMISSION' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {mine.riskLevel === 'FATAL_ADMISSION' ? '致命自認' : '戰術缺陷'}
                          </span>
                          #{idx + 1} {mine.mineName}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">依據：{mine.articleBasis}</span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/60 text-slate-800">
                        <strong>觸發原句：</strong><span className="text-rose-700 font-medium">「{mine.triggerQuote}」</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white/60 p-2.5 rounded border border-slate-200/50">
                          <strong className="text-rose-800">法律陷阱與後果：</strong>
                          <p className="text-slate-600 mt-0.5">{mine.legalTrap}</p>
                          <p className="text-rose-600 font-medium mt-1">⚠️ 審判後果：{mine.potentialConsequence}</p>
                        </div>
                        <div className="bg-emerald-50/60 p-2.5 rounded border border-emerald-100">
                          <strong className="text-emerald-800">建議安全修飾句型：</strong>
                          <p className="text-emerald-900 mt-0.5">{mine.modificationSuggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cleaned Suggestion Text */}
              {mineScanResult.cleanedTextSuggestion && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      去除致命自認後之當事人意見建議版（保留核心心聲但避開自認陷阱）
                    </span>
                    <button
                      onClick={() => handleCopyText(mineScanResult.cleanedTextSuggestion, 'cleaned_text')}
                      className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1"
                    >
                      {copiedSection === 'cleaned_text' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} 複製修飾版
                    </button>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                    {mineScanResult.cleanedTextSuggestion}
                  </p>
                </div>
              )}

              {/* Generation Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => handleGeneratePleading('CLIENT_PERSONAL_REPORT')}
                  disabled={isLoadingPleading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isLoadingPleading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在產製《當事人個人陳報狀》...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-rose-200" />
                      產製《民事/刑事陳報個人意見狀》（當事人個人具名·律師不背書）
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5: DUAL PLEADING OUTPUT DISPLAY */}
          {(lawyerPleading || personalPleading) && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">5</span>
                    <h2 className="text-base font-bold text-slate-800">
                      雙軌訴訟書狀產製與責任隔離檢閱
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">
                    嚴格遵守臺灣律師倫理與實務慣例，明確區分律師專業具名與當事人個人陳報
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold pl-8 sm:pl-0">
                  <button
                    onClick={() => {
                      if (!lawyerPleading) handleGeneratePleading('LAWYER_PLEADING');
                      setActiveOutputTab('LAWYER');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      activeOutputTab === 'LAWYER'
                        ? 'bg-white text-emerald-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    【軌道一】律師準備書狀
                  </button>
                  <button
                    onClick={() => {
                      if (!personalPleading) handleGeneratePleading('CLIENT_PERSONAL_REPORT');
                      setActiveOutputTab('PERSONAL');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      activeOutputTab === 'PERSONAL'
                        ? 'bg-white text-rose-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                    【軌道三】當事人個人陳報狀
                  </button>
                </div>
              </div>

              {/* Disclaimer Banner */}
              {activeOutputTab === 'PERSONAL' ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>【重要責任隔離說明】：</strong>
                    本陳報狀係由當事人以個人名義具名簽章陳報，原汁原味整併當事人意見與心聲。<strong>委任律師不列名、不蓋章、不予以法律背書</strong>，書狀末端業已自動附加法定責任隔離聲明條款。
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>【律師專業攻防書狀】：</strong>
                    本狀僅採納有實益之客觀事實、金流與單據線索，依爭點化架構撰寫並引用民訴§277條舉證責任，由訴訟代理人律師具名簽章。
                  </div>
                </div>
              )}

              {/* Verify Notice */}
              {verifyNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn shadow-xs">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {verifyNotice}
                  </span>
                  <button 
                    onClick={() => setVerifyNotice(null)} 
                    className="text-emerald-700 hover:text-emerald-900 text-xs ml-2 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Anti-Ghost Verification Guarantee */}
              <AntiGhostBadge 
                verification={activeOutputTab === 'LAWYER' ? lawyerPleading?.antiGhostVerification : personalPleading?.antiGhostVerification} 
              />

              {/* Pleading Preview Box */}
              <div className="relative border border-slate-300 rounded-xl bg-slate-900 text-slate-100 p-5 font-mono text-xs leading-relaxed max-h-120 overflow-y-auto shadow-inner">
                <pre className="whitespace-pre-wrap font-mono">
                  {activeOutputTab === 'LAWYER' 
                    ? (lawyerPleading?.pleadingText || '正在產製律師書狀...')
                    : (personalPleading?.pleadingText || '正在產製個人陳報狀...')}
                </pre>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500">
                  可直接複製全文或匯出標準 UTF-8 純文字檔供列印排版
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFullVerify()}
                    disabled={isVerifyingAi}
                    className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/80 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                    title="手動重新執行全篇法條與判例防虛構檢核"
                  >
                    {isVerifyingAi ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" />
                        檢核中...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        全篇 AI 檢核
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const text = activeOutputTab === 'LAWYER' ? lawyerPleading?.pleadingText : personalPleading?.pleadingText;
                      if (text) handleCopyText(text, 'pleading_output');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    {copiedSection === 'pleading_output' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    複製書狀全文
                  </button>

                  <button
                    onClick={() => {
                      const text = activeOutputTab === 'LAWYER' ? lawyerPleading?.pleadingText : personalPleading?.pleadingText;
                      const title = activeOutputTab === 'LAWYER' ? '民事準備書狀_律師具名.txt' : '民事陳報個人意見狀_當事人簽章.txt';
                      if (text) handleDownloadTxt(title, text);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> 下載書狀純文字檔
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> 列印預覽
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
