import React, { Suspense, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { RecentUsage, trackToolUsage } from './components/RecentUsage';
import { Scale } from 'lucide-react';
import { ToolProvider, useToolContext } from './contexts/ToolContext';

const UnifiedEntry = React.lazy(() => import('./components/UnifiedEntry').then(m => ({ default: m.default || m.UnifiedEntry })));
const LegalGuideHome = React.lazy(() => import('./components/LegalGuideHome').then(m => ({ default: m.default || m.LegalGuideHome })));
const LegalSdlcWorkbench = React.lazy(() => import('./components/LegalSdlcWorkbench').then(m => ({ default: m.default || m.LegalSdlcWorkbench })));
const LitigationWorkspace = React.lazy(() => import('./components/LitigationWorkspace').then(m => ({ default: m.default || m.LitigationWorkspace })));
const AgentChat = React.lazy(() => import('./components/AgentChat').then(m => ({ default: m.default || m.AgentChat })));
const JudicialAndAiChecker = React.lazy(() => import('./components/JudicialAndAiChecker').then(m => ({ default: m.default || m.JudicialAndAiChecker })));

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e1a]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">載入中...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { activeTool, setActiveTool, initialData, handleSelectTool } = useToolContext();

  useEffect(() => {
    trackToolUsage(activeTool);
  }, [activeTool]);

  const renderContent = () => {
    switch (activeTool) {
      case 'unified':
        return <UnifiedEntry />;
      case 'guide':
        return <LegalGuideHome />;
      case 'sdlc':
        return <LegalSdlcWorkbench />;
      case 'litigation':
      case 'legalToolbox':
        return <LitigationWorkspace initialTab={initialData?.initialTab || 'toolbox'} initialToolId={initialData?.preselectedToolId} />;
      case 'appeal':
      case 'smartAppeal':
      case 'appealDeadline':
        return (
          <LitigationWorkspace
            initialTab={activeTool === 'appealDeadline' ? 'deadline' : 'appeal'}
            initialToolId={initialData?.preselectedToolId}
           
          />
        );
      case 'agent-chat':
        return <AgentChat />;
      case 'checker':
        return <JudicialAndAiChecker />;
      case 'docAiChecker':
        return <JudicialAndAiChecker />;
      case 'judgmentSearch':
        return <JudicialAndAiChecker />;
      default:
        return <UnifiedEntry />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0a0e1a] text-white overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<LoadingFallback />}>
          {/* Show RecentUsage at top when on unified entry */}
          {activeTool === 'unified' && (
            <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-6">
              {/* Hero header */}
              <div className="text-center space-y-2 pt-2 md:pt-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Scale className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-white">智慧法律書狀系統</h1>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  司法院資料庫整合 · AI 防幽靈法條 · StateGraph 自動化工作流
                </p>
              </div>

              {/* Recent Usage */}
              <RecentUsage />

              {/* Main content (UnifiedEntry will render below) */}
              <div className="pb-12">
                {renderContent()}
              </div>
            </div>
          )}

          {/* All other tools: full height, no extra chrome */}
          {activeTool !== 'unified' && renderContent()}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToolProvider>
      <AppContent />
    </ToolProvider>
  );
}
