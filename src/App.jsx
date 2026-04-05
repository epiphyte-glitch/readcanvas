import React, { useState, useRef, useCallback, useEffect } from 'react';
import { colors, fonts, GRID_SIZE } from './styles/tokens';
import { useCanvas } from './hooks/useCanvas';
import { useReadingHistory } from './hooks/useReadingHistory';
import { useAutoSave } from './hooks/useAutoSave';
import {
  saveDocument, getDocument, getWorkspace, getHistory,
  setMeta, getMeta, makeDocumentId, saveFile, getFile,
} from './utils/storage';
import Toolbar from './components/Toolbar';
import TextPanel from './components/TextPanel';
import PdfViewerCard from './components/PdfViewerCard';
import FootnoteCard from './components/FootnoteCard';
import AnnotationCard from './components/AnnotationCard';
import ImageCard from './components/ImageCard';
import ConnectionLines from './components/ConnectionLines';
import HistoryPanel from './components/HistoryPanel';
import UploadModal from './components/UploadModal';
import LibraryScreen from './components/LibraryScreen';

// Demo content for first-run experience
const DEMO_TEXT = `The history of the printed book is, in many ways, a history of marginalia. Long before the internet promised hyperlinked knowledge, readers were scribbling in margins, creating their own networks of meaning.[1]

The Gutenberg press, operational by 1440, did not merely reproduce text — it created a new relationship between reader and page.[2] Where manuscripts had been singular, precious objects, printed books became tools for thinking. Readers annotated freely, argued with authors, and cross-referenced between volumes.

This practice reached its zenith in the Renaissance, when scholars like Gabriel Harvey developed elaborate systems of marginal notation.[3] Harvey's copies of Livy are legendary among bibliographers — every page covered in careful annotations linking Roman history to Elizabethan politics.

The footnote itself emerged as a formalization of this impulse. Anthony Grafton traces its modern form to Pierre Bayle's Historical and Critical Dictionary of 1697.[4] Bayle's innovation was radical: he created pages where the footnotes overwhelmed the main text, sometimes occupying ninety percent of the page.

Digital reading promised to fulfill the footnote's implicit dream of infinite expandability.[5] A footnote could become a portal — not just to another page, but to another book, another archive, another mind entirely. Ted Nelson's Project Xanadu, conceived in 1960, imagined exactly this: a universal hypertext system where every document could link to every other.[6]

Yet most digital reading tools have failed to deliver on this promise. PDF readers replicate the static page. E-readers optimize for linear consumption. The spatial, associative, interconnected reading experience remains largely unrealized.[7]

What we need is not a better page viewer but a reading environment — a space where the book becomes a node in a larger constellation of knowledge, and the reader's journey through that constellation is itself preserved as a kind of knowledge.[8]`;

const DEMO_FOOTNOTES = {
  1: { text: "Heather Jackson, 'Marginalia: Readers Writing in Books' (Yale UP, 2001), especially chapters 2-4 on the social history of annotation.", author: 'Jackson, H.', year: 2001 },
  2: { text: "Elizabeth Eisenstein, 'The Printing Press as an Agent of Change' (Cambridge UP, 1979). Eisenstein's thesis remains foundational.", author: 'Eisenstein, E.', year: 1979 },
  3: { text: "Lisa Jardine and Anthony Grafton, 'Studied for Action: How Gabriel Harvey Read His Livy', Past & Present 129 (1990), pp. 30-78.", author: 'Jardine, L. & Grafton, A.', year: 1990 },
  4: { text: "Anthony Grafton, 'The Footnote: A Curious History' (Harvard UP, 1997). Grafton argues the footnote is an epistemological tool.", author: 'Grafton, A.', year: 1997 },
  5: { text: "Robert Coover, 'The End of Books', New York Times Book Review, June 21, 1992.", author: 'Coover, R.', year: 1992 },
  6: { text: "Ted Nelson, 'Literary Machines' (1981). Nelson coined 'hypertext' and envisioned bidirectional links — far more ambitious than the web.", author: 'Nelson, T.', year: 1981 },
  7: { text: "Naomi Baron, 'Words Onscreen: The Fate of Reading in a Digital World' (Oxford UP, 2015).", author: 'Baron, N.', year: 2015 },
  8: { text: "Echoes Vannevar Bush's 'memex' from 'As We May Think' (The Atlantic, July 1945) — a device for storing and retracing trails through knowledge.", author: 'Bush, V.', year: 1945 },
};

const DEMO_DOC_ID = 'demo_marginalia';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function App() {
  // Document state
  const [documentId, setDocumentId] = useState(DEMO_DOC_ID);
  const [documentName, setDocumentName] = useState('Demo: History of Marginalia');
  const [pages, setPages] = useState([{ pageNumber: 1, text: DEMO_TEXT, footnotes: [] }]);
  const [footnotes, setFootnotes] = useState(DEMO_FOOTNOTES);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfData, setPdfData] = useState(null);       // raw ArrayBuffer for PDF rendering
  const [extracting, setExtracting] = useState(false); // text extraction in progress

  // Canvas nodes and connections
  const [nodes, setNodes] = useState([
    { id: 'main-text', type: 'text-panel', x: 100, y: 60, width: 580, content: DEMO_TEXT },
  ]);
  const [connections, setConnections] = useState([]);

  // UI state
  const [view, setView] = useState('library'); // 'library' | 'canvas'
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // file from folder browser
  const [showHistory, setShowHistory] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Hooks
  const canvas = useCanvas();
  const { history, addEntry, clearHistory, loadHistory } = useReadingHistory();
  const canvasRef = useRef(null);

  // Auto-save to IndexedDB
  useAutoSave(documentId, {
    nodes,
    connections,
    offset: canvas.offset,
    zoom: canvas.zoom,
    history,
  });

  // Track save status visually
  const flashSave = useCallback(() => {
    setSaveStatus('saving');
    const t = setTimeout(() => setSaveStatus('saved'), 400);
    const t2 = setTimeout(() => setSaveStatus(null), 2500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  // Flash save indicator when nodes or connections change
  useEffect(() => {
    if (!loaded) return;
    const cleanup = flashSave();
    return cleanup;
  }, [nodes, connections]);

  // ─── Seed demo document on first run ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const lastDocId = await getMeta('lastDocumentId');
        if (!lastDocId) {
          // First run — save demo document so the library isn't empty
          await saveDocument({
            id: DEMO_DOC_ID,
            name: 'Demo: History of Marginalia',
            pages: [{ pageNumber: 1, text: DEMO_TEXT, footnotes: [] }],
            footnotes: DEMO_FOOTNOTES,
            totalPages: 1,
          });
        }
      } catch (err) {
        console.warn('Failed to seed demo document:', err);
      }
      setLoaded(true);
    })();
  }, []);

  // ─── Load a document by ID ────────────────────────────────────
  const loadDocument = useCallback(async (docId) => {
    try {
      const doc = await getDocument(docId);
      if (!doc) {
        console.warn('Document not found:', docId);
        setLoaded(true);
        return;
      }

      setDocumentId(doc.id);
      setDocumentName(doc.name);
      setPages(doc.pages || []);
      setFootnotes(doc.footnotes || {});
      setTotalPages(doc.totalPages || 1);
      setCurrentPage(1);

      // Load workspace (nodes, connections, view state)
      const workspace = await getWorkspace(doc.id);
      if (workspace) {
        setNodes(workspace.nodes || []);
        setConnections(workspace.connections || []);
        if (workspace.viewOffset) canvas.setOffset(workspace.viewOffset);
        if (workspace.viewZoom) canvas.setZoom(workspace.viewZoom);
      } else {
        // No workspace yet — create default text panel
        const firstPage = doc.pages?.[0];
        setNodes([{
          id: 'main-text', type: 'text-panel',
          x: 100, y: 60, width: 580,
          content: firstPage?.text || '',
        }]);
        setConnections([]);
        canvas.resetView();
      }

      // Load raw PDF binary if this document has one
      const fileData = await getFile(doc.id);
      setPdfData(fileData || null);

      // Load history
      const historyEntries = await getHistory(doc.id);
      loadHistory(historyEntries);

      await setMeta('lastDocumentId', doc.id);
    } catch (err) {
      console.warn('Failed to load document:', err);
    }
    setLoaded(true);
  }, [canvas, loadHistory]);

  // ─── Handle new file upload ───────────────────────────────────
  const handleFileLoaded = useCallback(async (data) => {
    const sizeKey = data.pdfData ? data.pdfData.byteLength : data.text.length;
    const docId = makeDocumentId(data.filename, sizeKey);

    const doc = {
      id: docId,
      name: data.filename,
      pages: data.pages,
      footnotes: data.footnotes,
      totalPages: data.totalPages,
      hasPdf: !!data.pdfData,
    };

    try {
      await saveDocument(doc);
      if (data.pdfData) await saveFile(docId, data.pdfData);
      await setMeta('lastDocumentId', docId);
    } catch (err) {
      console.warn('Failed to save document:', err);
    }

    setDocumentId(docId);
    setDocumentName(data.filename);
    setPages(data.pages);
    setFootnotes(data.footnotes);
    setTotalPages(data.totalPages);
    setCurrentPage(1);
    setPdfData(data.pdfData || null);

    if (data.pdfData) {
      // PDF: show the rendered PDF on the canvas
      setNodes([{
        id: 'main-pdf', type: 'pdf-viewer',
        x: 100, y: 60, width: 720,
        filename: data.filename,
        pdfData: data.pdfData,
      }]);
    } else {
      // EPUB / text: show extracted text panel
      const firstPage = data.pages[0];
      setNodes([{
        id: 'main-text', type: 'text-panel',
        x: 100, y: 60, width: 580,
        content: firstPage?.text || '',
      }]);
    }

    setConnections([]);
    canvas.resetView();

    clearHistory();
    addEntry({ type: 'document-loaded', filename: data.filename });
    setPendingFile(null);
    setShowUpload(false);
    setView('canvas');
  }, [addEntry, clearHistory, canvas]);

  // ─── Page navigation ──────────────────────────────────────────
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Update text panel content if present
    const pageData = pages.find(p => p.pageNumber === page);
    if (pageData) {
      setNodes(prev => prev.map(n =>
        n.id === 'main-text' ? { ...n, content: pageData.text } : n
      ));
    }
    addEntry({ type: 'page-changed', page });
  }, [pages, addEntry]);

  // ─── Extract text from current PDF ────────────────────────────
  const handleExtractText = useCallback(async () => {
    if (!pdfData || extracting) return;
    setExtracting(true);

    try {
      const { extractPdfText, flattenPages, collectFootnotes } = await import('./utils/pdf.js');

      // Build a File-like object from the stored ArrayBuffer
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const file = new File([blob], documentName);

      const result = await extractPdfText(file);
      const text = flattenPages(result.pages);
      const newFootnotes = collectFootnotes(result.pages);

      setPages(result.pages);
      setFootnotes(newFootnotes);

      // Persist extracted text
      await saveDocument({
        id: documentId,
        name: documentName,
        pages: result.pages,
        footnotes: newFootnotes,
        totalPages: result.totalPages,
        hasPdf: true,
      });

      // Add a text panel to the canvas if one doesn't exist yet
      setNodes(prev => {
        if (prev.find(n => n.id === 'main-text')) return prev;
        const pdfNode = prev.find(n => n.id === 'main-pdf');
        return [...prev, {
          id: 'main-text', type: 'text-panel',
          x: (pdfNode?.x ?? 100) + (pdfNode?.width ?? 720) + 40,
          y: pdfNode?.y ?? 60,
          width: 580,
          content: result.pages[0]?.text || text,
        }];
      });

      addEntry({ type: 'text-extracted', filename: documentName });
    } catch (err) {
      console.warn('Text extraction failed:', err);
    } finally {
      setExtracting(false);
    }
  }, [pdfData, extracting, documentId, documentName, addEntry]);

  // ─── Footnote click ───────────────────────────────────────────
  const handleFootnoteClick = useCallback((num, e) => {
    const fn = footnotes[num];
    if (!fn) return;

    const existingId = `footnote-${num}`;
    if (nodes.find(n => n.id === existingId)) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const pos = canvas.screenToCanvas(e.clientX, e.clientY, canvasRect);

    const newNode = {
      id: existingId,
      type: 'footnote',
      x: pos.x + 300,
      y: pos.y - 20,
      width: 340,
      number: num,
      footnote: fn,
    };

    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, { from: 'main-text', to: existingId }]);
    addEntry({ type: 'footnote-opened', number: num, text: fn.text });
  }, [footnotes, nodes, canvas, addEntry]);

  // ─── Canvas click (annotation placement) ──────────────────────
  const handleCanvasClick = useCallback((e) => {
    if (!annotationMode) return;
    if (e.target !== canvasRef.current && !e.target.dataset?.canvas) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const pos = canvas.screenToCanvas(e.clientX, e.clientY, canvasRect);

    setNodes(prev => [...prev, {
      id: generateId(),
      type: 'annotation',
      x: pos.x, y: pos.y, width: 260,
      content: '', editing: true,
    }]);
    setAnnotationMode(false);
    addEntry({ type: 'annotation-added' });
  }, [annotationMode, canvas, addEntry]);

  // ─── Add image ────────────────────────────────────────────────
  const handleAddImage = useCallback(() => {
    setNodes(prev => [...prev, {
      id: generateId(),
      type: 'image',
      x: 720, y: 200, width: 300,
      url: '', caption: '', editing: true,
    }]);
    addEntry({ type: 'image-added' });
  }, [addEntry]);

  // ─── Node interactions ────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();

    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        setConnections(prev => [...prev, { from: connectingFrom, to: nodeId }]);
        addEntry({ type: 'link-created' });
      }
      setConnectingFrom(null);
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      canvas.startDragNode(e, nodeId, node, canvasRect);
    }
  }, [connectingFrom, nodes, canvas, addEntry]);

  const removeNode = useCallback((nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(l => l.from !== nodeId && l.to !== nodeId));
  }, []);

  const updateNode = useCallback((nodeId, updates) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  const handleSearch = useCallback((fn, platform) => {
    addEntry({ type: 'search', query: `${fn.author} ${fn.year}`, platform });
  }, [addEntry]);

  // ─── Library document switch ──────────────────────────────────
  const handleSelectDocument = useCallback(async (docId) => {
    await loadDocument(docId);
    setView('canvas');
  }, [loadDocument]);

  // ─── Canvas mouse handlers ────────────────────────────────────
  const handleCanvasMouseDown = (e) => {
    if (annotationMode) {
      handleCanvasClick(e);
      return;
    }
    if (e.target === canvasRef.current || e.target.dataset?.canvas) {
      canvas.startPan(e);
    }
  };

  const handleCanvasMouseMove = (e) => {
    canvas.handleMove(e, nodes, setNodes);
  };

  let cursor = 'grab';
  if (canvas.isPanning) cursor = 'grabbing';
  else if (annotationMode) cursor = 'crosshair';
  else if (connectingFrom) cursor = 'pointer';

  // Get current page data
  const currentPageData = pages.find(p => p.pageNumber === currentPage) || pages[0];

  if (view === 'library') {
    return (
      <>
        <LibraryScreen
          onSelect={handleSelectDocument}
          onUpload={() => setShowUpload(true)}
          onFolderFile={(file) => { setPendingFile(file); setShowUpload(true); }}
          currentDocId={documentId}
        />
        {showUpload && (
          <UploadModal
            file={pendingFile}
            onClose={() => { setShowUpload(false); setPendingFile(null); }}
            onFileLoaded={handleFileLoaded}
          />
        )}
      </>
    );
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: colors.bg,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Toolbar
        onUpload={() => setShowUpload(true)}
        onAddNote={() => setAnnotationMode(!annotationMode)}
        onAddImage={handleAddImage}
        onLinkNodes={() => setConnectingFrom(connectingFrom ? null : 'main-text')}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onBackToLibrary={() => setView('library')}
        onResetView={canvas.resetView}
        onExtractText={pdfData ? handleExtractText : null}
        extracting={extracting}
        annotationMode={annotationMode}
        connectingMode={!!connectingFrom}
        showHistory={showHistory}
        zoom={canvas.zoom}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        documentName={documentName}
        saveStatus={saveStatus}
      />

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Infinite Canvas */}
        <div
          ref={canvasRef}
          data-canvas="true"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={canvas.endInteraction}
          onMouseLeave={canvas.endInteraction}
          onWheel={canvas.handleWheel}
          style={{
            flex: 1,
            background: colors.canvasBg,
            cursor,
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `radial-gradient(circle, ${colors.gridDot} 1px, transparent 1px)`,
            backgroundSize: `${GRID_SIZE * canvas.zoom}px ${GRID_SIZE * canvas.zoom}px`,
            backgroundPosition: `${canvas.offset.x}px ${canvas.offset.y}px`,
          }}
        >
          <div
            data-canvas="true"
            style={{
              transform: `translate(${canvas.offset.x}px, ${canvas.offset.y}px) scale(${canvas.zoom})`,
              transformOrigin: '0 0',
              position: 'absolute', top: 0, left: 0,
            }}
          >
            <ConnectionLines lines={connections} nodes={nodes} />

            {nodes.map(node => {
              switch (node.type) {
                case 'pdf-viewer':
                  return (
                    <PdfViewerCard
                      key={node.id}
                      node={node}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    />
                  );
                case 'text-panel':
                  return (
                    <TextPanel
                      key={node.id}
                      node={node}
                      pageLabel={totalPages > 1 ? `Page ${currentPage}` : 'Extracted Text'}
                      onFootnoteClick={handleFootnoteClick}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    />
                  );
                case 'footnote':
                  return (
                    <FootnoteCard
                      key={node.id}
                      node={node}
                      onClose={() => removeNode(node.id)}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onSearch={handleSearch}
                    />
                  );
                case 'annotation':
                  return (
                    <AnnotationCard
                      key={node.id}
                      node={node}
                      onClose={() => removeNode(node.id)}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onUpdate={updateNode}
                    />
                  );
                case 'image':
                  return (
                    <ImageCard
                      key={node.id}
                      node={node}
                      onClose={() => removeNode(node.id)}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onUpdate={updateNode}
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>

          {annotationMode && <StatusPill text="Click anywhere on the canvas to place a note" />}
          {connectingFrom && <StatusPill text="Click a card to link it" />}
        </div>

        {showHistory && (
          <HistoryPanel history={history} onClear={clearHistory} />
        )}
      </div>

      {showUpload && (
        <UploadModal
          file={pendingFile}
          onClose={() => { setShowUpload(false); setPendingFile(null); }}
          onFileLoaded={handleFileLoaded}
        />
      )}
    </div>
  );
}

function StatusPill({ text }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%',
      transform: 'translateX(-50%)',
      background: colors.accent, color: '#fff',
      padding: '8px 20px', borderRadius: 20,
      fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
      boxShadow: '0 4px 16px rgba(196,122,42,0.4)',
      pointerEvents: 'none',
    }}>
      {text}
    </div>
  );
}
