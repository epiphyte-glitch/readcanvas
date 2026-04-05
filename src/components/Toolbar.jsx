import React, { useState } from 'react';
import { colors, fonts } from '../styles/tokens';

function ToolButton({ onClick, label, icon, active, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: active ? colors.accentFaint : hover ? colors.buttonHover : colors.buttonBg,
        border: active ? `1px solid ${colors.accent}` : '1px solid transparent',
        borderRadius: 6,
        color: danger ? colors.error : active ? colors.accent : colors.uiText,
        cursor: 'pointer',
        fontFamily: fonts.sans,
        fontSize: 12,
        fontWeight: 500,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}

export default function Toolbar({
  onUpload,
  onAddNote,
  onAddImage,
  onLinkNodes,
  onToggleHistory,
  onBackToLibrary,
  onResetView,
  annotationMode,
  connectingMode,
  showHistory,
  zoom,
  currentPage,
  totalPages,
  onPageChange,
  documentName,
  saveStatus,
}) {
  return (
    <div style={{
      height: 52,
      background: colors.bg,
      borderBottom: `1px solid ${colors.gridDot}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 8,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: fonts.sans }}>R</span>
        </div>
        <span style={{
          color: colors.uiText, fontFamily: fonts.sans, fontWeight: 600,
          fontSize: 14, letterSpacing: '0.02em',
        }}>
          READCANVAS
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: colors.gridDot }} />

      {/* Actions */}
      <ToolButton onClick={onBackToLibrary} label="Library" icon="←" />
      <ToolButton onClick={onUpload} label="Open File" icon="↑" />
      <ToolButton onClick={onAddNote} label={annotationMode ? 'Cancel' : 'Add Note'} icon="✎" active={annotationMode} />
      <ToolButton onClick={onAddImage} label="Add Image" icon="◻" />
      <ToolButton onClick={onLinkNodes} label={connectingMode ? 'Cancel' : 'Link'} icon="⟶" active={connectingMode} />

      {/* Page navigation */}
      {totalPages > 1 && (
        <>
          <div style={{ width: 1, height: 24, background: colors.gridDot, margin: '0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              style={{
                background: colors.buttonBg, border: 'none', borderRadius: 4,
                color: currentPage <= 1 ? colors.uiTextDim : colors.uiText,
                padding: '4px 8px', cursor: currentPage <= 1 ? 'default' : 'pointer',
                fontFamily: fonts.sans, fontSize: 12,
              }}
            >
              ‹
            </button>
            <span style={{ color: colors.uiText, fontFamily: fonts.mono, fontSize: 12, minWidth: 60, textAlign: 'center' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              style={{
                background: colors.buttonBg, border: 'none', borderRadius: 4,
                color: currentPage >= totalPages ? colors.uiTextDim : colors.uiText,
                padding: '4px 8px', cursor: currentPage >= totalPages ? 'default' : 'pointer',
                fontFamily: fonts.sans, fontSize: 12,
              }}
            >
              ›
            </button>
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Document name + save status */}
      {documentName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <span style={{
            fontFamily: fonts.sans, fontSize: 12, color: colors.uiText,
            maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {documentName}
          </span>
          {saveStatus && (
            <span style={{
              fontFamily: fonts.sans, fontSize: 10, color: colors.uiTextDim,
              opacity: saveStatus === 'saved' ? 0.6 : 1,
              transition: 'opacity 0.3s',
            }}>
              {saveStatus === 'saving' ? '●' : saveStatus === 'saved' ? '✓ saved' : ''}
            </span>
          )}
        </div>
      )}

      {/* Right side */}
      <ToolButton onClick={onToggleHistory} label="History" icon="↺" active={showHistory} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
        <span style={{ color: colors.uiTextDim, fontFamily: fonts.sans, fontSize: 12 }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onResetView}
          style={{
            background: colors.buttonBg, border: 'none', borderRadius: 4,
            color: colors.uiTextDim, padding: '3px 8px', cursor: 'pointer',
            fontFamily: fonts.sans, fontSize: 11,
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
