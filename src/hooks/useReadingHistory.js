import { useState, useCallback } from 'react';

/**
 * Hook for tracking reading history / trail.
 * Keeps state in memory; persistence is handled by useAutoSave.
 */
export function useReadingHistory(initialEntries = []) {
  const [history, setHistory] = useState(initialEntries);

  const addEntry = useCallback((entry) => {
    setHistory(prev => [
      ...prev,
      { ...entry, timestamp: Date.now(), id: crypto.randomUUID() },
    ]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const loadHistory = useCallback((entries) => {
    setHistory(entries || []);
  }, []);

  return { history, addEntry, clearHistory, loadHistory };
}
