import React, { Suspense, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { trackToolUsage } from './components/RecentUsage';
import { ToolProvider, useToolContext } from './contexts/ToolContext';
import { GlobalUIProvider } from './contexts/GlobalUIContext';

import UnifiedEntry from './components/UnifiedEntry';
// SDLC 交付工作台是軟體工程工具，不是使用者功能。
// 保留元件供開發使用，但僅在開發環境掛載，正式建置不會載入這段。
const LegalSdlcWorkbench = import.meta.env.DEV
  ? React.lazy(() => import('./components/LegalSdlcWorkbench').then(m => ({ default: m.default || m.LegalSdlcWorkbench })))
  : null;
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

/** 該功能在目前環境未提供時的顯示。不暴露功能名稱，避免一般使用者困惑。 */
function UnavailableView() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[var(--color-surface-base)]">
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-slate-200">這個頁面目前無法使用</p>
        <p className="text-xs text-[var(--color-text-muted)]">請從左側選單選擇其他功能。</p>
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
            // 本分支的 route.view 已收斂為 'litigation'，與 'appeal' 比較的分支不可達。
            // 上訴視圖由下方 case 'appeal' 各自處理導航。
            onSectionChange={section => navigate({ view: 'litigation', section }, handoff)}
            onBackToAnalysis={() => navigate({ view: 'analysis' }, handoff)}
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
            onBackToAnalysis={() => navigate({ view: 'analysis' }, handoff)}
          />
        );
      case 'process-guide':
        return <LegalProcessGuide onNavigateToTool={handleSelectTool} />;
      case 'sdlc':
        // 正式環境不掛載 SDLC：即使路由被外部傳入也不渲染工程工具。
        return LegalSdlcWorkbench ? <LegalSdlcWorkbench /> : <UnavailableView />;
      case 'agent-chat':
        return <AgentChat />;
      case 'checker':
        return <JudicialAndAiChecker initialTab={CHECKER_TAB[route.section]} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[var(--color-surface-base)] text-white overflow-hidden font-sans">
      {/* 跳過功能選單，直接進入主要內容（WCAG 2.4.1 Bypass Blocks）。
          實測：鍵盤使用者在首頁必須連按 19 次 Tab，
          穿過側欄的 12 張功能卡、範例選單與備份按鈕，
          才到得了「案件事實描述」這個主要輸入框。
          此連結在未獲得焦點時完全隱藏，不影響畫面。 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:text-sm focus:font-bold focus:shadow-lg"
      >
        跳過功能選單，直接前往案件事實描述
      </a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
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
