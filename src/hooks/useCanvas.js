import { useState, useCallback, useRef } from 'react';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.08;

/**
 * Hook managing infinite canvas interactions:
 * - Pan (drag background)
 * - Zoom (scroll wheel, pinch)
 * - Node dragging
 */
export function useCanvas() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState(null);

  const panStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX, screenY, canvasRect) => {
    return {
      x: (screenX - canvasRect.left - offset.x) / zoom,
      y: (screenY - canvasRect.top - offset.y) / zoom,
    };
  }, [offset, zoom]);

  // Start panning
  const startPan = useCallback((e) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  // Handle mouse move for panning and dragging
  const handleMove = useCallback((e, nodes, setNodes) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }

    if (dragNodeId && nodes && setNodes) {
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const pos = screenToCanvas(e.clientX, e.clientY, canvasRect);
      setNodes(prev =>
        prev.map(n =>
          n.id === dragNodeId
            ? { ...n, x: pos.x - dragOffsetRef.current.x, y: pos.y - dragOffsetRef.current.y }
            : n
        )
      );
    }
  }, [isPanning, dragNodeId, screenToCanvas]);

  // End pan or drag
  const endInteraction = useCallback(() => {
    setIsPanning(false);
    setDragNodeId(null);
  }, []);

  // Start dragging a node
  const startDragNode = useCallback((e, nodeId, node, canvasRect) => {
    const pos = screenToCanvas(e.clientX, e.clientY, canvasRect);
    dragOffsetRef.current = { x: pos.x - node.x, y: pos.y - node.y };
    setDragNodeId(nodeId);
  }, [screenToCanvas]);

  // Handle wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? (1 - ZOOM_STEP) : (1 + ZOOM_STEP);
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor)));
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Zoom to fit (center on content)
  const zoomToFit = useCallback((nodes, canvasRect) => {
    if (!nodes.length || !canvasRect) return;

    const bounds = nodes.reduce(
      (acc, n) => ({
        minX: Math.min(acc.minX, n.x),
        minY: Math.min(acc.minY, n.y),
        maxX: Math.max(acc.maxX, n.x + (n.width || 300)),
        maxY: Math.max(acc.maxY, n.y + 300),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const contentW = bounds.maxX - bounds.minX + 100;
    const contentH = bounds.maxY - bounds.minY + 100;
    const scaleX = canvasRect.width / contentW;
    const scaleY = canvasRect.height / contentH;
    const newZoom = Math.max(MIN_ZOOM, Math.min(1.5, Math.min(scaleX, scaleY) * 0.9));

    setZoom(newZoom);
    setOffset({
      x: (canvasRect.width - contentW * newZoom) / 2 - bounds.minX * newZoom + 50 * newZoom,
      y: (canvasRect.height - contentH * newZoom) / 2 - bounds.minY * newZoom + 50 * newZoom,
    });
  }, []);

  return {
    offset,
    zoom,
    isPanning,
    dragNodeId,
    screenToCanvas,
    startPan,
    handleMove,
    endInteraction,
    startDragNode,
    handleWheel,
    resetView,
    zoomToFit,
    setZoom,
    setOffset,
  };
}
