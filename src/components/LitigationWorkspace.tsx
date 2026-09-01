import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  ShieldCheck, 
  Table, 
  FileSpreadsheet, 
  Clock, 
  Gavel,
  Briefcase
} from 'lucide-react';
import SmartAppealAssistant from './SmartAppealAssistant';
import { DefenseWorkflowTool } from './DefenseWorkflowTool';
import IssueTableGenerator from './IssueTableGenerator';
import EvidenceListGenerator from './EvidenceListGenerator';
import AppealDeadlineTool from './AppealDeadlineTool';
import { LegalToolbox } from './LegalToolbox';

interface LitigationWorkspaceProps {
  initialTab?: 'toolbox' | 'defense' | 'issues' | 'evidence' | 'appeal' | 'deadline';
  initialToolId?: string;
}

export const LitigationWorkspace: React.FC<LitigationWorkspaceProps> = ({ initialTab = 'toolbox', initialToolId }) => {
  // Determine main tab from initial tab
  const getInitialMainTab = () => {
    if (initialTab === 'toolbox') return 'toolbox';
    if (initialTab === 'defense') return 'defense';
    if (['issues', 'evidence'].includes(initialTab)) return 'issues_evidence';
    if (['appeal', 'deadline'].includes(initialTab)) return 'appeal_deadline';
    return 'toolbox';
  };

  const [activeMainTab, setActiveMainTab] = useState<'toolbox' | 'defense' | 'issues_evidence' | 'appeal_deadline'>(getInitialMainTab());
  
  // Keep track of subtabs
  const [issuesSubTab, setIssuesSubTab] = useState<'issues' | 'evidence'>(
    initialTab === 'evidence' ? 'evidence' : 'issues'
  );
  const [appealSubTab, setAppealSubTab] = useState<'appeal' | 'deadline'>(
    initialTab === 'deadline' ? 'deadline' : 'appeal'
  );

  useEffect(() => {
    setActiveMainTab(getInitialMainTab());
    if (initialTab === 'evidence' || initialTab === 'issues') {
      setIssuesSubTab(initialTab);
    }
    if (initialTab === 'appeal' || initialTab === 'deadline') {
      setAppealSubTab(initialTab);
    }
  }, [initialTab]);

  const mainTabs = [
    {
      id: 'toolbox',
      label: '實用法務與書狀',
      badge: '工具箱',
      icon: Briefcase,
      desc: '日常合約、存證信函與起訴狀產生器'
    },
    {
      id: 'defense',
      label: '雙軌訴訟防禦',
      badge: '防禦',
      icon: ShieldCheck,
      desc: '原告起訴主張 vs 被告抗辯攻防策略'
    },
    {
      id: 'issues_evidence',
      label: '爭點與證據清單',
      badge: '附表',
      icon: Table,
      desc: '法庭爭點對照表與調查證據聲請清單'
    },
    {
      id: 'appeal_deadline',
      label: '判決分析與上訴',
      badge: '救濟',
      icon: Scale,
      desc: '上訴理由書生成與 20 天期間試算'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* 頂部整合分頁導覽列 */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3.5 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">全生命週期法務與訴訟工作台</h1>
                <span className="hidden md:inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                  一站式服務
                </span>
              </div>
              <p className="text-xs text-slate-400">
                整合日常合約、起訴書狀、法庭攻防、爭點證據與上訴救濟
              </p>
            </div>
          </div>

          {/* 橫向切換主分頁 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            {mainTabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                  title={tab.desc}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`hidden md:inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                    isActive ? 'bg-slate-900/20 text-slate-900' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 子分頁切換列 (如果需要) */}
      {activeMainTab === 'issues_evidence' && (
        <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 flex justify-center">
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setIssuesSubTab('issues')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${issuesSubTab === 'issues' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Table className="w-3.5 h-3.5" />
              法庭爭點整理表
            </button>
            <button
              onClick={() => setIssuesSubTab('evidence')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${issuesSubTab === 'evidence' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              調查證據聲請清單
            </button>
          </div>
        </div>
      )}

      {activeMainTab === 'appeal_deadline' && (
        <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 flex justify-center">
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setAppealSubTab('appeal')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${appealSubTab === 'appeal' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Scale className="w-3.5 h-3.5" />
              判決分析與上訴狀
            </button>
            <button
              onClick={() => setAppealSubTab('deadline')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors ${appealSubTab === 'deadline' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              上訴法定期間試算
            </button>
          </div>
        </div>
      )}

      {/* 內容區塊 */}
      <div className="flex-1 overflow-y-auto">
        {activeMainTab === 'toolbox' && (
          <div className="p-4 md:p-8 max-w-[90rem] mx-auto h-full">
            <LegalToolbox initialToolId={initialToolId} />
          </div>
        )}
        
        {activeMainTab === 'defense' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <DefenseWorkflowTool />
          </div>
        )}
        
        {activeMainTab === 'issues_evidence' && issuesSubTab === 'issues' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <IssueTableGenerator />
          </div>
        )}
        
        {activeMainTab === 'issues_evidence' && issuesSubTab === 'evidence' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <EvidenceListGenerator />
          </div>
        )}
        
        {activeMainTab === 'appeal_deadline' && appealSubTab === 'appeal' && (
          <SmartAppealAssistant />
        )}
        
        {activeMainTab === 'appeal_deadline' && appealSubTab === 'deadline' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <AppealDeadlineTool />
          </div>
        )}
      </div>
    </div>
  );
};

