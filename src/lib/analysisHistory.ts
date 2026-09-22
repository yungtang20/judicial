import { LegalWorkflowState } from './workflow/unifiedStateGraph';

export interface AnalysisRecord {
  id: string;
  title: string;
  inputText: string;
  timestamp: number;
  workflowState: LegalWorkflowState;
}

const STORAGE_KEY = 'judicial_analysis_history';

export function loadHistory(): AnalysisRecord[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveToHistory(entry: {
  inputText: string;
  workflowState: LegalWorkflowState;
  title: string;
}): AnalysisRecord {
  const record: AnalysisRecord = {
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: entry.title,
    inputText: entry.inputText,
    timestamp: Date.now(),
    workflowState: entry.workflowState,
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const history = loadHistory();
      const updated = [record, ...history.filter(h => h.id !== record.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to save history to localStorage', err);
  }
  return record;
}

export function deleteFromHistory(id: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const history = loadHistory();
      const updated = history.filter(h => h.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to delete history item', err);
  }
}

export function clearHistory(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Failed to clear history', err);
  }
}
