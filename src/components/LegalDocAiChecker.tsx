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
import { verifyLegalCitations } from '../lib/services/citationCheck';
import { CitationVerificationResult } from '../types';
import { ExternalCitationResult } from '../lib/services/citationCheck';

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
  const [externalResults, setExternalResults] = useState<ExternalCitationResult[] | null>(null);
  const [isExternalChecking, setIsExternalChecking] = useState(false);

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

  const handleExternalCheck = async () => {
    const citations = [...new Set(documentInput.match(/(?:最高法院|高等法院)\s*[0-9０-９]+年(?:度)?\s*(?:台上|上|重上|台抗|抗|聲)字第\s*[0-9０-９]+號(?:判決|判例|裁定)/g) || [])];
    if (citations.length === 0) {
      setExternalResults([]);
      return;
    }
    setIsExternalChecking(true);
    try {
      const response = await fetch('/api/external-citations/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citations, consent: true })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '外部查詢失敗');
      setExternalResults(payload.results || []);
    } catch (error) {
      setExternalResults([{ citation: '批次查詢', status: 'unknown', exactMatch: false, source: 'dr-lawbot', message: error instanceof Error ? error.message : '外部查詢失敗', searchUrl: 'https://api.dr-lawbot.com/api/search' }]);
    } finally {
      setIsExternalChecking(false);
    }
  };

  const filteredCitations = scanResult?.results.filter(r => {
    if (filterType === 'GHOST_ONLY') return r.isGhostOrFake;
    if (filterType === 'VERIFIED_ONLY') return r.verified && !r.isGhostOrFake;
    return true;
  }) || [];

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto" id="legal-doc-ai-checker-root">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
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
              className="w-full p-3.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500 outline-none resize-none leading-relaxed"
            />

            <div className="pt-2">
              <button
                onClick={handleScan}
                disabled={isScanning || !documentInput.trim()}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-xs"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在執行本機引用規則比對...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-rose-200" />
                    立即啟動引用風險掃描
                  </>
                )}
              </button>
              <button
                onClick={handleExternalCheck}
                disabled={isExternalChecking || !documentInput.trim()}
                className="w-full mt-2 py-2 px-4 border border-slate-700 text-slate-300 hover:text-white hover:border-sky-500 rounded-xl disabled:opacity-50 transition-all text-xs"
              >
                {isExternalChecking ? '正在查詢第三方裁判字號資料庫...' : '外部裁判字號存在性覆核'}
              </button>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                提示：外部查驗僅將擷取之裁判字號送至第三方查詢，非官方官方終審判定，可隨時點擊驗證。
              </p>
            </div>
          </div>

          {externalResults && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-slate-200">外部交叉檢查結果（非官方核實）</div>
              {externalResults.length === 0 ? <p className="text-slate-400">文件中沒有可解析的裁判字號。</p> : externalResults.map((result) => (
                <div key={`${result.citation}-${result.status}`} className="flex items-start justify-between gap-3 border-t border-slate-800 pt-2">
                  <span className="text-slate-300">{result.citation}</span>
                  <span className={result.status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}>{result.status}：{result.message}</span>
                </div>
              ))}
            </div>
          )}

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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 min-h-[560px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    外部文件引用檢查報告
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
                      本機已知比對 ({scanResult.results.filter(r => r.verified && !r.isGhostOrFake).length})
                    </button>
                  </div>
                )}
              </div>

              {/* 檢核狀態摘要列：極簡無多餘裝飾圖案 */}
              {scanResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    scanResult.ghostCount > 0
                      ? 'bg-rose-950/30 border-rose-800 text-rose-200'
                      : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${scanResult.ghostCount > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                      {scanResult.ghostCount > 0 ? `發現 ${scanResult.ghostCount} 處異常` : '未發現異常'}
                    </span>
                    <span className="text-[11px] opacity-90">
                      {scanResult.ghostCount > 0
                        ? '包含虛構案號或不存在之法條項次，遞狀前請核對。'
                        : '符合司法實務引用標準（仍建議人工複核）。'}
                    </span>
                  </div>
                </div>
              )}

              {/* 極簡引用檢核清單排列，消除巢狀卡片 */}
              {scanResult ? (
                <div className="max-h-[380px] overflow-y-auto pr-1">
                  {filteredCitations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      無符合當前篩選條件之引述
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800 text-xs">
                      {filteredCitations.map((item, idx) => (
                        <div
                          key={idx}
                          className="py-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 font-mono">
                                {item.citationText}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({item.type === 'STATUTE' ? '法條' : '裁判字號'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.isGhostOrFake
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {item.isGhostOrFake ? '疑似幽靈案號' : item.verified ? '檢核相符' : '待查證'}
                              </span>
                              <a
                                href={item.officialSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-[11px]"
                              >
                                司法院 ↗
                              </a>
                            </div>
                          </div>

                          {/* 實務法定要旨：極簡字樣排列 */}
                          {item.officialSnippet && (
                            <p className="text-[11px] text-slate-400 leading-relaxed font-mono pl-2 border-l border-slate-700">
                              {item.officialSnippet}
                            </p>
                          )}

                          {/* 修正建議 */}
                          {item.correctionSuggestion && (
                            <p className="text-[11px] text-rose-300 leading-relaxed pl-2 border-l border-rose-700">
                              建議修正：{item.correctionSuggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2 bg-slate-950/30">
                  <p className="text-xs">請點選上方「開始掃描」以檢驗左方書狀內容之法規引用真確性</p>
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
                  className="px-3.5 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
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
