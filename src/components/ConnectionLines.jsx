import React from 'react';
import { colors } from '../styles/tokens';

export default function ConnectionLines({ lines, nodes }) {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {lines.map((line, i) => {
        const fromNode = nodes.find(n => n.id === line.from);
        const toNode = nodes.find(n => n.id === line.to);
        if (!fromNode || !toNode) return null;

        const fromW = fromNode.width || 580;
        const toW = toNode.width || 340;

        // Determine best anchor points
        const fromCenterX = fromNode.x + fromW / 2;
        const fromCenterY = fromNode.y + 150;
        const toCenterX = toNode.x + toW / 2;
        const toCenterY = toNode.y + 40;

        // Exit from right side of source, enter left side of target
        let x1, y1, x2, y2;

        if (toCenterX > fromCenterX) {
          // Target is to the right
          x1 = fromNode.x + fromW;
          y1 = fromNode.y + 100;
          x2 = toNode.x;
          y2 = toNode.y + 40;
        } else {
          // Target is to the left
          x1 = fromNode.x;
          y1 = fromNode.y + 100;
          x2 = toNode.x + toW;
          y2 = toNode.y + 40;
        }

        const dx = Math.abs(x2 - x1) * 0.4;
        const cx1 = toCenterX > fromCenterX ? x1 + dx : x1 - dx;
        const cx2 = toCenterX > fromCenterX ? x2 - dx : x2 + dx;

        return (
          <g key={i}>
            <path
              d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.4}
            />
            <circle cx={x1} cy={y1} r={3} fill={colors.accent} opacity={0.5} />
            <circle cx={x2} cy={y2} r={4} fill={colors.accent} opacity={0.7} />
          </g>
        );
      })}
    </svg>
  );
}
