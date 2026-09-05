import React from 'react';
import {
  DollarSign,
  ShieldAlert,
  AlertTriangle,
  Car,
  ArrowRight,
} from 'lucide-react';

export type QuickExample = {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType<{ className?: string }>;
  color: string;
  toolId: string;
  subTool?: string;
  badge?: string;
};

const QUICK_EXAMPLES: QuickExample[] = [
  {
    id: 'quick-loan',
    title: '借錢人沒還',
    desc: '朋友借款未還、借據到期催討無效？了解支付命令與存證信函程序。',
    icon: DollarSign,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    toolId: 'legalToolbox',
    subTool: 'DEMAND_LETTER_DEBT',
    badge: '民事',
  },
  {
    id: 'quick-assault',
    title: '被人打傷',
    desc: '遭他人傷害、推擠受傷？釐清告訴時效、驗傷流程與傷害罪告訴狀。',
    icon: ShieldAlert,
    color: 'from-rose-500/20 to-orange-500/20 border-rose-500/30 text-rose-400',
    toolId: 'legalToolbox',
    subTool: 'CRIMINAL_COMPLAINT_THEFT',
    badge: '刑事',
  },
  {
    id: 'quick-fraud',
    title: '被詐騙匯款',
    desc: '網路投資、交友詐騙、假拍賣？立即報警並生成加重詐欺告訴狀。',
    icon: AlertTriangle,
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400',
    toolId: 'legalToolbox',
    subTool: 'CRIMINAL_COMPLAINT_FRAUD',
    badge: '告訴',
  },
  {
    id: 'quick-admin',
    title: '罰單不服',
    desc: '交通違規或行政罰鍰有異議？了解陳述意見與訴願程序。',
    icon: Car,
    color: 'from-sky-500/20 to-blue-500/20 border-sky-500/30 text-sky-400',
    toolId: 'legalToolbox',
    subTool: 'CRIMINAL_COMPLAINT_TRAFFIC',
    badge: '行政',
  },
];

interface QuickExampleCardProps {
  example: QuickExample;
  onSelectTool: (toolId: string, subTab?: string, initialData?: any) => void;
  key?: string;
}

export function QuickExampleCard({ example, onSelectTool }: QuickExampleCardProps) {
  const Icon = example.icon;
  return (
    <button
      type="button"
      onClick={() => onSelectTool(example.toolId, undefined, { preselectedToolId: example.subTool })}
      className="group relative rounded-2xl p-4 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md hover:shadow-xl hover:shadow-indigo-500/10 text-left flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
    >
      {example.badge && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          {example.badge}
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${example.color} border flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
          {example.title}
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
          {example.desc}
        </p>
      </div>
      <div className="flex items-center text-xs font-semibold text-indigo-400 mt-auto pt-2 border-t border-slate-800/60 group-hover:text-indigo-300 transition-colors">
        <span>立即處理</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

interface QuickExamplesSectionProps {
  onSelectTool: (toolId: string, subTab?: string, initialData?: any) => void;
}

export function QuickExamplesSection({ onSelectTool }: QuickExamplesSectionProps) {
  return (
    <section aria-label="常見法律情境快速入口" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">⚡</span>
        <h2 className="text-sm font-bold text-slate-200">常見法律情境 · 一鍵處理</h2>
        <span className="text-[10px] text-slate-500 ml-auto">點選卡片直接進入工具</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_EXAMPLES.map((ex) => (
          <QuickExampleCard key={ex.id} example={ex} onSelectTool={onSelectTool} />
        ))}
      </div>
    </section>
  );
}
