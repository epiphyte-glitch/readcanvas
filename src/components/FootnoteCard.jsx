import React, { useState } from 'react';
import { colors, fonts } from '../styles/tokens';
import { getSearchUrl } from '../utils/footnotes';

const SEARCH_PLATFORMS = [
  { id: 'scholar', label: 'Google Scholar' },
  { id: 'openlibrary', label: 'Open Library' },
  { id: 'worldcat', label: 'WorldCat' },
  { id: 'google', label: 'Google' },
];

export default function FootnoteCard({ node, onClose, onMouseDown, onSearch }) {
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const fn = node.footnote;

  const handleSearch = (platform) => {
    const url = getSearchUrl(fn, platform);
    window.open(url, '_blank');
    setShowSearchMenu(false);
    if (onSearch) onSearch(fn, platform);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width || 340,
        background: colors.cardBg,
        borderRadius: 6,
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        overflow: 'visible',
        cursor: 'default',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${colors.cardBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: colors.accentFaint,
      }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 12, fontWeight: 600, color: colors.accent }}>
          Footnote {node.number}
          {fn.page && <span style={{ fontWeight: 400, marginLeft: 6, color: colors.inkLight }}>p.{fn.page}</span>}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Search dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSearchMenu(!showSearchMenu)}
              style={{
                background: colors.accent, border: 'none', borderRadius: 4,
                color: '#fff', padding: '3px 10px', cursor: 'pointer',
                fontFamily: fonts.sans, fontSize: 11, fontWeight: 500,
              }}
            >
              Search ↗
            </button>
            {showSearchMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                zIndex: 10, minWidth: 160, overflow: 'hidden',
              }}>
                {SEARCH_PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSearch(p.id)}
                    style={{
                      display: 'block', width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none', textAlign: 'left',
                      cursor: 'pointer', fontFamily: fonts.sans, fontSize: 12,
                      color: colors.ink,
                    }}
                    onMouseEnter={(e) => (e.target.style.background = colors.searchBg)}
                    onMouseLeave={(e) => (e.target.style.background = 'none')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: colors.inkLight,
              cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 10px' }}>
        <p style={{
          fontSize: 13.5, lineHeight: 1.6, color: colors.ink, margin: 0,
          fontFamily: fonts.serif, fontWeight: 300,
        }}>
          {fn.text}
        </p>

        {/* Metadata tags */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {fn.author && (
            <Tag label={fn.author} />
          )}
          {fn.year && (
            <Tag label={String(fn.year)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ label }) {
  return (
    <span style={{
      fontFamily: fonts.mono, fontSize: 10, color: colors.inkLight,
      background: colors.searchBg, padding: '2px 8px', borderRadius: 3,
    }}>
      {label}
    </span>
  );
}
