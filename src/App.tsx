import * as React from 'react';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import SmartAppealAssistant from './components/SmartAppealAssistant';
import AppealDeadlineTool from './components/AppealDeadlineTool';
import JudgmentSearchTool from './components/JudgmentSearchTool';
import IssueTableGenerator from './components/IssueTableGenerator';
import EvidenceListGenerator from './components/EvidenceListGenerator';

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
        <div className="p-8 max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 rounded-xl text-red-900">
          <h2 className="text-lg font-bold mb-2">系統組件載入異常</h2>
          <p className="text-sm mb-4">很抱歉，元件渲染時發生錯誤：</p>
          <pre className="bg-white p-3 rounded text-xs font-mono border border-red-100 overflow-auto max-h-40">
            {(this as any).state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-700 text-white text-xs font-bold rounded hover:bg-red-800"
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
  const [activeTool, setActiveTool] = useState('smartAppeal');

  const renderTool = () => {
    switch (activeTool) {
      case 'smartAppeal':
        return <SmartAppealAssistant />;
      case 'appealDeadline':
        return <AppealDeadlineTool />;
      case 'judgmentSearch':
        return <JudgmentSearchTool />;
      case 'issueTableGenerator':
        return <IssueTableGenerator />;
      case 'evidenceListGenerator':
        return <EvidenceListGenerator />;
      default:
        return <SmartAppealAssistant />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-karoshi-bg font-sans">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      <main className="flex-grow flex bg-karoshi-content overflow-hidden">
        <ErrorBoundary>
          {renderTool()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

