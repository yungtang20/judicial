
import React from 'react';
import { Scale, FileText, CheckCircle2, ChevronRight, MessageSquare, Phone, Book, Download, Printer, FileCheck2, UserCheck, AlertOctagon, ShieldCheck, Check, Copy } from 'lucide-react';
import type { GeneratedPleadingResult } from '../../types';
import { LegalSourcesDisplay } from '../LegalSourcesDisplay';
import { AntiGhostBadge } from '../AntiGhostBadge';

export interface Stage5PleadingOutputProps {
  activeOutputTab: 'LAWYER' | 'PERSONAL';
  setActiveOutputTab: (t: 'LAWYER' | 'PERSONAL') => void;
  lawyerPleading: GeneratedPleadingResult | null;
  personalPleading: GeneratedPleadingResult | null;
  handleGeneratePleading: (type: 'LAWYER' | 'PERSONAL') => void;
  verifyNotice: string | null;
  setVerifyNotice: (notice: string | null) => void;
  handleFullVerify: (text: string) => void;
  isVerifyingAi: boolean;
  copiedSection: string | null;
  handleCopyText: (text: string, id: string) => void;
  handleDownloadTxt: (filename: string, content: string) => void;
}

export const Stage5PleadingOutput: React.FC<Stage5PleadingOutputProps> = ({
  activeOutputTab, setActiveOutputTab, lawyerPleading, personalPleading, handleGeneratePleading, verifyNotice, setVerifyNotice, handleFullVerify, isVerifyingAi, copiedSection, handleCopyText, handleDownloadTxt
}) => {
  return (
    <>
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
              <LegalSourcesDisplay 
                sources={lawyerPleading.legalSources}
                isExternal={lawyerPleading.isExternalRetrievalUsed}
                statusMessage={lawyerPleading.retrievalStatusMessage}
                allowedCitations={lawyerPleading.allowedCitations}
                theme="dark"
              />
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

    </>
  );
};
