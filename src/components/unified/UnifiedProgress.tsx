
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { UIConstants } from '../../constants/ui';

export interface UnifiedProgressProps {
  [key: string]: any;
}

export const UnifiedProgress: React.FC<UnifiedProgressProps> = (props) => {
  const { workflowState } = props;

  const steps = [
    { num: '1', label: '輸入文本', active: !!workflowState },
    { num: '2', label: '智慧分流', active: !!workflowState?.router },
    { 
      num: '3', 
      label: '要件比對', 
      active: !!workflowState?.router?.is_complete || workflowState?.currentStep === 'QUESTIONING',
      highlight: workflowState?.currentStep === 'QUESTIONING'
    },
    { num: '4', label: '法規要件', active: !!workflowState?.rag },
    { num: '5', label: '三段論涵攝', active: !!workflowState?.syllogism },
    { 
      num: '6', 
      label: '真確性檢核', 
      active: !!workflowState?.verification,
      success: workflowState?.verification?.passGate
    }
  ];

  return (
    <div className={UIConstants.cardSubtleCompact}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
              step.highlight
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : step.success
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : step.active
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step.highlight
                  ? 'bg-amber-600 text-white'
                  : step.success
                  ? 'bg-emerald-600 text-white'
                  : step.active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {step.num}
              </span>
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-700 hidden sm:block shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
