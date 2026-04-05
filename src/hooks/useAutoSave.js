import { useEffect, useRef, useCallback } from 'react';
import { saveWorkspace, saveHistory, saveDocument, createDebouncedSaver } from '../utils/storage';

/**
 * Hook that auto-saves workspace state to IndexedDB.
 * Debounces writes so rapid changes don't thrash the DB.
 */
export function useAutoSave(documentId, { nodes, connections, offset, zoom, history, documentData }) {
  const saverRef = useRef(null);
  const docSaverRef = useRef(null);

  // Create debounced savers once
  useEffect(() => {
    saverRef.current = createDebouncedSaver(async (docId, workspace) => {
      try {
        await saveWorkspace(docId, workspace);
      } catch (err) {
        console.warn('Auto-save workspace failed:', err);
      }
    }, 600);

    docSaverRef.current = createDebouncedSaver(async (doc) => {
      try {
        await saveDocument(doc);
      } catch (err) {
        console.warn('Auto-save document failed:', err);
      }
    }, 1000);
  }, []);

  // Save workspace on changes
  useEffect(() => {
    if (!documentId || !saverRef.current) return;
    saverRef.current(documentId, {
      nodes,
      connections,
      viewOffset: offset,
      viewZoom: zoom,
    });
  }, [documentId, nodes, connections, offset, zoom]);

  // Save history on changes
  useEffect(() => {
    if (!documentId || !history) return;
    const timer = setTimeout(() => {
      saveHistory(documentId, history).catch(err =>
        console.warn('Auto-save history failed:', err)
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [documentId, history]);

  // Save document data (text, footnotes) — only on initial load
  const saveDocumentData = useCallback((doc) => {
    if (!docSaverRef.current) return;
    docSaverRef.current(doc);
  }, []);

  return { saveDocumentData };
}
