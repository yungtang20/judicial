import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToolContextType {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  initialData: any;
  setInitialData: (data: any) => void;
  handleSelectTool: (toolId: string, subTab?: string, data?: any) => void;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export function ToolProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState('unified');
  const [initialData, setInitialData] = useState<any>(undefined);

  const handleSelectTool = (toolId: string, subTab?: string, data?: any) => {
    if (typeof toolId !== 'string') return;
    const mergedData = {
      ...(data || {}),
      ...(subTab ? { initialTab: subTab } : {})
    };
    setInitialData(mergedData);
    setActiveTool(toolId);
  };

  return (
    <ToolContext.Provider
      value={{
        activeTool,
        setActiveTool,
        initialData,
        setInitialData,
        handleSelectTool,
      }}
    >
      {children}
    </ToolContext.Provider>
  );
}

export function useToolContext() {
  const context = useContext(ToolContext);
  if (context === undefined) {
    throw new Error('useToolContext must be used within a ToolProvider');
  }
  return context;
}
