import React from 'react';
import { colors, fonts } from '../styles/tokens';

const ENTRY_LABELS = {
  'footnote-opened': (e) => `Footnote [${e.number}]`,
  'annotation-added': () => 'Note Added',
  'annotation-edited': () => 'Note Edited',
  'search': (e) => `Searched: ${e.platform || 'scholar'}`,
  'pdf-loaded': (e) => `Loaded: ${e.filename}`,
  'page-changed': (e) => `Turned to page ${e.page}`,
  'image-added': () => 'Image Added',
  'link-created': () => 'Linked Cards',
};

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistoryPanel({ history, onClear }) {
  const reversed = [...history].reverse();

  return (
    <div style={{
      width: 280,
      background: colors.bg,
      borderLeft: `1px solid ${colors.gridDot}`,
      padding: 16,
      overflowY: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <h3 style={{
          fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
          color: colors.uiText, textTransform: 'uppercase',
          letterSpacing: '0.08em', margin: 0,
        }}>
          Reading Trail
        </h3>
        {history.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'none', border: 'none', color: colors.uiTextDim,
              cursor: 'pointer', fontFamily: fonts.sans, fontSize: 11,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p style={{
          fontFamily: fonts.sans, fontSize: 12, color: colors.uiTextDim, lineHeight: 1.5,
        }}>
          Your reading trail will appear here as you explore footnotes, add notes,
          and search for references. Every interaction is recorded so you can
          retrace your path through the text.
        </p>
      ) : (
        <div style={{ flex: 1 }}>
          {reversed.map((entry) => {
            const labelFn = ENTRY_LABELS[entry.type];
            const label = labelFn ? labelFn(entry) : entry.type;

            return (
              <div
                key={entry.id}
                style={{
                  padding: '10px 12px',
                  background: colors.buttonBg,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontFamily: fonts.sans, fontSize: 11, fontWeight: 500,
                    color: colors.accent,
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 10, color: colors.uiTextDim,
                    flexShrink: 0, marginLeft: 8,
                  }}>
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                {entry.text && (
                  <div style={{
                    fontFamily: fonts.serif, fontSize: 12, color: colors.uiTextDim,
                    lineHeight: 1.4, marginTop: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {entry.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
