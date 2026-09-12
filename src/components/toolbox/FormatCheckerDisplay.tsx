import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { verifyDocumentFormat, FormatCheckItem } from '../../lib/formatChecker';

interface FormatCheckerDisplayProps {
  documentText: string;
}

export const FormatCheckerDisplay: React.FC<FormatCheckerDisplayProps> = ({ documentText }) => {
  const checks = useMemo(() => verifyDocumentFormat(documentText), [documentText]);
  
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const allPassed = passedChecks === totalChecks;

  return (
    <div className="print:hidden mt-6 mb-4 border border-[var(--color-border-subtle)] rounded-xl overflow-hidden bg-[var(--color-surface-base)] shadow-sm">
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        allPassed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
      }`}>
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
          <h3 className={`font-semibold ${allPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
            法定應記載事項格式校對
          </h3>
        </div>
        <div className="text-sm font-medium">
          <span className={allPassed ? 'text-emerald-700' : 'text-amber-700'}>
            {passedChecks} / {totalChecks}
          </span>
          <span className="text-[var(--color-text-muted)] ml-1">項通過</span>
        </div>
      </div>
      
      <div className="p-4 bg-[var(--color-surface-base)]">
        {!allPassed && (
          <div className="mb-4 text-sm text-amber-700 bg-amber-50 flex items-start p-3 rounded-lg border border-amber-200">
            <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <p>
              系統偵測到此書狀可能有遺漏法定應記載事項（如民事訴訟法第116條規定）。
              若為正式遞交法院之書狀，建議您補齊下列標示為未通過之項目，以免遭法院裁定補正。
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          {checks.map((check: FormatCheckItem) => (
            <div key={check.id} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {check.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <div>
                <h4 className={`text-sm font-medium ${check.passed ? 'text-[var(--color-text-primary)]' : 'text-rose-600'}`}>
                  {check.name}
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
