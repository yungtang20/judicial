import React, { useMemo } from 'react';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import { verifyDocumentFormat, FormatCheckItem } from '../../lib/formatChecker';

interface FormatCheckerDisplayProps {
  documentText: string;
}

export const FormatCheckerDisplay: React.FC<FormatCheckerDisplayProps> = ({ documentText }) => {
  const checks = useMemo(() => verifyDocumentFormat(documentText), [documentText]);
  
  const missingCount = checks.filter(check => check.status === 'MISSING').length;

  return (
    <div className="print:hidden mt-6 mb-4 border border-[var(--color-border-subtle)] rounded-xl overflow-hidden bg-[var(--color-surface-base)] shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-amber-500/10 border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-amber-700">
            舊版文字指標（非合規判定）
          </h3>
        </div>
        <div className="text-sm font-medium">
          <span className="text-amber-700">{missingCount}</span>
          <span className="text-[var(--color-text-muted)] ml-1">項未偵測到文字指標</span>
        </div>
      </div>
      
      <div className="p-4 bg-[var(--color-surface-base)]">
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 flex items-start p-3 rounded-lg border border-amber-200">
          <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>本區只搜尋關鍵字，不能驗證內容正確性、法律合規或文件實體版面；不得作為可遞交法院的結論。</p>
        </div>
        
        <div className="space-y-3">
          {checks.map((check: FormatCheckItem) => (
            <div key={check.id} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {check.status === 'MISSING' ? (
                  <XCircle className="w-4 h-4 text-rose-500" />
                ) : check.status === 'NOT_APPLICABLE' ? (
                  <Info className="w-4 h-4 text-slate-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div>
                <h4 className={`text-sm font-medium ${check.status === 'MISSING' ? 'text-rose-600' : 'text-[var(--color-text-primary)]'}`}>
                  {check.name} — {check.status}
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {check.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
