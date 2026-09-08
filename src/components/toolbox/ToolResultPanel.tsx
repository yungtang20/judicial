import React, { useState } from 'react';
import { Copy, Download, Check, Printer, Scale, SearchCheck, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ToolDefinition } from '../../lib/legalToolRegistry';
import type { LegalToolboxResult } from '../../types';

export interface ToolResultPanelProps {
  result: LegalToolboxResult | null;
  currentTool: ToolDefinition;
  isVerifyingAi: boolean;
  verifyNotice: string | null;
  onFullVerify: () => void;
}

export const ToolResultPanel: React.FC<ToolResultPanelProps> = ({ result, currentTool, isVerifyingAi, verifyNotice, onFullVerify }) => {
  const [copied, setCopied] = useState(false);

  if (!result || !result.documentText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.documentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.documentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title || currentTool.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Print</title>');
    printWindow.document.write('<style>body{font-family: serif; white-space: pre-wrap; line-height: 1.8; padding: 20px;} h1{text-align: center;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<h1>${result.title || currentTool.name}</h1>`);
    printWindow.document.write(`<div>${result.documentText.replace(/\n/g, '<br/>')}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const hasVerification = !!result.antiGhostVerification;
  const isVerifiedClean = hasVerification && !result.antiGhostVerification?.ghostCitationsFound;

  return (
    <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col h-[700px] lg:h-[800px] overflow-hidden sticky top-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Scale className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-[15px]">{result.title || currentTool.name}</h3>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm flex-1 sm:flex-none justify-center transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? '已複製' : '複製'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 text-xs font-semibold shadow-sm flex-1 sm:flex-none justify-center transition-colors"
            >
              <Download className="w-4 h-4" />
              下載
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm flex-1 sm:flex-none justify-center transition-colors"
            >
              <Printer className="w-4 h-4" />
              列印
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs">
          {hasVerification ? (
             <div className={`p-2.5 rounded-lg flex items-start gap-2 border ${isVerifiedClean ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {isVerifiedClean ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-bold mb-0.5">{isVerifiedClean ? '引用格式與法條驗證通過' : '發現疑似無效的幽靈法條引用 (Needs Review)'}</p>
                  <p className="opacity-90 leading-relaxed">
                    共檢查 {result.antiGhostVerification!.totalCitationsChecked} 處引用。
                    {result.antiGhostVerification!.ghostCitationsFound > 0 && ` 偵測到 ${result.antiGhostVerification!.ghostCitationsFound} 處異常。`}
                    本系統防護機制僅供參考，不具備法院正式裁判效力，遞狀前請務必人工二次確認。
                  </p>
                </div>
             </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 text-amber-700">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>尚未執行全篇法規引用驗證 (Anti-Ghost Citation)</span>
               </div>
               <button
                 onClick={onFullVerify}
                 disabled={isVerifyingAi}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md font-semibold transition-colors disabled:opacity-50"
               >
                 <SearchCheck className="w-3.5 h-3.5" />
                 {isVerifyingAi ? '驗證中...' : '立即掃描引用'}
               </button>
            </div>
          )}
          {verifyNotice && (
            <div className="mt-2 p-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
              {verifyNotice}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white print-container">
          <pre className="font-serif text-sm md:text-base leading-loose text-slate-800 whitespace-pre-wrap max-w-3xl mx-auto break-words pb-8">
            {result.documentText}
          </pre>
        </div>
      </div>
    </div>
  );
};
