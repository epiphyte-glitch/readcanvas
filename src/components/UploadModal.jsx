import React, { useRef, useState, useEffect } from 'react';
import { colors, fonts } from '../styles/tokens';

export default function UploadModal({ onClose, onFileLoaded, file: initialFile }) {
  const fileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  // Auto-start when a file is provided directly (e.g. from folder browser)
  useEffect(() => {
    if (initialFile) processFile(initialFile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file) => {

    setExtracting(true);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        // Just read page count — text extraction happens on demand via toolbar
        const { getPdfPageCount } = await import('../utils/pdf.js');
        const { totalPages, arrayBuffer } = await getPdfPageCount(file);

        onFileLoaded({
          filename: file.name,
          text: '',
          footnotes: {},
          pages: [],
          totalPages,
          pdfData: arrayBuffer,
        });
      } else if (file.name.endsWith('.epub') || file.type === 'application/epub+zip') {
        const { extractEpubText, collectEpubFootnotes } = await import('../utils/epub.js');

        const result = await extractEpubText(file, ({ current, total }) => {
          setProgress({ current, total });
        });

        const text = result.pages.map(p => `— Chapter ${p.pageNumber} —\n\n${p.text}`).join('\n\n');
        const footnotes = collectEpubFootnotes(result.pages);

        onFileLoaded({
          filename: file.name,
          text,
          footnotes,
          pages: result.pages,
          totalPages: result.totalPages,
        });
      } else {
        // Plain text / markdown
        const text = await file.text();
        onFileLoaded({
          filename: file.name,
          text,
          footnotes: {},
          pages: [{ pageNumber: 1, text, footnotes: [] }],
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('Extraction failed:', err);
      setError(err.message || 'Failed to extract text from file');
      setExtracting(false);
      return;
    }

    setExtracting(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.paper, borderRadius: 12,
          padding: '36px 40px', width: 460,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <h2 style={{
          fontFamily: fonts.sans, fontSize: 18, fontWeight: 600,
          color: colors.ink, margin: '0 0 8px',
        }}>
          Load a Book
        </h2>
        <p style={{
          fontFamily: fonts.sans, fontSize: 13, color: colors.inkLight,
          margin: '0 0 24px', lineHeight: 1.5,
        }}>
          Upload a PDF, EPUB, or text file. Text is extracted and rendered as lightweight DOM
          — no heavy embedded viewer. Footnotes are automatically detected and made interactive.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,.txt,.md"
          onChange={handleFile}
          style={{ display: 'none' }}
        />

        {/* Drop zone */}
        <div
          onClick={() => !extracting && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files[0];
            if (file) {
              // Simulate file input change
              const dt = new DataTransfer();
              dt.items.add(file);
              fileInputRef.current.files = dt.files;
              handleFile({ target: { files: dt.files } });
            }
          }}
          style={{
            border: `2px dashed ${extracting ? colors.accent : colors.cardBorder}`,
            borderRadius: 8, padding: '28px 20px',
            textAlign: 'center', cursor: extracting ? 'wait' : 'pointer',
            transition: 'border-color 0.2s',
            marginBottom: 16,
          }}
        >
          {extracting ? (
            <div>
              <div style={{
                fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
                color: colors.accent, marginBottom: 8,
              }}>
                Extracting text...
              </div>
              {progress && (
                <div>
                  <div style={{
                    width: '100%', height: 4, background: colors.cardBorder,
                    borderRadius: 2, overflow: 'hidden', marginBottom: 6,
                  }}>
                    <div style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      height: '100%', background: colors.accent,
                      borderRadius: 2, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 11, color: colors.inkLight,
                  }}>
                    Page {progress.current} of {progress.total}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
              <div style={{
                fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
                color: colors.ink, marginBottom: 4,
              }}>
                Click to choose or drag a file here
              </div>
              <div style={{
                fontFamily: fonts.sans, fontSize: 12, color: colors.inkLight,
              }}>
                PDF, EPUB, TXT, or Markdown
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(196,74,42,0.1)',
            border: `1px solid ${colors.error}`, borderRadius: 6,
            fontFamily: fonts.sans, fontSize: 12, color: colors.error,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', color: colors.inkLight,
            border: `1px solid ${colors.cardBorder}`, borderRadius: 8,
            fontFamily: fonts.sans, fontSize: 13, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
