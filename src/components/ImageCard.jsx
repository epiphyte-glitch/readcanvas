import React, { useState, useRef, useEffect } from 'react';
import { colors, fonts } from '../styles/tokens';

export default function ImageCard({ node, onClose, onMouseDown, onUpdate }) {
  const [editing, setEditing] = useState(node.editing || false);
  const [url, setUrl] = useState(node.url || '');
  const [caption, setCaption] = useState(node.caption || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const save = () => {
    setEditing(false);
    onUpdate(node.id, { url, caption, editing: false });
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          setUrl(reader.result);
          setEditing(false);
          onUpdate(node.id, { url: reader.result, editing: false });
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width || 300,
        background: colors.cardBg,
        borderRadius: 6,
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${colors.cardBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 500, color: colors.inkLight }}>
          Image
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editing && url && (
            <button
              onClick={() => setEditing(true)}
              style={{
                background: 'none', border: 'none', color: colors.inkLight,
                cursor: 'pointer', fontFamily: fonts.sans, fontSize: 11,
              }}
            >
              edit
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: colors.inkLight,
              cursor: 'pointer', fontSize: 14,
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div style={{ padding: 12 }}>
        {editing ? (
          <div>
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              placeholder="Paste image URL or paste an image from clipboard..."
              style={{
                width: '100%', padding: '8px 10px',
                border: `1px solid ${colors.cardBorder}`, borderRadius: 4,
                fontFamily: fonts.mono, fontSize: 12, outline: 'none',
                background: colors.searchBg,
              }}
            />
            <button
              onClick={save}
              style={{
                marginTop: 8, padding: '6px 16px',
                background: colors.accent, border: 'none', borderRadius: 4,
                color: '#fff', fontFamily: fonts.sans, fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        ) : url ? (
          <>
            <img
              src={url}
              style={{ width: '100%', borderRadius: 4, display: 'block' }}
              alt={caption || 'User content'}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {caption && (
              <p style={{
                marginTop: 8, fontSize: 12, color: colors.inkLight,
                fontFamily: fonts.sans, fontStyle: 'italic',
              }}>
                {caption}
              </p>
            )}
          </>
        ) : (
          <div style={{
            height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.inkLight, fontFamily: fonts.sans, fontSize: 13,
          }}>
            No image set
          </div>
        )}
      </div>
    </div>
  );
}
