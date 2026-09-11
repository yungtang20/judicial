import React, { Suspense, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { trackToolUsage } from './components/RecentUsage';
import { ToolProvider, useToolContext } from './contexts/ToolContext';
import { GlobalUIProvider } from './contexts/GlobalUIContext';

const UnifiedEntry = React.lazy(() => import('./components/UnifiedEntry').then(m => ({ default: m.default || m.UnifiedEntry })));
const LegalSdlcWorkbench = React.lazy(() => import('./components/LegalSdlcWorkbench').then(m => ({ default: m.default || m.LegalSdlcWorkbench })));
const LitigationWorkspace = React.lazy(() => import('./components/LitigationWorkspace').then(m => ({ default: m.default || m.LitigationWorkspace })));
const AgentChat = React.lazy(() => import('./components/AgentChat').then(m => ({ default: m.default || m.AgentChat })));
const JudicialAndAiChecker = React.lazy(() => import('./components/JudicialAndAiChecker').then(m => ({ default: m.default || m.JudicialAndAiChecker })));
const LegalProcessGuide = React.lazy(() => import('./components/LegalProcessGuide').then(m => ({ default: m.LegalProcessGuide })));

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-surface-base)]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-muted)] text-sm">載入中...</p>
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
        return <LitigationWorkspace initialTab={initialData?.initialTab || 'guide'} initialToolId={initialData?.preselectedToolId} />;
      case 'litigation':
        return <LitigationWorkspace initialTab={initialData?.initialTab === 'guide' ? 'toolbox' : initialData?.initialTab || 'toolbox'} initialToolId={initialData?.preselectedToolId} />;
      case 'processGuide':
        return <LegalProcessGuide onNavigateToTool={handleSelectTool} />;
      case 'sdlc':
        return <LegalSdlcWorkbench />;
      case 'legalToolbox':
        return <LitigationWorkspace initialTab={initialData?.initialTab || 'toolbox'} initialToolId={initialData?.preselectedToolId} />;
      case 'appeal':
      case 'smartAppeal':
      case 'appealDeadline':
        return (
          <LitigationWorkspace
            initialTab={initialData?.initialTab || (activeTool === 'smartAppeal' ? 'appeal' : 'deadline')}
            initialToolId={initialData?.preselectedToolId}
            appealOnly
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
    <div className="flex flex-col lg:flex-row h-screen bg-[var(--color-surface-base)] text-white overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<LoadingFallback />}>
          {renderContent()}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GlobalUIProvider>
      <ToolProvider>
        <AppContent />
      </ToolProvider>
    </GlobalUIProvider>
  );
}
