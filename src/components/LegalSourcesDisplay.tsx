import React, { useState } from 'react';
import { BookOpen, AlertCircle, Database, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { LegalSearchSources } from '../lib/twLegalRagClient.js';

interface LegalSourcesDisplayProps {
  sources?: LegalSearchSources;
  isExternal?: boolean;
  statusMessage?: string;
  allowedCitations?: string[];
  theme?: 'light' | 'dark';
}

export function LegalSourcesDisplay({ sources, isExternal, statusMessage, allowedCitations, theme = 'light' }: LegalSourcesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources && !statusMessage) return null;

  const hasStats = sources && ((sources.statutes?.length || 0) > 0 || (sources.judgments?.length || 0) > 0 || (sources.references?.length || 0) > 0);

  const isDark = theme === 'dark';

  return (
    <div className={`mt-4 border rounded-xl overflow-hidden shadow-sm ${isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
      <div 
        className={`px-4 py-3 border-b flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isExternal ? (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') : (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700')}`}>
            {isExternal ? <Database className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              法律知識庫檢索來源
              {isExternal ? (
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-blue-100 text-blue-800'}`}>
                  外部連線 (TW-Legal-RAG)
                </span>
              ) : (
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-amber-900/30 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800'}`}>
                  {statusMessage?.includes('未啟用') ? '未設定外部檢索 (Local Fallback)' : '外部檢索連線失敗 (Local Fallback)'}
                </span>
              )}
            </h4>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{statusMessage || '已自動檢索相關法律見解供 AI 輔助參考'}</p>
          </div>
        </div>
        <div className={isDark ? 'text-slate-500' : 'text-slate-400'}>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {sources?.disclaimer && (
            <div className={`text-xs p-2 rounded flex gap-2 items-start ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <AlertCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <span>{sources.disclaimer}</span>
            </div>
          )}

          {sources?.statutes && sources.statutes.length > 0 && (
            <div>
              <h5 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                <BookOpen className="w-3.5 h-3.5" /> 適用法規
              </h5>
              <ul className="space-y-2">
                {sources.statutes.map((item, idx) => (
                  <li key={idx} className={`text-sm p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.citation}</div>
                    <div className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.title}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sources?.judgments && sources.judgments.length > 0 && (
            <div>
              <h5 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                <Database className="w-3.5 h-3.5" /> 實務判決
              </h5>
              <ul className="space-y-2">
                {sources.judgments.map((item, idx) => (
                  <li key={idx} className={`text-sm p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.title}</div>
                    <div className={`mt-1 text-xs line-clamp-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.excerpt}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sources?.references && sources.references.length > 0 && (
            <div>
              <h5 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                <BookOpen className="w-3.5 h-3.5" /> 行政函釋
              </h5>
              <ul className="space-y-2">
                {sources.references.map((item, idx) => (
                  <li key={idx} className={`text-sm p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.title}</div>
                    <div className={`mt-1 text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.excerpt}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasStats && (
            <div className={`text-sm italic py-2 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              此次查詢未命中具體法規或判決，已使用一般法律原則進行推論。
            </div>
          )}

          {allowedCitations && allowedCitations.length > 0 && (
            <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <CheckCircle className="w-3.5 h-3.5" /> 已載入防幽靈引用白名單
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {allowedCitations.map((c, i) => (
                  <span key={i} className={`px-2 py-0.5 border rounded text-[10px] font-medium ${isDark ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
