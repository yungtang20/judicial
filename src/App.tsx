import React, { Suspense, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { trackToolUsage } from './components/RecentUsage';
import { ToolProvider, useToolContext } from './contexts/ToolContext';
import { GlobalUIProvider } from './contexts/GlobalUIContext';

import UnifiedEntry from './components/UnifiedEntry';
const LegalSdlcWorkbench = React.lazy(() => import('./components/LegalSdlcWorkbench').then(m => ({ default: m.default || m.LegalSdlcWorkbench })));
const LitigationWorkspace = React.lazy(() => import('./components/LitigationWorkspace').then(m => ({ default: m.default || m.LitigationWorkspace })));
const AgentChat = React.lazy(() => import('./components/AgentChat').then(m => ({ default: m.default || m.AgentChat })));
const JudicialAndAiChecker = React.lazy(() => import('./components/JudicialAndAiChecker').then(m => ({ default: m.default || m.JudicialAndAiChecker })));
const LegalProcessGuide = React.lazy(() => import('./components/LegalProcessGuide').then(m => ({ default: m.LegalProcessGuide })));
const CHECKER_TAB = {
  'anti-ghost': 'antiGhost',
  'open-data': 'openData',
  'local-search': 'localSearch'
} as const;

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
  const { route, handoff, navigate, handleSelectTool } = useToolContext();

  useEffect(() => {
    trackToolUsage(route);
  }, [route]);
  const handoffKey = handoff ? JSON.stringify(handoff) : 'none';

  const renderContent = () => {
    switch (route.view) {
      case 'analysis':
        return <UnifiedEntry />;
      case 'litigation':
        return (
          <LitigationWorkspace
            key={`litigation:${route.section}:${handoffKey}`}
            root="litigation"
            section={route.section}
            handoff={handoff}
            onSectionChange={section => navigate(route.view === 'appeal' ? { view: 'appeal', section } : { view: 'litigation', section }, handoff)}
          />
        );
      case 'appeal':
        return (
          <LitigationWorkspace
            key={`appeal:${route.section}:${handoffKey}`}
            root="appeal"
            section={route.section}
            handoff={handoff}
            onSectionChange={section => navigate({ view: 'appeal', section }, handoff)}
          />
        );
      case 'process-guide':
        return <LegalProcessGuide onNavigateToTool={handleSelectTool} />;
      case 'sdlc':
        return <LegalSdlcWorkbench />;
      case 'agent-chat':
        return <AgentChat />;
      case 'checker':
        return <JudicialAndAiChecker initialTab={CHECKER_TAB[route.section]} />;
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
