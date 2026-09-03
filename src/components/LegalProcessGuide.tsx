import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  ShieldAlert, 
  AlertTriangle, 
  HeartHandshake, 
  PhoneCall, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw, 
  FileText, 
  Scale, 
  Sparkles, 
  Info,
  Clock,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Cpu,
  MessageSquareQuote,
  Layers,
  BookOpen,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { 
  filterSensitiveKeywords, 
  evaluateLegalProcess, 
  ProcessGuideInput, 
  ProcessGuideResult 
} from '../lib/legalProcessClassifier';
import { RouterEvaluationResult } from '../prompts/legalProcessPrompts';

interface LegalProcessGuideProps {
  onNavigateToTool?: (toolId: string, subTab?: string, initialData?: any) => void;
}

export const LegalProcessGuide: React.FC<LegalProcessGuideProps> = ({ onNavigateToTool }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // 表單資料狀態
  const [scenarioCategory, setScenarioCategory] = useState<string>('SEXUAL_HARM');
  const [narrative, setNarrative] = useState<string>('');
  const [relationship, setRelationship] = useState<ProcessGuideInput['relationship']>('SPOUSE');
  const [characteristics, setCharacteristics] = useState<string[]>([]);
  const [urgencyFlags, setUrgencyFlags] = useState({
    inImmediateDanger: false,
    needsMedicalOrInjury: false,
    happenedWithin72Hours: false
  });

  // 3-Node AI 狀態管理
  const [routerResult, setRouterResult] = useState<RouterEvaluationResult | null>(null);
  const [isEvaluatingRouter, setIsEvaluatingRouter] = useState<boolean>(false);
  const [questioningResult, setQuestioningResult] = useState<{
    rawMessage: string;
    suggestedOptions: string[];
  } | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(false);
  const [syllogismResult, setSyllogismResult] = useState<{
    legalElements: string;
    analysis: string;
  } | null>(null);
  const [isLoadingSyllogism, setIsLoadingSyllogism] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // 即時關鍵詞過濾檢測
  const liveKeywordResult = useMemo(() => {
    return filterSensitiveKeywords(narrative);
  }, [narrative]);

  // 評估引導結果
  const guideResult: ProcessGuideResult = useMemo(() => {
    return evaluateLegalProcess({
      scenarioCategory,
      narrative,
      relationship,
      characteristics,
      urgencyFlags
    });
  }, [scenarioCategory, narrative, relationship, characteristics, urgencyFlags]);

  const toggleCharacteristic = (charId: string) => {
    setCharacteristics(prev => 
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    );
  };

  const handleApplyPreset = (preset: {
    category: string;
    text: string;
    rel: ProcessGuideInput['relationship'];
    chars: string[];
  }) => {
    setScenarioCategory(preset.category);
    setNarrative(preset.text);
    setRelationship(preset.rel);
    setCharacteristics(preset.chars);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setNarrative('');
    setCharacteristics([]);
    setUrgencyFlags({
      inImmediateDanger: false,
      needsMedicalOrInjury: false,
      happenedWithin72Hours: false
    });
    setRouterResult(null);
    setQuestioningResult(null);
    setSyllogismResult(null);
  };

  // 節點 1：執行智能路由與完整度檢查
  const handleRunRouter = async () => {
    if (!narrative.trim()) return;
    setIsEvaluatingRouter(true);
    setQuestioningResult(null);
    try {
      const res = await fetch('/api/process/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: narrative.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRouterResult(data.data);
        // 若完整度不足，自動啟動節點 2 動態追問
        if (!data.data.is_complete) {
          handleRunQuestioning(data.data.missing_elements);
        }
      }
    } catch (err) {
      console.error('呼叫 /api/process/router 失敗:', err);
    } finally {
      setIsEvaluatingRouter(false);
    }
  };

  // 節點 2：動態追問話術生成
  const handleRunQuestioning = async (missingElements?: string[]) => {
    if (!narrative.trim()) return;
    setIsLoadingQuestion(true);
    try {
      const res = await fetch('/api/process/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingElements: missingElements || routerResult?.missing_elements || ['案發時間與關係人身分'],
          userInput: narrative.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setQuestioningResult(data.data);
      }
    } catch (err) {
      console.error('呼叫 /api/process/question 失敗:', err);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // 點選追問選項按鈕，自動追加至案情敘述
  const handleSelectOption = (option: string) => {
    const updated = narrative.trim() ? `${narrative.trim()}；【補充事實】：${option}` : option;
    setNarrative(updated);
  };

  // 節點 3：三段論涵攝引擎
  const handleRunSyllogism = async () => {
    if (!narrative.trim()) return;
    setIsLoadingSyllogism(true);
    try {
      const res = await fetch('/api/process/syllogism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userFacts: narrative.trim(),
          queryTopic: routerResult?.cause || guideResult.title || '法律要件涵攝'
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSyllogismResult(data.data);
      }
    } catch (err) {
      console.error('呼叫 /api/process/syllogism 失敗:', err);
    } finally {
      setIsLoadingSyllogism(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!syllogismResult?.analysis) return;
    navigator.clipboard.writeText(syllogismResult.analysis);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div id="legal-process-guide-container" className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6 text-slate-100">
      {/* 頁頭標題區 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4 text-indigo-400" />
            Interactive Legal Process & Safety Triage
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            法律流程引導與案件分類
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold">
              互動引導式
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
            透過結構化問答與即時關鍵詞篩查，第一時間辨識是否為性侵害、家暴或親屬相盜案件，提供緊急安全處置指引並導向最適法律途徑。
          </p>
        </div>

        {/* 113 / 110 緊急求助徽章 */}
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 shadow-inner">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-rose-300">緊急求助專線</div>
            <div className="text-slate-300 mt-0.5">
              保護專線 <strong className="text-rose-400 font-mono">113</strong> ｜ 報警專線 <strong className="text-rose-400 font-mono">110</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 步驟指示器 */}
      <div className="grid grid-cols-4 gap-2 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
        {[
          { num: 1, title: '爭議情境' },
          { num: 2, title: '事實陳述與篩查' },
          { num: 3, title: '關係人與危害特徵' },
          { num: 4, title: '分類結論與路徑' }
        ].map(step => (
          <button
            key={step.num}
            onClick={() => setCurrentStep(step.num)}
            className={`flex items-center justify-center md:justify-start gap-2 p-2.5 rounded-xl transition-all text-xs font-bold ${
              currentStep === step.num
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : currentStep > step.num
                ? 'bg-slate-800/80 text-indigo-300 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              currentStep === step.num 
                ? 'bg-white text-indigo-600 font-black' 
                : currentStep > step.num 
                ? 'bg-indigo-500/20 text-indigo-300' 
                : 'bg-slate-800 text-slate-500'
            }`}>
              {currentStep > step.num ? '✓' : step.num}
            </span>
            <span className="hidden md:inline">{step.title}</span>
          </button>
        ))}
      </div>

      {/* 步驟一：爭議情境選取 */}
      {currentStep === 1 && (
        <div className="space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">步驟 1：請問您遇到的是哪一類生活爭議或侵害？</h2>
            <p className="text-xs text-slate-400">請選取最接近的情境，系統將為您建立針對性的問答框架：</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: 'SEXUAL_HARM',
                title: '性侵害、性騷擾或私密影像遭散布',
                desc: '包含趁熟睡或意識不清性侵入、強吻猥褻、性騷擾、未經同意偷拍或散布性私密照。',
                icon: ShieldAlert,
                color: 'text-rose-400 border-rose-500/40 bg-rose-950/20',
                badge: '特別保護公訴重罪'
              },
              {
                id: 'DOMESTIC',
                title: '家庭成員或親密伴侶暴力糾紛',
                desc: '配偶、同居人、前男女友之肢體毆打、精神虐待、摔東西、威脅恐嚇或限制人身自由。',
                icon: HeartHandshake,
                color: 'text-amber-400 border-amber-500/40 bg-amber-950/20',
                badge: '家暴防治法／保護令'
              },
              {
                id: 'PROPERTY',
                title: '親屬竊盜、盜刷信用卡或侵占財產',
                desc: '伴侶或家人未經同意拿走皮夾盜刷信用卡、擅自提領存款、借錢不還或侵吞共有財產。',
                icon: Scale,
                color: 'text-sky-400 border-sky-500/40 bg-sky-950/20',
                badge: '親屬相盜／偽造文書'
              },
              {
                id: 'CIVIL_GENERAL',
                title: '一般民事契約、借貸、租賃或交通事故',
                desc: '民間欠款催討、房屋租賃點交押金、買賣瑕疵、一般車禍過失賠償或勞資資遣費爭議。',
                icon: FileText,
                color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20',
                badge: '民事救濟途徑'
              }
            ].map(cat => {
              const Icon = cat.icon;
              const isSelected = scenarioCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setScenarioCategory(cat.id);
                  }}
                  className={`text-left p-4 rounded-xl border transition-all relative ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${cat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm text-white">{cat.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                      {cat.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-10">
                    {cat.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* 快速範例填入按鈕 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              常見情境快速載入（點擊即可帶入測試）：
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset({
                  category: 'SEXUAL_HARM',
                  text: '我在熟睡意識不清時，配偶未經我的同意對我進行性交與口交，事後拒不認錯還恐嚇我。',
                  rel: 'SPOUSE',
                  chars: ['SEXUAL_INVASION', 'INCAPACITATED', 'THREAT_HARASS']
                })}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-xs text-rose-300 transition-colors"
              >
                乘機性交／性侵害情境
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset({
                  category: 'DOMESTIC',
                  text: '同居伴侶動手掐脖子毆打我，甚至拿刀恐嚇要殺我，把我打到全身瘀血。',
                  rel: 'COHABITANT',
                  chars: ['PHYSICAL_VIOLENCE', 'THREAT_HARASS']
                })}
                className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-xs text-amber-300 transition-colors"
              >
                家庭暴力與肢體衝突
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset({
                  category: 'PROPERTY',
                  text: '我老婆趁我睡覺時偷拿我的皮夾，把我皮夾裡的信用卡拿去百貨公司盜刷三萬元。',
                  rel: 'SPOUSE',
                  chars: ['THEFT_FRAUD']
                })}
                className="px-3 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/60 text-xs text-sky-300 transition-colors"
              >
                配偶親屬相盜與盜刷
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 transition-all"
            >
              下一步：填寫事實陳述
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 步驟二：事實陳述與即時敏感關鍵詞過濾 */}
      {currentStep === 2 && (
        <div className="space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">步驟 2：請描述事情發生的經過</h2>
            <p className="text-xs text-slate-400">
              系統會在您輸入時進行「即時敏感關鍵詞檢驗」，自動判斷是否具備高風險人身威脅：
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="請簡要描述：何時發生？在何處？對方做了什麼具體行為？您當時的狀態（如清醒、熟睡、醉酒等）以及後續對方的態度..."
              rows={5}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-100 placeholder-slate-500 transition-all leading-relaxed"
            />
          </div>

          {/* 即時敏感關鍵詞偵測面板 */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>即時關鍵詞篩查結果</span>
              </div>
              {liveKeywordResult.detectedKeywords.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  偵測到 {liveKeywordResult.detectedKeywords.length} 個關鍵特徵
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                  尚無特定風險關鍵詞
                </span>
              )}
            </div>

            {/* 偵測到的關鍵字標籤 */}
            {liveKeywordResult.detectedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {liveKeywordResult.detectedKeywords.map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                    🏷️ {kw}
                  </span>
                ))}
              </div>
            )}

            {/* 若偵測到性侵或家暴，彈出高層次防護提醒 */}
            {(liveKeywordResult.hasSexualAssaultKeywords || liveKeywordResult.hasDomesticViolenceKeywords) && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-700/60 text-xs text-rose-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  重要警示：偵測到涉及妨害性自主或家庭暴力關鍵情節
                </div>
                <p className="leading-relaxed text-slate-300">
                  此類案件依法享有特殊保護程序。若身體受有侵害，請留意<strong>72小時內避免沐浴洗漱更衣</strong>，並盡速至醫療院所進行驗傷採證；如目前有人身安全危險，請立刻尋求警察到場或致電 113 專線。
                </p>
              </div>
            )}
          </div>

          {/* 節點 1：智能路由與完整度檢查 */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    節點 1：智能路由與完整度檢查 (Router Prompt)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    分析案情描述並輸出標準結構化分流、敏感案件旗標及事實完整度。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunRouter}
                disabled={!narrative.trim() || isEvaluatingRouter}
                className="shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {isEvaluatingRouter ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI 分析分流中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>執行智能路由檢查</span>
                  </>
                )}
              </button>
            </div>

            {/* 節點 1 評估結果呈現 */}
            {routerResult && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">法律領域 (domain)</span>
                    <span className="text-xs font-bold text-indigo-300">{routerResult.domain}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">罪章/領域 (chapter)</span>
                    <span className="text-xs font-bold text-white truncate block">{routerResult.chapter}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">案由罪名 (cause)</span>
                    <span className="text-xs font-bold text-amber-300 truncate block">{routerResult.cause}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">敏感性 (is_sensitive)</span>
                    <span className={`text-xs font-bold ${routerResult.is_sensitive ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {routerResult.is_sensitive ? '⚠️ 敏感人身安全' : '一般爭議'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-medium">事實要素完整度 (is_complete)：</span>
                    {routerResult.is_complete ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        要件完整 (true)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        缺少關鍵事實 (false)
                      </span>
                    )}
                  </div>
                  {!routerResult.is_complete && (
                    <span className="text-[11px] text-amber-400">已自動觸發節點 2 動態追問</span>
                  )}
                </div>

                {routerResult.missing_elements && routerResult.missing_elements.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs space-y-1.5">
                    <span className="font-bold text-amber-300">缺少的關鍵事實（人、事、時、地、證據）：</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {routerResult.missing_elements.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 節點 2：動態追問 (Questioning Prompt) */}
          {(questioningResult || isLoadingQuestion) && (
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-indigo-300">
                <MessageSquareQuote className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  節點 2：同理心動態追問引導 (Questioning Prompt)
                </h3>
              </div>

              {isLoadingQuestion ? (
                <div className="flex items-center gap-2 text-xs text-indigo-300 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在為您生成簡明具體的追問問題與快捷選項...</span>
                </div>
              ) : questioningResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {questioningResult.rawMessage}
                  </div>

                  {questioningResult.suggestedOptions && questioningResult.suggestedOptions.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        快捷點選補充（點擊將自動追加至上方案情描述）：
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {questioningResult.suggestedOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>＋</span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              回上一步
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!narrative.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 transition-all"
            >
              下一步：確認身分與危害特徵
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 步驟三：關係人與危害特徵勾選 */}
      {currentStep === 3 && (
        <div className="space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">步驟 3：雙方身分關係與即時處境確認</h2>
            <p className="text-xs text-slate-400">
              在台灣法律中，身分關係（如配偶、同居人、親屬）會直接影響保護令管轄、告訴乃論與否及特定刑責減免：
            </p>
          </div>

          {/* 雙方關係 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">行為人與您的關係：</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'SPOUSE', label: '現有配偶（夫妻）' },
                { id: 'COHABITANT', label: '同居人（同住伴侶）' },
                { id: 'EX_PARTNER', label: '前配偶／前男女朋友' },
                { id: 'FAMILY', label: '血親／直系親屬／同住家人' },
                { id: 'COLLEAGUE', label: '職場主管／同事' },
                { id: 'STRANGER', label: '陌生人／非親友' },
                { id: 'OTHER', label: '其他關係' }
              ].map(rel => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => setRelationship(rel.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                    relationship === rel.id
                      ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {rel.label}
                </button>
              ))}
            </div>
          </div>

          {/* 行為特徵勾選 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">行為具體特徵（可複選）：</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { id: 'SEXUAL_INVASION', label: '性器官侵入／強迫口交／性交行為', badge: '妨害性自主' },
                { id: 'INCAPACITATED', label: '利用熟睡、昏醉、不能或不知抗拒狀態', badge: '乘機性交公訴' },
                { id: 'PHYSICAL_VIOLENCE', label: '肢體毆打／推擠掐脖／摔破家具器具', badge: '暴力傷害' },
                { id: 'PRIVATE_MEDIA', label: '未經同意拍攝或散布性私密照、裸照', badge: '數位性暴力' },
                { id: 'THREAT_HARASS', label: '威脅要殺、跟蹤騷擾、恐嚇生命安全', badge: '恐嚇騷擾' },
                { id: 'THEFT_FRAUD', label: '擅自拿取存摺金錢、盜刷信用卡', badge: '財產犯罪' }
              ].map(char => {
                const checked = characteristics.includes(char.id);
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => toggleCharacteristic(char.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                      checked
                        ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 font-medium'
                    }`}
                  >
                    <span>{char.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      checked ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {char.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 急迫處境切換 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300">目前緊急處境評估：</div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={urgencyFlags.inImmediateDanger}
                  onChange={(e) => setUrgencyFlags(prev => ({ ...prev, inImmediateDanger: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                />
                <span>加害人目前仍在現場或附近，我感到人身安全受立即威脅（建議立即報警 110）</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={urgencyFlags.needsMedicalOrInjury}
                  onChange={(e) => setUrgencyFlags(prev => ({ ...prev, needsMedicalOrInjury: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                />
                <span>身上有傷勢或遭性侵害，需要醫療處置與驗傷開立診斷書</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={urgencyFlags.happenedWithin72Hours}
                  onChange={(e) => setUrgencyFlags(prev => ({ ...prev, happenedWithin72Hours: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                />
                <span>事件發生在 72 小時之內（急診 DNA 採證黃金保存期）</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              回上一步
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 transition-all"
            >
              產出法律流程分類與指引報告
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 步驟四：精確分類與專屬路徑引導報告 */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* 報告頂部橫幅 */}
          <div className={`p-6 rounded-2xl border ${
            guideResult.isHighRiskSafety 
              ? 'bg-rose-950/40 border-rose-700/80' 
              : 'bg-indigo-950/40 border-indigo-700/80'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${
                  guideResult.isHighRiskSafety ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    案件法律屬性判定報告
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-white">
                    {guideResult.title}
                  </h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {guideResult.isHighRiskSafety && (
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    高風險人身保護案件
                  </span>
                )}
                {guideResult.isPublicProsecution ? (
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
                    ⚡ 非告訴乃論（公訴罪）
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                    ⚠️ 告訴乃論（注意6個月時效）
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {guideResult.legalAnalysis}
            </p>
          </div>

          {/* 安全處置與急診指引 */}
          {guideResult.safetyGuidelines.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                緊急處置與安全指引守則
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {guideResult.safetyGuidelines.map((guide, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    {guide}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推薦法律處理路徑（直通系統書狀） */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              推薦採取的法律行動路徑（點擊即可前往專屬工作區）
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guideResult.recommendedPaths.map(path => (
                <div
                  key={path.pathId}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-500/40 hover:border-indigo-400 transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-indigo-950/20"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {path.badge}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white leading-tight">
                      {path.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {path.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToTool) {
                        if (path.actionType === 'TOOLBOX' && path.targetToolId) {
                          onNavigateToTool('litigation', 'toolbox', { preselectedToolId: path.targetToolId });
                        } else {
                          onNavigateToTool('litigation', 'toolbox');
                        }
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <span>前往專屬書狀／工作台</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 節點 3：三段論涵攝引擎 (Syllogism Engine Prompt) */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-indigo-500/40 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      節點 3：三段論涵攝引擎 (Syllogism Engine)
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                      RAG 構成要件注入
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    結合知識庫動態抓取之法定構成要件，嚴格執行大前提、小前提、要件比對涵攝與法律結論。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSyllogism}
                disabled={!narrative.trim() || isLoadingSyllogism}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                {isLoadingSyllogism ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>RAG 檢索與涵攝計算中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{syllogismResult ? '重新執行涵攝分析' : '啟動三段論涵攝分析'}</span>
                  </>
                )}
              </button>
            </div>

            {/* 三段論結果展示 */}
            {syllogismResult ? (
              <div className="space-y-4 pt-1">
                {/* RAG 大前提構成要件預覽 */}
                {syllogismResult.legalElements && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>注入的大前提構成要件來源（由 tw-legal-rag / 知識庫檢索）：</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line font-mono text-[11px] bg-slate-900/60 p-2.5 rounded-lg">
                      {syllogismResult.legalElements}
                    </p>
                  </div>
                )}

                {/* 涵攝報告本文 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      三段論涵攝評估意見（嚴禁虛構未提供之事實）：
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAnalysis}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">已複製</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>複製涵攝報告</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                    {syllogismResult.analysis}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                點擊上方按鈕，AI 將自動從實務知識庫中抓取「大前提（法定要件）」並與您填寫的「小前提（案件事實）」進行嚴謹涵攝比對。
              </div>
            )}
          </div>

          {/* 適用法條依據與舉證清單雙欄 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 實體法條依據 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                適用實體法依據
              </h4>
              <ul className="space-y-2">
                {guideResult.statuteCitations.map((cit, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{cit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 舉證檢核清單 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                建議優先保全證據清單
              </h4>
              <ul className="space-y-2">
                {guideResult.evidenceChecklist.map((evi, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{evi}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 底部重測按鈕 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重新填寫引導表單
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              返回修改特徵
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
