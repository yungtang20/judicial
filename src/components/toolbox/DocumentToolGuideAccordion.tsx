import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  FileCheck2, 
  Building2, 
  Coins, 
  AlertTriangle, 
  Info,
  Scale
} from 'lucide-react';
import { DocumentToolGuide } from '../../lib/documentToolGuides';

export interface DocumentToolGuideAccordionProps {
  guide: DocumentToolGuide;
}

export const DocumentToolGuideAccordion: React.FC<DocumentToolGuideAccordionProps> = ({ guide }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden text-xs">
      {/* 導引展開收合切換條 */}
      <button
        type="button"
        id="btn-toggle-tool-guide"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-900/80 hover:bg-slate-900 text-slate-200 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">法務指南 · 必備文件與法院管轄清冊</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                法定要件
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{guide.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400 font-medium text-[11px]">
          <span>{isOpen ? '收起指南' : '展開指南'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* 展開內容 */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-800/80 bg-slate-950/40">
          {/* 機關管轄與規費 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
                <Building2 className="w-3.5 h-3.5" />
                <span>管轄法院／受理機關</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{guide.courtOrAgency}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <Coins className="w-3.5 h-3.5" />
                <span>法定規費標準</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{guide.feeStandard}</p>
            </div>
          </div>

          {/* 辦理法定要件 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px]">
              <Scale className="w-3.5 h-3.5" />
              <span>法定辦理核心要件</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside pl-1">
              {guide.keyElements.map((el, idx) => (
                <li key={idx} className="leading-relaxed">{el}</li>
              ))}
            </ul>
          </div>

          {/* 必備佐證文件清冊 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>必備佐證文件清單</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside pl-1">
              {guide.requiredDocuments.map((doc, idx) => (
                <li key={idx} className="leading-relaxed">{doc}</li>
              ))}
            </ul>
          </div>

          {/* 法律指引章節（包含實務操作錦囊與風險提示） */}
          {guide.guideSections && guide.guideSections.length > 0 && (
            <div className="space-y-3 pt-2">
              {guide.guideSections.map((sec, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                  <h5 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-500 rounded-full" />
                    {sec.title}
                  </h5>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{sec.content}</p>

                  {sec.practicalTips && sec.practicalTips.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 space-y-1">
                      <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                        <Info className="w-3 h-3" /> 實務操作錦囊：
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 pl-1">
                        {sec.practicalTips.map((tip, tidx) => (
                          <li key={tidx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sec.risksToAvoid && sec.risksToAvoid.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 space-y-1">
                      <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 實務風險防範：
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-rose-300/90 space-y-0.5 pl-1">
                        {sec.risksToAvoid.map((risk, ridx) => (
                          <li key={ridx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
