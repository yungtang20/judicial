const STORAGE_KEY = 'judgment_analysis_history';

export interface AnalysisRecord {
  id: string;
  inputText: string;
  workflowState: any;
  timestamp: number;
  title: string;
}

export function loadHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(record: Omit<AnalysisRecord, 'id' | 'timestamp'>): AnalysisRecord {
  const history = loadHistory();
  const newRecord: AnalysisRecord = {
    ...record,
    id: crypto.randomUUID?.() || Date.now().toString(36),
    timestamp: Date.now(),
  };
  history.unshift(newRecord);
  // Keep max 50 records
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  return newRecord;
}

export function deleteFromHistory(id: string) {
  const history = loadHistory().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
