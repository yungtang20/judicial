import React, { useEffect, useState } from 'react';
import { Copy, Download, Check, Printer, FileText } from 'lucide-react';
import { ToolDefinition } from '../../lib/legalToolRegistry';
import type { LegalToolboxResult } from '../../types';
import { UIConstants } from '../../constants/ui';
import { FormatCheckerDisplay } from './FormatCheckerDisplay';
import {
  assertPleadingDocumentDeliveryAllowed,
  evaluatePleadingDelivery,
  verifyPleadingDeliveryAuthorization
} from '../../lib/finalGate/pleadingExportGate';

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
  const [verifiedResult, setVerifiedResult] = useState<{
    result: LegalToolboxResult;
    state: 'ALLOWED' | 'BLOCKED';
  } | null>(null);

  useEffect(() => {
    let current = true;
    if (!result?.documentText) {
      setVerifiedResult(null);
      return () => { current = false; };
    }

    void verifyPleadingDeliveryAuthorization(
      currentTool.id,
      result.pleadingDeliveryAuthorization,
      'RETURN',
      result.documentText
    ).then(decision => {
      if (current) setVerifiedResult({ result, state: decision.allowed ? 'ALLOWED' : 'BLOCKED' });
    }).catch(() => {
      if (current) setVerifiedResult({ result, state: 'BLOCKED' });
    });

    return () => { current = false; };
  }, [currentTool.id, result]);

  if (isLoading) {
    return (
      <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
        <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] rounded-xl flex flex-col h-[500px] items-center justify-center p-8 sticky top-6 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <h4 className="text-base font-bold text-[var(--color-text-primary)]">
            {generationStage === 'formatting' ? '書狀排版與格式化中...' : '法律涵攝與 AI 智能分析中...'}
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm leading-relaxed">
            系統正在依據法定構成要件檢核事實要素、導入三段論法格式，並即時執行防幽靈法條校驗，完成後將自動於此呈現。
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-status-info-bg)] text-[var(--color-status-info)] text-xs font-semibold">
            <span>處理進程：自動分析管線執行中</span>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !result.documentText) {
    return (
      <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
        <div className="bg-[var(--color-surface-raised)] border border-slate-800 rounded-xl flex flex-col h-[400px] items-center justify-center p-8 sticky top-6 text-center space-y-2 text-[var(--color-text-muted)]">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[var(--color-text-muted)]">
            <Printer className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">尚未生成書狀</p>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xs">
            請於左側表單輸入案件事實要素後點擊「一鍵生成」，系統將自動分析並產出專業書狀。
          </p>
        </div>
      </div>
    );
  }

  const returnDecision = evaluatePleadingDelivery(
    currentTool.id,
    result.pleadingDeliveryAuthorization,
    'RETURN'
  );
  const documentAuthorizationState = verifiedResult?.result === result
    ? verifiedResult.state
    : 'PENDING';

  if (!returnDecision.allowed) {
    return (
      <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
        <div
          className="bg-[var(--color-surface-raised)] border border-rose-900 rounded-xl flex flex-col h-[400px] items-center justify-center p-8 sticky top-6 text-center space-y-3"
          role="alert"
        >
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300">
            <Printer className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-rose-200">法院書狀交付已封鎖</p>
          <p className="text-xs text-slate-400 max-w-md">
            此結果未取得 P9 Final Gate 的 READY 授權，正文、複製、下載與列印功能均不提供。
          </p>
          <code className="text-[11px] text-rose-300">{returnDecision.code}</code>
        </div>
      </div>
    );
  }

  if (returnDecision.required && documentAuthorizationState !== 'ALLOWED') {
    return (
      <div className="lg:col-span-7 mt-8 lg:mt-0" id="preview-panel">
        <div
          className="bg-[var(--color-surface-raised)] border border-rose-900 rounded-xl flex flex-col h-[400px] items-center justify-center p-8 sticky top-6 text-center space-y-3"
          role="alert"
        >
          <p className="text-sm font-semibold text-rose-200">
            {documentAuthorizationState === 'PENDING' ? '正在核對 P9 文件指紋' : '法院書狀交付已封鎖'}
          </p>
          <p className="text-xs text-slate-400 max-w-md">
            P9 授權與目前文件內容尚未確認完全一致，正文及所有匯出操作均不提供。
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    await assertPleadingDocumentDeliveryAllowed(
      currentTool.id, result.pleadingDeliveryAuthorization, 'COPY', result.documentText
    );
    await navigator.clipboard.writeText(result.documentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = async () => {
    await assertPleadingDocumentDeliveryAllowed(
      currentTool.id, result.pleadingDeliveryAuthorization, 'DOWNLOAD_TEXT', result.documentText
    );
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

  const handleDownloadDoc = async () => {
    await assertPleadingDocumentDeliveryAllowed(
      currentTool.id, result.pleadingDeliveryAuthorization, 'DOWNLOAD_WORD', result.documentText
    );
    // 輸出相容 Microsoft Word 之 HTML 格式（.doc）
    // 依民事訴訟書狀規則第3條：A4大小、上下左右邊界2.5公分、14號以上字體、固定行高25-30pt、底部頁碼
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${result.title || currentTool.name}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 595.3pt 841.9pt; /* A4 size */
          margin: 70.9pt 70.9pt 70.9pt 70.9pt; /* 2.5cm margin = ~70.9pt */
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.WordSection1 { page: WordSection1; }
        body { font-family: '標楷體', 'DFKai-SB', serif; font-size: 14pt; line-height: 28pt; mso-line-height-rule: exactly; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 24pt; font-weight: bold; }
        p { margin-bottom: 0pt; line-height: 28pt; mso-line-height-rule: exactly; }
        /* 頁碼設定 */
        @page {
          @bottom-center {
            content: counter(page);
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
          }
        }
      </style>
      </head><body>
      <div class="WordSection1">
      <h1>${result.title || currentTool.name}</h1>
      <div>${result.documentText.split('\n').map(line => `<p>${line.replace(/\s/g, '&nbsp;')}</p>`).join('')}</div>
      </div>
      </body></html>`;

    const blob = new Blob(['\ufeff' + header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title || currentTool.name}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    await assertPleadingDocumentDeliveryAllowed(
      currentTool.id, result.pleadingDeliveryAuthorization, 'PRINT', result.documentText
    );
    const printWindow = window.open('', '', 'height=900,width=850');
    if (!printWindow) return;
    printWindow.document.write('<!DOCTYPE html><html><head><title>' + (result.title || currentTool.name) + '</title>');
    // 依民事訴訟書狀規則第3條：A4大小、上下左右邊界2.5公分、14號以上字體、固定行高25-30pt
    printWindow.document.write(`
      <style>
        @page { 
          size: A4 portrait; 
          margin: 25mm 25mm 25mm 25mm; /* 2.5公分邊界 */
        }
        body { 
          font-family: "Noto Serif TC", "Songti TC", "PMingLiU", "標楷體", serif; 
          color: #000; 
          background: #fff; 
          line-height: 28pt; /* 25-30點行高 */
          font-size: 14pt; /* 14號以上字體 */
          margin: 0; 
          padding: 0; 
        }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 30px; letter-spacing: 2px; }
        .content { white-space: pre-wrap; word-break: break-word; text-align: justify; }
        
        /* 模擬頁腳的頁碼顯示 (列印時瀏覽器預設會接管頁首頁腳，這裡做一個基本樣式) */
        @media print { 
          body { width: 100%; } 
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<h1>${result.title || currentTool.name}</h1>`);
    printWindow.document.write(`<div class="content">${result.documentText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const hasVerification = !!result.antiGhostVerification;
  const isVerifiedClean = hasVerification && !result.antiGhostVerification?.ghostCitationsFound;
  const hasCalculation = result.calculationSummary && Object.keys(result.calculationSummary).length > 0;
  const hasChecklist = result.complianceChecklist && result.complianceChecklist.length > 0;

  return (
    <div className="lg:col-span-7 mt-6 lg:mt-0" id="preview-panel">
      {/* 執行結果顯示區塊：採高對比紙本白底閱讀區，手機版採 min-h-[500px] 自適應高度，桌面版採 h-[800px] 捲動 */}
      <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] rounded-xl flex flex-col min-h-[520px] sm:h-[700px] lg:h-[800px] overflow-hidden lg:sticky lg:top-6 shadow-sm">
        {/* 結果頂部列：極簡標題與操作按鈕，無多餘裝飾圖案 */}
        <div id="preview-actions-bar" className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] gap-3">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-[var(--color-status-info)] font-bold">產製結果</span>
            <h3 className="font-bold text-sm sm:text-[15px] line-clamp-1">{result.title || currentTool.name}</h3>
          </div>
          
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto">
            <button
              id="btn-copy-document"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] text-xs font-semibold justify-center transition-colors cursor-pointer min-h-[38px] active:scale-95"
              title="複製全文至剪貼簿"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製' : '複製'}</span>
            </button>
            <button
              id="btn-download-txt"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] text-xs font-semibold justify-center transition-colors cursor-pointer min-h-[38px] active:scale-95"
              title="下載純文字 TXT 檔"
            >
              <Download className="w-3.5 h-3.5" />
              <span>TXT</span>
            </button>
            <button
              id="btn-download-doc"
              onClick={handleDownloadDoc}
              className="flex items-center gap-1 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-sky-700 text-white hover:bg-sky-600 text-xs font-semibold justify-center transition-colors cursor-pointer shadow-xs min-h-[38px] active:scale-95"
              title="匯出為標準 Word 格式文件 (.doc)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
            <button
              id="btn-print-document"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2 py-2 sm:px-3 sm:py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white hover:opacity-90 text-xs font-semibold justify-center transition-opacity cursor-pointer shadow-xs min-h-[38px] active:scale-95"
              title="以標準 A4 規格列印或存為 PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 列印</span>
            </button>
          </div>
        </div>

        {/* 檢核狀態列：極簡條列化，移除繁複背景 */}
        <div className="px-4 py-2.5 bg-[var(--color-surface-raised)]/90 border-b border-[var(--color-border-subtle)] text-xs flex flex-wrap items-center justify-between gap-2">
          {hasVerification ? (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${isVerifiedClean ? 'bg-emerald-100 text-[var(--color-status-success)]' : 'bg-rose-100 text-[var(--color-status-danger)]'}`}>
                {isVerifiedClean ? '引用檢查未發現異常' : '疑似無效引用'}
              </span>
              <span className="text-[var(--color-text-secondary)] text-[11px]">
                共檢核 {result.antiGhostVerification!.totalCitationsChecked} 處引用
                {result.antiGhostVerification!.ghostCitationsFound > 0 ? `（${result.antiGhostVerification!.ghostCitationsFound} 處異常）` : '；此結果不等同法律合規'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[var(--color-status-warning)] text-[11px]">全篇法規引用尚未驗證</span>
              <button
                onClick={onFullVerify}
                disabled={isVerifyingAi}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-[var(--color-status-warning)] rounded-xl font-semibold text-[11px] transition-colors disabled:opacity-50"
              >
                {isVerifyingAi ? '驗證中...' : '立即檢驗引用'}
              </button>
            </div>
          )}
          {verifyNotice && (
            <span className="text-[var(--color-status-info)] text-[11px] block w-full">{verifyNotice}</span>
          )}
        </div>

        {/* 計算摘要：極簡清單排列 */}
        {hasCalculation && (
          <div className="px-4 py-3 bg-[var(--color-surface-raised)]/50 border-b border-[var(--color-border-subtle)] text-xs">
            <div className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">試算摘要清單</div>
            <div className="divide-y divide-slate-200">
              {Object.entries(result.calculationSummary!).map(([k, v]) => (
                <div key={k} className="py-1.5 flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">{k}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 法遵檢核清單：極簡直列呈現 */}
        {hasChecklist && (
          <div className="px-4 py-3 bg-[var(--color-surface-raised)]/50 border-b border-[var(--color-border-subtle)] text-xs">
            <div className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">法遵檢核項目</div>
            <div className="divide-y divide-slate-200">
              {result.complianceChecklist.map((chk, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={chk.passed ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {chk.passed ? '✓' : '✗'}
                    </span>
                    <span className="text-[var(--color-text-primary)]">{chk.rule}</span>
                  </div>
                  <span className="text-[var(--color-text-muted)] text-[11px]">{chk.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 格式自動校對面板 */}
        {currentTool.toolType === 'generator' && (
          <div className="px-4 sm:px-6 md:px-8 pt-4 bg-[var(--color-surface-overlay)]">
            <FormatCheckerDisplay documentText={result.documentText} />
          </div>
        )}

        {/* 書狀內文預覽：手機版 p-4 避免兩側過多留白被擠壓，字體 14px~16px 舒適閱讀 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[var(--color-surface-overlay)] print-container">
          <pre className="font-serif text-xs sm:text-sm md:text-base leading-relaxed sm:leading-loose text-[var(--color-text-primary)] whitespace-pre-wrap max-w-3xl mx-auto break-words pb-8 select-text">
            {result.documentText}
          </pre>
        </div>
      </div>
    </div>
  );
};
