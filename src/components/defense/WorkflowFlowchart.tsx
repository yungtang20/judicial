import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { MineScanResult, DefenseTriageResult, GeneratedPleadingResult } from "../../types";

export interface WorkflowFlowchartProps {
  currentStage: string;
  setCurrentStage: (stage: 'INGEST' | 'B_POINT' | 'PHASE_2' | 'PHASE_3' | 'OUTPUT') => void;
  triageResult: DefenseTriageResult | null;
   
  mineScanResult: MineScanResult | null;
  lawyerPleading: GeneratedPleadingResult | null;
  personalPleading: GeneratedPleadingResult | null;
}

export const WorkflowFlowchart: React.FC<WorkflowFlowchartProps> = ({
  currentStage,
  setCurrentStage,
  triageResult,
  
  mineScanResult,
  lawyerPleading,
  personalPleading
}) => {
  return (
    <div className="mt-6 pt-5 border-t border-slate-800/80">
      <div className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> 雙軌防禦工作流程拓撲圖（點擊可快速瀏覽各階段）
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
        {/* Step 1 */}
        <div 
          onClick={() => setCurrentStage('INGEST')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            currentStage === 'INGEST' 
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-400">1. Ingest 輸入</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">陳述與案情</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">當事人原始對話、筆記、抱怨或補充意見輸入</p>
        </div>

        {/* Step 2 */}
        <div 
          onClick={() => triageResult && setCurrentStage('B_POINT')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            currentStage === 'B_POINT' 
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
              : triageResult ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-400">2. 【B點判定】</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              triageResult?.decision === 'TRACK_1_FACTS' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
            }`}>
              {triageResult ? (triageResult.decision === 'TRACK_1_FACTS' ? '有實益' : '無實益') : 'AI分流'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">具體人事時地物 vs 純情緒/法理拼貼分流</p>
        </div>

        {/* Step 3 */}
        <div 
          onClick={() => (triageResult?.decision === 'TRACK_1_FACTS') && setCurrentStage('PHASE_2')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            currentStage === 'PHASE_2' 
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
              : triageResult?.decision === 'TRACK_1_FACTS' ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-400">3. 【G點分歧】</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">律師溝通</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">引導說明風險或填答七大關鍵問卷</p>
        </div>

        {/* Step 4 */}
        <div 
          onClick={() => mineScanResult && setCurrentStage('PHASE_3')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            currentStage === 'PHASE_3' 
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
              : mineScanResult ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-400">4. 掃雷 (Phase 3)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300">六大地雷</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">掃描是否有「不利自認」或自證己罪風險</p>
        </div>

        {/* Step 5 */}
        <div 
          onClick={() => (lawyerPleading || personalPleading) && setCurrentStage('OUTPUT')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            currentStage === 'OUTPUT' 
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30 text-amber-200' 
              : (lawyerPleading || personalPleading) ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'opacity-60 bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-400">5. 書狀生成</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">雙軌產出</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">生成《代理人訴狀》或無風險之《個人陳報狀》</p>
        </div>
      </div>
    </div>
  );
};
