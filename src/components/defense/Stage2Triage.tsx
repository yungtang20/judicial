import React from 'react';
import { MessageSquare, ShieldAlert, CheckCircle2, XCircle, Info, ChevronRight, FileText } from 'lucide-react';
import type { DefenseTriageResult } from '../../types';

export interface Stage2TriageProps {
  triageResult: DefenseTriageResult | null;
  setCurrentStage: (stage: 'INGEST' | 'B_POINT' | 'PHASE_2' | 'PHASE_3' | 'OUTPUT') => void;
  handleRunMineScan: () => void;
}

export const Stage2Triage: React.FC<Stage2TriageProps> = ({
  triageResult, setCurrentStage, handleRunMineScan
}) => {
  if (!triageResult) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">2</span>
            <h2 className="text-base font-bold text-slate-800">
              【B點判定結果】：
              {triageResult.decision === 'TRACK_1_FACTS' ? (
                <span className="text-emerald-600 ml-1.5">🟢 【有實益】含客觀具體事實/新證據線索</span>
              ) : (
                <span className="text-blue-600 ml-1.5">🟡 【無實益】多屬純法理拼貼/情緒空泛爭執</span>
              )}
            </h2>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            信心分數：{triageResult.confidenceScore}% · {triageResult.decisionReason}
          </p>
        </div>
        <div className="flex items-center gap-2 pl-8 sm:pl-0">
          <button
            onClick={() => setCurrentStage('PHASE_2')}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" /> 檢視溝通話術與問卷
          </button>
          <button
            onClick={handleRunMineScan}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> 執行自認地雷掃描
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Track 1 Facts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            有效事實萃取 (Track 1)
          </div>
          {triageResult.extractedFacts.length > 0 ? (
            <ul className="space-y-2">
              {triageResult.extractedFacts.map((fact: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500 italic p-3 text-center border border-dashed rounded-lg bg-slate-50">未萃取到任何具體有實益之事實。</div>
          )}
        </div>

        {/* Unfruitful Points */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
            <XCircle className="w-4 h-4 text-slate-400" />
            無實益/純情緒論點過濾 (Track 2)
          </div>
          {triageResult.unfruitfulPoints.length > 0 ? (
            <ul className="space-y-2">
              {triageResult.unfruitfulPoints.map((point: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 p-2.5 rounded-lg bg-slate-50 border border-slate-200 opacity-80">
                  <span className="text-slate-400 font-bold mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500 italic p-3 text-center border border-dashed rounded-lg bg-slate-50">無過濾項目。</div>
          )}
        </div>
      </div>
      
      {/* Evidence Requirements */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" /> 待舉證/待釐清清單
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {triageResult.evidenceRequirements.map((req: any, idx: number) => (
            <div key={idx} className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex flex-col gap-1.5">
              <div className="font-semibold text-xs text-blue-900">{req.issue}</div>
              <div className="text-xs text-slate-600 flex items-start gap-1">
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-blue-400 mt-0.5" />
                <span>建議：{req.suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
