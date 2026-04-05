import React, { useState, useEffect, useCallback } from 'react';
import { colors, fonts } from '../styles/tokens';
import { listDocuments, deleteDocument } from '../utils/storage';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffHrs = Math.floor((now - d) / 3600000);
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffHrs < 48) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fileIcon(name) {
  if (/\.epub$/i.test(name)) return '📖';
  if (/\.pdf$/i.test(name)) return '📄';
  return '📝';
}

// ── Saved document card ──────────────────────────────────────────────────────

function DocCard({ doc, onSelect, onDelete, isActive }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => onSelect(doc.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isActive
          ? colors.accentFaint
          : hover ? '#242220' : '#1e1c1a',
        border: `1px solid ${isActive ? colors.accent : hover ? '#3a3835' : '#2a2825'}`,
        borderRadius: 10,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1 }}>{fileIcon(doc.name)}</div>

      <div style={{
        fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
        color: isActive ? colors.accentLight : colors.uiText,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {doc.name || doc.id}
      </div>

      <div style={{
        fontFamily: fonts.sans, fontSize: 11, color: colors.uiTextDim,
        display: 'flex', gap: 10,
      }}>
        <span>{doc.totalPages || '?'} pages</span>
        <span>{formatDate(doc.updatedAt)}</span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
        title="Delete"
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none',
          color: hover ? colors.uiTextDim : 'transparent',
          cursor: 'pointer', fontSize: 16, padding: '2px 6px',
          borderRadius: 4, transition: 'color 0.15s',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.error)}
        onMouseLeave={(e) => (e.currentTarget.style.color = hover ? colors.uiTextDim : 'transparent')}
      >
        ×
      </button>
    </div>
  );
}

// ── Folder file row ──────────────────────────────────────────────────────────

function FolderFileRow({ name, onOpen, loading }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={loading ? undefined : onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 8,
        background: hover && !loading ? '#242220' : 'transparent',
        cursor: loading ? 'wait' : 'pointer',
        transition: 'background 0.12s',
      }}
    >
      <span style={{ fontSize: 16 }}>{fileIcon(name)}</span>
      <span style={{
        fontFamily: fonts.sans, fontSize: 13,
        color: loading ? colors.uiTextDim : colors.uiText,
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      {loading && (
        <span style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.accent }}>
          Loading…
        </span>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'date', label: 'Recent' },
  { value: 'name', label: 'Name' },
];

const SUPPORTED_EXTS = /\.(pdf|epub|txt|md)$/i;

export default function LibraryScreen({ onSelect, onUpload, onFolderFile, currentDocId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('date');
  const [search, setSearch] = useState('');
  const [folderName, setFolderName] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(null);
  const canBrowseFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (docId) => {
    if (!confirm('Delete this document and its workspace? This cannot be undone.')) return;
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.warn('Failed to delete:', err);
    }
  }, []);

  const handleBrowseFolder = useCallback(async () => {
    try {
      setFolderLoading(true);
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      const found = [];

      async function scan(handle, prefix) {
        for await (const [name, entry] of handle.entries()) {
          if (entry.kind === 'file' && SUPPORTED_EXTS.test(name)) {
            found.push({ name: prefix + name, entry });
          } else if (entry.kind === 'directory' && !prefix) {
            // One level of subdirectory recursion
            await scan(entry, name + '/');
          }
        }
      }

      await scan(dirHandle, '');
      found.sort((a, b) => a.name.localeCompare(b.name));
      setFolderName(dirHandle.name);
      setFolderFiles(found);
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Folder scan failed:', err);
    } finally {
      setFolderLoading(false);
    }
  }, []);

  const handleFolderFileClick = useCallback(async ({ name, entry }) => {
    setLoadingFile(name);
    try {
      const file = await entry.getFile();
      await onFolderFile(file);
    } catch (err) {
      console.warn('Failed to open file:', err);
    } finally {
      setLoadingFile(null);
    }
  }, [onFolderFile]);

  // Sort + filter saved documents
  const visibleDocs = documents
    .filter(d => !search || (d.name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === 'name'
        ? (a.name || '').localeCompare(b.name || '')
        : (b.updatedAt || 0) - (a.updatedAt || 0)
    );

  const filteredFolderFiles = folderFiles.filter(
    f => !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: colors.bg,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '48px 64px 0',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: fonts.sans }}>R</span>
            </div>
            <span style={{
              fontFamily: fonts.sans, fontWeight: 700, fontSize: 18,
              color: colors.uiText, letterSpacing: '0.05em',
            }}>
              READCANVAS
            </span>
          </div>
          <p style={{
            fontFamily: fonts.sans, fontSize: 13, color: colors.uiTextDim,
            margin: 0, paddingLeft: 44,
          }}>
            A spatial reading environment
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {canBrowseFolder && (
            <ActionButton
              onClick={handleBrowseFolder}
              disabled={folderLoading}
              label={folderLoading ? 'Scanning…' : folderName ? 'Change Folder' : 'Browse Folder'}
              icon="⬚"
            />
          )}
          <ActionButton onClick={onUpload} label="Open File" icon="↑" primary />
        </div>
      </div>

      {/* Search + sort */}
      <div style={{
        padding: '32px 64px 0',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, maxWidth: 320,
            background: '#242220', border: `1px solid #2e2c2a`,
            borderRadius: 8, padding: '8px 14px',
            fontFamily: fonts.sans, fontSize: 13, color: colors.uiText,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              style={{
                padding: '7px 14px',
                background: sort === opt.value ? colors.accentFaint : 'transparent',
                border: `1px solid ${sort === opt.value ? colors.accent : '#2e2c2a'}`,
                borderRadius: 6, cursor: 'pointer',
                fontFamily: fonts.sans, fontSize: 12, fontWeight: 500,
                color: sort === opt.value ? colors.accentLight : colors.uiTextDim,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 64px 64px', flex: 1 }}>

        {/* Saved library */}
        <SectionLabel>
          {folderName ? 'Saved Library' : 'Library'}
          {!loading && <Count>{visibleDocs.length}</Count>}
        </SectionLabel>

        {loading ? (
          <Muted>Loading…</Muted>
        ) : visibleDocs.length === 0 ? (
          <Muted>
            {search ? 'No matching documents.' : 'No saved documents yet — open a file to get started.'}
          </Muted>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 12,
          }}>
            {visibleDocs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                onSelect={onSelect}
                onDelete={handleDelete}
                isActive={doc.id === currentDocId}
              />
            ))}
          </div>
        )}

        {/* Folder section */}
        {folderName && (
          <>
            <div style={{ margin: '32px 0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <SectionLabel style={{ margin: 0 }}>
                {folderName}
                <Count>{filteredFolderFiles.length}</Count>
              </SectionLabel>
              <button
                onClick={handleBrowseFolder}
                style={{
                  background: 'none', border: 'none',
                  fontFamily: fonts.sans, fontSize: 11, color: colors.uiTextDim,
                  cursor: 'pointer', padding: 0,
                }}
              >
                Rescan
              </button>
            </div>

            {filteredFolderFiles.length === 0 ? (
              <Muted>{search ? 'No matching files.' : 'No supported files found in this folder.'}</Muted>
            ) : (
              <div style={{
                background: '#1e1c1a', borderRadius: 10,
                border: '1px solid #2a2825',
                padding: '4px 0',
              }}>
                {filteredFolderFiles.map(f => (
                  <FolderFileRow
                    key={f.name}
                    name={f.name}
                    loading={loadingFile === f.name}
                    onOpen={() => handleFolderFileClick(f)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function ActionButton({ onClick, label, icon, primary, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 18px',
        background: primary
          ? (hover ? colors.accentLight : colors.accent)
          : (hover ? '#2e2c2a' : '#242220'),
        border: `1px solid ${primary ? 'transparent' : '#3a3835'}`,
        borderRadius: 8, cursor: disabled ? 'wait' : 'pointer',
        fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
        color: primary ? '#fff' : colors.uiText,
        transition: 'all 0.15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
      color: colors.uiTextDim, letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Count({ children }) {
  return (
    <span style={{
      background: '#2e2c2a', borderRadius: 10, padding: '1px 7px',
      fontFamily: fonts.mono, fontSize: 10, color: colors.uiTextDim,
      fontWeight: 400, letterSpacing: 0, textTransform: 'none',
    }}>
      {children}
    </span>
  );
}

function Muted({ children }) {
  return (
    <p style={{
      fontFamily: fonts.sans, fontSize: 13, color: colors.uiTextDim,
      margin: '0 0 24px', lineHeight: 1.6,
    }}>
      {children}
    </p>
  );
}
