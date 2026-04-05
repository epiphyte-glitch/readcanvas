import React, { useState, useEffect } from 'react';
import { colors, fonts } from '../styles/tokens';
import { listDocuments, deleteDocument } from '../utils/storage';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffHrs < 48) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DocumentLibrary({ onSelect, onClose, currentDocId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.warn('Failed to load documents:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (!confirm('Delete this document and its workspace? This cannot be undone.')) return;
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.warn('Failed to delete:', err);
    }
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
          padding: '32px 36px', width: 520, maxHeight: '70vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <h2 style={{
          fontFamily: fonts.sans, fontSize: 18, fontWeight: 600,
          color: colors.ink, margin: '0 0 4px',
        }}>
          Your Library
        </h2>
        <p style={{
          fontFamily: fonts.sans, fontSize: 13, color: colors.inkLight,
          margin: '0 0 20px',
        }}>
          Previously opened documents with saved workspaces.
        </p>

        <div style={{ flex: 1, overflowY: 'auto', margin: '0 -8px' }}>
          {loading ? (
            <div style={{
              padding: 40, textAlign: 'center',
              fontFamily: fonts.sans, fontSize: 13, color: colors.inkLight,
            }}>
              Loading...
            </div>
          ) : documents.length === 0 ? (
            <div style={{
              padding: 40, textAlign: 'center',
              fontFamily: fonts.sans, fontSize: 13, color: colors.inkLight,
            }}>
              No saved documents yet. Upload a PDF to get started.
            </div>
          ) : (
            documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => onSelect(doc.id)}
                style={{
                  padding: '14px 16px',
                  margin: '0 8px 8px',
                  background: doc.id === currentDocId ? colors.accentFaint : colors.searchBg,
                  border: doc.id === currentDocId
                    ? `1px solid ${colors.accent}`
                    : `1px solid transparent`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (doc.id !== currentDocId) e.currentTarget.style.background = colors.cardBorder;
                }}
                onMouseLeave={(e) => {
                  if (doc.id !== currentDocId) e.currentTarget.style.background = colors.searchBg;
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
                    color: colors.ink,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.name || doc.id}
                  </div>
                  <div style={{
                    fontFamily: fonts.sans, fontSize: 11, color: colors.inkLight,
                    marginTop: 3,
                    display: 'flex', gap: 12,
                  }}>
                    <span>{doc.totalPages || '?'} pages</span>
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  style={{
                    background: 'none', border: 'none', color: colors.inkLight,
                    cursor: 'pointer', fontSize: 16, padding: '4px 8px',
                    flexShrink: 0, borderRadius: 4,
                  }}
                  onMouseEnter={(e) => (e.target.style.color = colors.error)}
                  onMouseLeave={(e) => (e.target.style.color = colors.inkLight)}
                  title="Delete document"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', padding: '12px',
            background: 'transparent', color: colors.inkLight,
            border: `1px solid ${colors.cardBorder}`, borderRadius: 8,
            fontFamily: fonts.sans, fontSize: 13, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
