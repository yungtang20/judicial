import * as React from 'react';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import { LegalGuideHome } from './components/LegalGuideHome';
import { LitigationWorkspace } from './components/LitigationWorkspace';
import { JudicialAndAiChecker } from './components/JudicialAndAiChecker';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if ((this as any).state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-200">
          <h2 className="text-lg font-bold mb-2 text-rose-300">系統組件載入異常</h2>
          <p className="text-sm mb-4 text-slate-300">很抱歉，元件渲染時發生錯誤：</p>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono border border-rose-900/50 overflow-auto max-h-40 text-rose-300">
            {(this as any).state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 shadow-md transition-colors"
          >
            重新載入頁面
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  // Default to the intuitive Life Scenario Navigator
  const [activeTool, setActiveTool] = useState('guide');
  const [preselectedSubTab, setPreselectedSubTab] = useState<string | undefined>(undefined);
  const [preselectedToolId, setPreselectedToolId] = useState<string | undefined>(undefined);

  const handleGuideSelect = (toolId: string, subTab?: string, initialData?: any) => {
    setActiveTool(toolId);
    if (subTab) setPreselectedSubTab(subTab);
    if (initialData?.preselectedToolId) {
      setPreselectedToolId(initialData.preselectedToolId);
    }
  };

  const renderTool = () => {
    switch (activeTool) {
      // 1. 生活情境智能導診（首頁）
      case 'guide':
        return <LegalGuideHome onSelectTool={handleGuideSelect} />;

      // 2. 全生命週期法務與訴訟工作台
      case 'legalToolbox':
      case 'litigation':
      case 'smartAppeal':
      case 'defenseWorkflow':
      case 'appealDeadline':
      case 'issueTableGenerator':
      case 'evidenceListGenerator': {
        const subTabMap: Record<string, 'toolbox' | 'defense' | 'issues' | 'evidence' | 'appeal' | 'deadline'> = {
          legalToolbox: 'toolbox',
          smartAppeal: 'appeal',
          defenseWorkflow: 'defense',
          issueTableGenerator: 'issues',
          evidenceListGenerator: 'evidence',
          appealDeadline: 'deadline',
        };
        const initialTab = (preselectedSubTab as any) || subTabMap[activeTool] || 'toolbox';
        return <LitigationWorkspace initialTab={initialTab as any} initialToolId={preselectedToolId} />;
      }

      // 4. 判決檢索與 AI 防假檢核
      case 'checker':
      case 'docAiChecker':
      case 'judicialOpenData':
      case 'judgmentSearch': {
        const checkerTabMap: Record<string, 'antiGhost' | 'openData' | 'localSearch'> = {
          docAiChecker: 'antiGhost',
          judicialOpenData: 'openData',
          judgmentSearch: 'localSearch'
        };
        const initialCheckerTab = (preselectedSubTab as any) || checkerTabMap[activeTool] || 'antiGhost';
        return <JudicialAndAiChecker initialTab={initialCheckerTab} />;
      }

      default:
        return <LegalGuideHome onSelectTool={handleGuideSelect} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 font-sans text-slate-100">
      <Sidebar activeTool={activeTool} setActiveTool={(tool) => {
        setPreselectedSubTab(undefined);
        setActiveTool(tool);
      }} />
      <main className="flex-grow flex bg-slate-950 overflow-hidden">
        <ErrorBoundary>
          {renderTool()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
