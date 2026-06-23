import { useRef, useState } from 'react';

/** Movement (px) past which a gesture counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;

export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  style: React.CSSProperties;
}

export interface UseDraggable {
  /** Cumulative drag offset to apply via `transform: translate(...)`. */
  offset: { dx: number; dy: number };
  /** Spread onto the element that should initiate dragging. */
  dragHandleProps: DragHandleProps;
  /** True if the most recent gesture moved past the click/drag threshold. */
  didDragRef: React.MutableRefObject<boolean>;
}

/**
 * Headless pointer-drag hook. Tracks a cumulative {dx, dy} offset that the
 * consumer layers on top of its own computed position via a CSS transform.
 * One Pointer Events path covers mouse + touch. Offset is component-local
 * (no persistence) — it resets when the consumer unmounts.
 */
export function useDraggable(): UseDraggable {
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });
  const didDragRef = useRef(false);
  // Gesture origin + the offset we started this drag from.
  const gesture = useRef<{ startX: number; startY: number; baseDx: number; baseDy: number } | null>(
    null,
  );

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      didDragRef.current = true;
    }
    setOffset({ dx: g.baseDx + dx, dy: g.baseDy + dy });
  };

  const endDrag = (e: React.PointerEvent) => {
    gesture.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer capture is best-effort (jsdom / already released)
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    didDragRef.current = false;
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseDx: offset.dx,
      baseDy: offset.dy,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // best-effort
    }
  };

  return {
    offset,
    didDragRef,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      style: { cursor: 'grab', touchAction: 'none', userSelect: 'none' },
    } as DragHandleProps,
  };
}
