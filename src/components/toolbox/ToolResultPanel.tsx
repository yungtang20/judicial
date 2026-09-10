import React, { useState } from 'react';
import { Copy, Download, Check, Printer } from 'lucide-react';
import { ToolDefinition } from '../../lib/legalToolRegistry';
import type { LegalToolboxResult } from '../../types';
import { UIConstants } from '../../constants/ui';

export interface ToolResultPanelProps {
  result: LegalToolboxResult | null;
  currentTool: ToolDefinition;
  isVerifyingAi: boolean;
  verifyNotice: string | null;
  onFullVerify: () => void;
  isLoading?: boolean;
  generationStage?: string;
}

export const ToolResultPanel: React.FC<ToolResultPanelProps> = ({ result, currentTool, isVerifyingAi, verifyNotice, onFullVerify, isLoading, generationStage }) => {
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[500px] items-center justify-center p-8 sticky top-6 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <h4 className="text-base font-bold text-slate-800">
            {generationStage === 'formatting' ? '書狀排版與格式化中...' : '法律涵攝與 AI 智能分析中...'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            系統正在依據法定構成要件檢核事實要素、導入三段論法格式，並即時執行防幽靈法條校驗，完成後將自動於此呈現。
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <span>處理進程：自動分析管線執行中</span>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !result.documentText) {
    return (
      <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl flex flex-col h-[400px] items-center justify-center p-8 sticky top-6 text-center space-y-2 text-slate-400">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-500">
            <Printer className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">尚未生成書狀</p>
          <p className="text-xs text-slate-500 max-w-xs">
            請於左側表單輸入案件事實要素後點擊「一鍵生成」，系統將自動分析並產出專業書狀。
          </p>
        </div>
      </div>
    );
  }

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
  const hasCalculation = result.calculationSummary && Object.keys(result.calculationSummary).length > 0;
  const hasChecklist = result.complianceChecklist && result.complianceChecklist.length > 0;

  return (
    <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
      {/* 執行結果顯示區塊：採高對比紙本白底閱讀區，與深色輸入表單具備鮮明識別區隔 */}
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[700px] lg:h-[800px] overflow-hidden sticky top-6">
        {/* 結果頂部列：極簡標題與操作按鈕，無多餘裝飾圖案 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">產製結果</span>
            <h3 className="font-bold text-[15px]">{result.title || currentTool.name}</h3>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex-1 sm:flex-none justify-center transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製' : '複製'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-500 text-xs font-semibold flex-1 sm:flex-none justify-center transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下載</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex-1 sm:flex-none justify-center transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>列印</span>
            </button>
          </div>
        </div>

        {/* 檢核狀態列：極簡條列化，移除繁複背景 */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
          {hasVerification ? (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${isVerifiedClean ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isVerifiedClean ? '法規檢驗通過' : '疑似無效引用'}
              </span>
              <span className="text-slate-600 text-[11px]">
                共檢核 {result.antiGhostVerification!.totalCitationsChecked} 處引用
                {result.antiGhostVerification!.ghostCitationsFound > 0 ? `（${result.antiGhostVerification!.ghostCitationsFound} 處異常）` : '，無幽靈法條'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-amber-800 text-[11px]">全篇法規引用尚未驗證</span>
              <button
                onClick={onFullVerify}
                disabled={isVerifyingAi}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-semibold text-[11px] transition-colors disabled:opacity-50"
              >
                {isVerifyingAi ? '驗證中...' : '立即檢驗引用'}
              </button>
            </div>
          )}
          {verifyNotice && (
            <span className="text-blue-700 text-[11px] block w-full">{verifyNotice}</span>
          )}
        </div>

        {/* 計算摘要：極簡清單排列 */}
        {hasCalculation && (
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 text-xs">
            <div className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">試算摘要清單</div>
            <div className="divide-y divide-slate-200">
              {Object.entries(result.calculationSummary!).map(([k, v]) => (
                <div key={k} className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-600">{k}</span>
                  <span className="font-semibold text-slate-900">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 法遵檢核清單：極簡直列呈現 */}
        {hasChecklist && (
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 text-xs">
            <div className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">法遵檢核項目</div>
            <div className="divide-y divide-slate-200">
              {result.complianceChecklist.map((chk, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={chk.passed ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {chk.passed ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-800">{chk.rule}</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">{chk.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 書狀內文預覽 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white print-container">
          <pre className="font-serif text-sm md:text-base leading-loose text-slate-800 whitespace-pre-wrap max-w-3xl mx-auto break-words pb-8">
            {result.documentText}
          </pre>
        </div>
      </div>
    </div>
  );
};
