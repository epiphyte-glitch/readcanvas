import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { colors, fonts } from '../styles/tokens';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function PdfViewerCard({ node, currentPage, totalPages, onPageChange, onMouseDown }) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);

  const cardWidth = node.width || 720;
  const innerWidth = cardWidth - 48; // 24px padding each side

  // Load PDF document when pdfData changes
  useEffect(() => {
    if (!node.pdfData) return;

    let cancelled = false;

    const load = async () => {
      try {
        if (pdfDocRef.current) {
          await pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }
        // Slice to pass a copy — pdf.js transfers the buffer to its worker,
        // which would detach the original stored in React state.
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(node.pdfData.slice(0)) }).promise;
        if (cancelled) { doc.destroy(); return; }
        pdfDocRef.current = doc;
        renderPage(doc, currentPage);
      } catch (err) {
        if (!cancelled) setError('Failed to load PDF.');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [node.pdfData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render when page changes (doc already loaded)
  useEffect(() => {
    if (pdfDocRef.current) renderPage(pdfDocRef.current, currentPage);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPage = async (doc, pageNum) => {
    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    setRendering(true);
    setError(null);

    try {
      const page = await doc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = innerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use device pixel ratio for sharp rendering on retina screens
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        setError('Failed to render page.');
      }
    } finally {
      setRendering(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: cardWidth,
        background: colors.canvasBg,
        borderRadius: 4,
        boxShadow: '0 2px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Drag handle / header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          background: colors.bg,
          borderBottom: `1px solid ${colors.gridDot}`,
          cursor: 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{
          fontFamily: fonts.sans, fontSize: 10, fontWeight: 600,
          color: colors.uiTextDim, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {node.filename || 'PDF'}
        </span>
        <span style={{
          fontFamily: fonts.mono, fontSize: 10, color: colors.uiTextDim,
        }}>
          {rendering ? 'Rendering…' : `${currentPage} / ${totalPages}`}
        </span>
      </div>

      {/* Canvas area */}
      <div style={{
        padding: '24px',
        background: '#3a3835',
        minHeight: 200,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      }}>
        {error ? (
          <div style={{
            fontFamily: fonts.sans, fontSize: 13, color: colors.error,
            padding: 40, textAlign: 'center',
          }}>
            {error}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              opacity: rendering ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          />
        )}
      </div>

      {/* Page navigation footer */}
      {totalPages > 1 && (
        <div style={{
          height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          background: colors.bg,
          borderTop: `1px solid ${colors.gridDot}`,
        }}>
          <NavButton
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            label="‹ Prev"
          />
          <span style={{
            fontFamily: fonts.mono, fontSize: 11, color: colors.uiTextDim, minWidth: 72, textAlign: 'center',
          }}>
            {currentPage} / {totalPages}
          </span>
          <NavButton
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            label="Next ›"
          />
        </div>
      )}
    </div>
  );
}

function NavButton({ onClick, disabled, label }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover && !disabled ? colors.buttonHover : 'transparent',
        border: 'none',
        borderRadius: 4,
        color: disabled ? colors.uiTextDim : colors.uiText,
        fontFamily: fonts.sans, fontSize: 11, fontWeight: 500,
        padding: '4px 10px', cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.12s',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
