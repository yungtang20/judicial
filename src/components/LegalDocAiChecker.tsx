import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  Scale, 
  Copy, 
  Check, 
  BookOpen,
  ArrowRight,
  HelpCircle,
  FileSearch,
  Filter,
  FileCode
} from 'lucide-react';
import { verifyLegalCitations } from '../lib/citationVerifier';
import { CitationVerificationResult } from '../types';

export const LegalDocAiChecker: React.FC = () => {
  const defaultSampleDoc = `民事準備書狀（範例）
案號：112年度訴字第1234號
股別：仁股

原告主張被告積欠借款新臺幣100萬元，並提出匯款單據為證。
惟查：
一、按消費借貸為要物契約，除金錢之交付外，尚須雙方有借貸之意思表示合致。依最高法院98年度台上字第1045號民事判決意旨：「消費借貸契約之成立，除金錢之交付外，尚須當事人間有借貸之合意，僅有匯款之事實，尚不足以證明雙方已成立借貸合意。」
二、對造雖主張依民事訴訟法第279條第5項規定，被告已默示自認云云。然查民事訴訟法第279條全文僅有3項規定，對造引述所謂「第5項」純屬虛構法條，顯無可採。
三、另對造所引「最高法院112年度台上字第99988號判決」謂匯款即推定借貸合意，經查司法院裁判書公開系統根本查無該案號，顯係AI語言模型憑空捏造之幽靈判決，有違最高法院43年台上字第377號判例所揭示之舉證責任分配法則。
四、又依民法第144條第1項規定，本件請求權縱令存在，亦早已罹於15年消滅時效，被告依法行使時效抗辯權，拒絕給付。

綜上所述，請 鈞院鑒核，依法駁回原告之訴。
`;

  const [documentInput, setDocumentInput] = useState(defaultSampleDoc);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    totalChecked: number;
    ghostCount: number;
    results: CitationVerificationResult[];
    sanitizedText: string;
  } | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'GHOST_ONLY' | 'VERIFIED_ONLY'>('ALL');
  const [copied, setCopied] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const res = verifyLegalCitations(documentInput);
      setScanResult(res);
      setIsScanning(false);
    }, 600);
  };

  const handleCopySanitized = () => {
    if (!scanResult?.sanitizedText) return;
    navigator.clipboard.writeText(scanResult.sanitizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCitations = scanResult?.results.filter(r => {
    if (filterType === 'GHOST_ONLY') return r.isGhostOrFake;
    if (filterType === 'VERIFIED_ONLY') return !r.isGhostOrFake;
    return true;
  }) || [];

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto" id="legal-doc-ai-checker-root">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <ShieldAlert className="w-80 h-80 text-rose-500" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> 司法院開放平台接地交叉比對
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 幽靈法條與假判決精準攔截
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            外部法律文件 AI 檢核器（External Legal Document Checker）
          </h1>

          <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
            專門獨立掃描對造書狀、外部律師文件、ChatGPT / Claude 等 AI 文件、網路法律文章及使用者匯入的法律文書；結果供人工複核，不代表官方認證。
          </p>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Text Area */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-sky-400" />
                <h2 className="font-bold text-slate-200 text-sm">貼上或匯入外部法律文件全文</h2>
              </div>
              <button
                onClick={() => setDocumentInput(defaultSampleDoc)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                載入幽靈判決測試範例
              </button>
            </div>

            <textarea
              value={documentInput}
              onChange={(e) => setDocumentInput(e.target.value)}
              placeholder="請貼上對造書狀、外部律師文件、AI 生成文件或網路法律文章..."
              rows={16}
              className="w-full p-3.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none resize-none leading-relaxed"
            />

            <div className="pt-2">
              <button
                onClick={handleScan}
                disabled={isScanning || !documentInput.trim()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在比對司法院法規與最高法院裁判資料庫...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-rose-200" />
                    立即啟動真實性與幽靈法條掃描
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Database Coverage Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" /> 本機已掛載之司法接地資料庫範圍：
            </div>
            <ul className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <li className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 全國法規資料庫民/刑/訴訟法
              </li>
              <li className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 司法院大法庭裁定與最高法院判例
              </li>
              <li className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 民訴第279條自認與第277條舉證法則
              </li>
              <li className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 消費借貸、時效抗辯與物之瑕疵裁判
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Scan Analysis & Ghost Warnings */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 min-h-[560px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    司法院真實性比對診斷報告
                  </h3>
                  <p className="text-xs text-slate-400">
                    {scanResult ? `掃描完成：共檢核 ${scanResult.totalChecked} 處法條及判決字號` : '等待掃描執行'}
                  </p>
                </div>

                {scanResult && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-1 text-[11px] rounded font-medium ${
                        filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      全部 ({scanResult.results.length})
                    </button>
                    <button
                      onClick={() => setFilterType('GHOST_ONLY')}
                      className={`px-2 py-1 text-[11px] rounded font-medium ${
                        filterType === 'GHOST_ONLY' ? 'bg-rose-600 text-white' : 'bg-rose-950/60 text-rose-300'
                      }`}
                    >
                      幽靈/異常 ({scanResult.ghostCount})
                    </button>
                    <button
                      onClick={() => setFilterType('VERIFIED_ONLY')}
                      className={`px-2 py-1 text-[11px] rounded font-medium ${
                        filterType === 'VERIFIED_ONLY' ? 'bg-emerald-600 text-white' : 'bg-emerald-950/60 text-emerald-300'
                      }`}
                    >
                      本機比對 ({scanResult.results.length - scanResult.ghostCount})
                    </button>
                  </div>
                )}
              </div>

              {/* Status Summary Banner */}
              {scanResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    scanResult.ghostCount > 0
                      ? 'bg-rose-950/50 border-rose-800/80 text-rose-200'
                      : 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                  }`}
                >
                  {scanResult.ghostCount > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-sm">
                      {scanResult.ghostCount > 0
                        ? `⚠️ 偵測到 ${scanResult.ghostCount} 處潛在幽靈法條或虛構裁判字號！`
                        : '✅ 全文引述法規與裁判字號均經司法院資料庫核實無誤！'}
                    </div>
                    <p className="opacity-90 leading-relaxed text-[11px]">
                      {scanResult.ghostCount > 0
                        ? '請務必參閱下方標記之具體條文項次或裁判案號進行修正，切勿直接遞送法院。'
                        : '本文書未包含任何虛構案號或不存在之法條項次，符合司法實務引用標準。'}
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Citation Breakdown Cards */}
              {scanResult ? (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredCitations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      無符合當前篩選條件之引述
                    </div>
                  ) : (
                    filteredCitations.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                          item.isGhostOrFake
                            ? 'bg-rose-950/40 border-rose-800 ring-1 ring-rose-700/50'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {item.isGhostOrFake ? (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            <span className="font-bold text-slate-200 font-mono text-xs">
                              {item.citationText}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.isGhostOrFake
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {item.isGhostOrFake ? '⚠️ 幽靈/虛構案號' : '司法院核實'}
                          </span>
                        </div>

                        {/* Snippet / Holding */}
                        {item.officialSnippet && (
                          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                            <span className="font-bold text-slate-200">實務/法定要旨：</span>
                            {item.officialSnippet}
                          </div>
                        )}

                        {/* Correction Suggestion if Fake */}
                        {item.correctionSuggestion && (
                          <div className="p-2 rounded bg-rose-950/70 border border-rose-800 text-[11px] text-rose-200 flex items-start gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">安全修正建議：</span>
                              {item.correctionSuggestion}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                          <span>類別：{item.type === 'STATUTE' ? '法律條文項次' : '最高法院裁判字號'}</span>
                          <a
                            href={item.officialSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            司法院官方查詢 <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-3 bg-slate-950/50">
                  <ShieldAlert className="w-10 h-10 text-slate-600 stroke-1" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-slate-300">尚未執行交叉比對</p>
                    <p>請於左側輸入或貼上書狀文字，系統將自動逐行比對司法資料庫</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Copy Cleaned Sanitized Version */}
            {scanResult && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {scanResult.ghostCount > 0
                    ? '已自動生成「過濾幽靈判決之安全替換版」'
                    : '書狀引用結構健全，可直接使用'}
                </span>
                <button
                  onClick={handleCopySanitized}
                  className="px-3.5 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已複製安全修正版' : '複製安全修正版書狀'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
