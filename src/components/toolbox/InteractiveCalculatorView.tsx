import React, { useState } from 'react';
import { 
  Calculator, 
  BookOpen, 
  Copy, 
  Check, 
  Info, 
  ShieldCheck, 
  FileText, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { LegalCalculatorConfig } from '../../types/legalTools';

export interface InteractiveCalculatorViewProps {
  config: LegalCalculatorConfig;
  onSendToDocument?: (clauseText: string) => void;
}

export const InteractiveCalculatorView: React.FC<InteractiveCalculatorViewProps> = ({ config, onSendToDocument }) => {
  // Initialize state with default values
  const [inputs, setInputs] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    config.inputs.forEach(inp => {
      init[inp.id] = inp.defaultValue;
    });
    return init;
  });

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'calc' | 'guide'>('calc');

  const handleInputChange = (id: string, value: any) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const result = config.calculate(inputs);

  const handleCopyClause = () => {
    navigator.clipboard.writeText(result.legalClause);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 頂部標題與模式切換標籤 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold mb-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>{config.categoryName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{config.title}</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{config.subtitle}</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'calc'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>互動試算</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'guide'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>法規與實務指引</span>
          </button>
        </div>
      </div>

      {activeTab === 'calc' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左側：互動參數輸入表單 */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                輸入評估條件
              </h3>
              <span className="text-[11px] text-slate-500">即時動態更新</span>
            </div>

            <div className="space-y-4 text-xs">
              {config.inputs.map(inp => (
                <div key={inp.id} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor={`input-${inp.id}`} className="font-semibold text-slate-300 text-xs sm:text-sm">
                      {inp.label}
                    </label>
                    {inp.suffix && <span className="text-[11px] text-slate-500">{inp.suffix}</span>}
                  </div>

                  {inp.type === 'select' ? (
                    <select
                      id={`input-${inp.id}`}
                      value={inputs[inp.id]}
                      onChange={(e) => handleInputChange(inp.id, e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 sm:py-2 text-slate-200 text-sm sm:text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      {inp.options?.map(opt => (
                        <option key={String(opt.value)} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : inp.type === 'number' ? (
                    <div className="relative">
                      <input
                        id={`input-${inp.id}`}
                        type="number"
                        min={inp.min}
                        max={inp.max}
                        step={inp.step || 1}
                        value={inputs[inp.id]}
                        onChange={(e) => handleInputChange(inp.id, Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 sm:py-2 text-slate-200 text-sm sm:text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      id={`input-${inp.id}`}
                      type="text"
                      value={inputs[inp.id]}
                      onChange={(e) => handleInputChange(inp.id, e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 sm:py-2 text-slate-200 text-sm sm:text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  )}

                  {inp.helperText && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">{inp.helperText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 右側：試算結果與條款輸出面板 */}
          <div className="lg:col-span-7 space-y-5">
            {/* 核心金額與數據指標卡片 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <h3 className="text-xs font-semibold text-blue-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                法定試算評估結論
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {result.summary.map((sum, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      sum.isHighlight
                        ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-950/20 sm:col-span-2'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <span className="text-xs text-slate-400 font-medium block">{sum.label}</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-xl sm:text-2xl font-black ${sum.isHighlight ? 'text-blue-300' : 'text-slate-100'}`}>
                        {sum.value}
                      </span>
                    </div>
                    {sum.note && (
                      <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">{sum.note}</p>
                    )}
                  </div>
                ))}
              </div>

              {result.breakdown && result.breakdown.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2.5">計算明細與參數對照</h4>
                  <div className="space-y-1.5">
                    {result.breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/40 last:border-0 gap-2">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-slate-200 font-mono font-medium text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.notice && (
                <div className="mt-4 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300/90 text-xs flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <p className="leading-relaxed">{result.notice}</p>
                </div>
              )}
            </div>

            {/* 可直接引用的標準契約/書狀條款 */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-200">法定標準約定條款（可直接複製帶入書狀）</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyClause}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>複製條款</span>
                      </>
                    )}
                  </button>
                  {onSendToDocument && (
                    <button
                      id="btn-send-clause-to-document"
                      type="button"
                      onClick={() => onSendToDocument(result.legalClause)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
                      title="直接將此算式結論與約定條款送往對應書狀產生器"
                    >
                      <span>帶入書狀產生器</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-3.5 sm:p-4 border border-slate-800/80 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-blue-500/30 overflow-x-auto">
                {result.legalClause}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 右側標籤：深度法規依據與實務指南 */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">專業法律依據與法院審酌實務說明</h3>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {config.guide.map((sec, idx) => (
              <div key={idx} className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                  {sec.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{sec.content}</p>

                {sec.statutes && sec.statutes.length > 0 && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 block">精選實體法規依據：</span>
                    {sec.statutes.map((st, sidx) => (
                      <div key={sidx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                        <div className="font-bold text-emerald-400 flex items-center gap-2">
                          <span>{st.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {st.article}
                          </span>
                        </div>
                        <p className="text-slate-300 font-serif leading-relaxed text-[11px]">{st.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sec.practicalTips && sec.practicalTips.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> 實務律師操作錦囊：
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1">
                      {sec.practicalTips.map((tip, tidx) => (
                        <li key={tidx} className="leading-relaxed">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sec.risksToAvoid && sec.risksToAvoid.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> 實務敗訴陷阱與風險提示：
                    </span>
                    <ul className="list-disc list-inside text-xs text-rose-300/90 space-y-1 pl-1">
                      {sec.risksToAvoid.map((risk, ridx) => (
                        <li key={ridx} className="leading-relaxed">{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
