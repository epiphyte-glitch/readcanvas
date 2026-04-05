import React from 'react';
import { colors, fonts } from '../styles/tokens';
import { parseTextWithFootnotes } from '../utils/footnotes';

export default function TextPanel({ node, onFootnoteClick, onMouseDown, pageLabel }) {
  const parts = parseTextWithFootnotes(node.content);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width || 580,
        background: colors.paper,
        borderRadius: 4,
        boxShadow: '0 2px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.08)',
        padding: '40px 48px',
        cursor: 'default',
        userSelect: 'text',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <span style={{
          fontSize: 10, fontFamily: fonts.sans, fontWeight: 600,
          color: colors.inkLight, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {pageLabel || 'Extracted Text'}
        </span>
      </div>

      {/* Body text */}
      <div style={{
        fontSize: 16.5, lineHeight: 1.75, color: colors.ink, fontWeight: 300,
        fontFamily: fonts.serif,
      }}>
        {parts.map((part, i) => {
          if (part.type === 'text') {
            // Preserve paragraph breaks
            return part.content.split('\n\n').map((para, pi) => (
              <React.Fragment key={`${i}-${pi}`}>
                {pi > 0 && <div style={{ height: 16 }} />}
                <span>{para}</span>
              </React.Fragment>
            ));
          }
          return (
            <FootnoteMarker
              key={i}
              number={part.number}
              onClick={(e) => onFootnoteClick(part.number, e)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FootnoteMarker({ number, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        color: colors.accent,
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 12,
        verticalAlign: 'super',
        padding: '0 2px',
        borderRadius: 2,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.target.style.background = colors.accentFaint)}
      onMouseLeave={(e) => (e.target.style.background = 'transparent')}
      title={`Footnote ${number} — click to expand`}
    >
      [{number}]
    </span>
  );
}
