import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import {
  type AppRoute,
  type LegacyToolSelectionData,
  type RouteHandoff,
  canonicalizeRoute
} from '../types/navigation';
import { clearCrossFeatureContext } from '../lib/crossFeatureContext';

interface ToolContextValue {
  route: AppRoute;
  handoff?: RouteHandoff;
  navigate: (route: AppRoute, handoff?: RouteHandoff) => void;
  handleSelectTool: (toolId: string, subTab?: string, data?: LegacyToolSelectionData) => void;
}

const ToolContext = createContext<ToolContextValue | undefined>(undefined);

export function ToolProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<AppRoute>({ view: 'analysis' });
  const [handoff, setHandoff] = useState<RouteHandoff | undefined>(undefined);

  const navigate = useCallback((nextRoute: AppRoute, nextHandoff?: RouteHandoff) => {
    if (nextHandoff === undefined) {
      clearCrossFeatureContext();
    }
    setRoute(nextRoute);
    setHandoff(nextHandoff);
  }, []);

  const handleSelectTool = useCallback((
    toolId: string,
    subTab?: string,
    data: LegacyToolSelectionData = {}
  ) => {
    const normalized = canonicalizeRoute(toolId, subTab, data);
    const hasHandoff = Object.keys(normalized.handoff).length > 0;
    navigate(normalized.route, hasHandoff ? normalized.handoff : undefined);
  }, [navigate]);

  return (
    <ToolContext.Provider value={{ route, handoff, navigate, handleSelectTool }}>
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
