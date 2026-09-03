import { useEffect, useRef } from 'react';

/**
 * Custom hook to manage auto-saving and restoring draft data from LocalStorage.
 * Debounces saves by 1.5 seconds to prevent performance degradation.
 * 
 * @param storageKey The LocalStorage key to use.
 * @param currentState The current state object to serialize and save.
 * @param onRestore Callback triggered when a saved draft is successfully loaded.
 */
export function useAutoSave<T>(
  storageKey: string,
  currentState: T,
  onRestore: (savedData: T) => void
) {
  const isInitialMount = useRef(true);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved) as T;
        onRestore(data);
        console.log(`[useAutoSave] Successfully restored draft from ${storageKey}.`);
      }
    } catch (e) {
      console.warn(`[useAutoSave] Failed to load draft from ${storageKey}:`, e);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Debounced Save to LocalStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentState));
      } catch (e) {
        console.warn(`[useAutoSave] Failed to auto-save to ${storageKey}:`, e);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [storageKey, currentState]);
}
