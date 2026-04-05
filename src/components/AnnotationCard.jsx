import React, { useState, useRef, useEffect } from 'react';
import { colors, fonts } from '../styles/tokens';

export default function AnnotationCard({ node, onClose, onMouseDown, onUpdate }) {
  const [editing, setEditing] = useState(node.editing || false);
  const [content, setContent] = useState(node.content || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    onUpdate(node.id, { content, editing: false });
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width || 260,
        background: colors.annotationBg,
        borderRadius: 4,
        border: `1px solid ${colors.annotationBorder}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        cursor: 'default',
      }}
    >
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${colors.annotationBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 500, color: colors.inkLight }}>
          ✎ Note
        </span>
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
      <div style={{ padding: 12 }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) save(); }}
            placeholder="Write your note..."
            style={{
              width: '100%', minHeight: 80, background: 'transparent',
              border: 'none', resize: 'vertical',
              fontFamily: fonts.serif, fontSize: 13.5, lineHeight: 1.6,
              color: colors.ink, outline: 'none',
            }}
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            style={{
              fontSize: 13.5, lineHeight: 1.6, color: colors.ink,
              margin: 0, cursor: 'text', fontFamily: fonts.serif, fontWeight: 300,
              minHeight: 24,
            }}
          >
            {content || 'Click to edit...'}
          </p>
        )}
      </div>
    </div>
  );
}
