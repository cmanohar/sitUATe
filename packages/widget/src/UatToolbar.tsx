import { MessageSquarePlus } from 'lucide-react';
import { UAT_Z_INDEX } from '@situate/core';
import { useDraggable } from './useDraggable.js';

interface UatToolbarProps {
  active: boolean;
  count: number;
  onToggle: () => void;
}

/**
 * Fixed launcher for the overlay (bottom-left). Toggles element-select mode.
 * Draggable so it can be moved off any UI it covers — a drag never fires the
 * toggle (see didDragRef).
 */
export function UatToolbar({ active, count, onToggle }: UatToolbarProps) {
  const { offset, dragHandleProps, didDragRef } = useDraggable();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: UAT_Z_INDEX,
        transform: `translate(${offset.dx}px, ${offset.dy}px)`,
      }}
      className="font-body"
    >
      <button
        type="button"
        {...dragHandleProps}
        onClick={() => {
          if (didDragRef.current) return;
          onToggle();
        }}
        aria-pressed={active}
        aria-label="UAT feedback"
        title="UAT feedback — click to select an element"
        className={[
          'relative flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold shadow-card transition-colors',
          active
            ? 'border-primary bg-primary text-on-primary'
            : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        ].join(' ')}
      >
        <MessageSquarePlus size={16} />
        <span>UAT</span>
        {count > 0 && (
          <span
            className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary"
            aria-label={`${count} findings captured`}
          >
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
