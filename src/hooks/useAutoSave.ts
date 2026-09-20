import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to manage auto-saving and restoring draft data from LocalStorage.
 * Debounces saves by 1.2 seconds to prevent performance degradation.
 * 
 * @param storageKey The LocalStorage key to use.
 * @param currentState The current state object to serialize and save.
 * @param onRestore Callback triggered when a saved draft is successfully loaded.
 */
export function useAutoSave<T>(
  storageKey: string,
  currentState: T,
  onRestore?: (savedData: T) => void
) {
  const isInitialMount = useRef(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved) as T;
        if (onRestore) {
          onRestore(data);
        }
        setLastSavedAt(new Date());
        console.log(`[useAutoSave] Successfully restored draft from ${storageKey}.`);
      }
    } catch (e) {
      console.warn(`[useAutoSave] Failed to load draft from ${storageKey}:`, e);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 2. Debounced Save to LocalStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    setIsSaving(true);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentState));
        setLastSavedAt(new Date());
        setIsSaving(false);
      } catch (e) {
        console.warn(`[useAutoSave] Failed to auto-save to ${storageKey}:`, e);
        setIsSaving(false);
      }
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [storageKey, currentState]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSavedAt(null);
    } catch (e) {
      console.warn(`[useAutoSave] Failed to clear draft from ${storageKey}:`, e);
    }
  }, [storageKey]);

  return { lastSavedAt, isSaving, clearDraft };
}
