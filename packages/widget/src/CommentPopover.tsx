import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { SEVERITIES, SEVERITY_CLASSES, UAT_Z_INDEX } from '@cmanohar/flow-core';
import type { BoundingBox, UatCategory, UatSeverity } from '@cmanohar/flow-core';
import { useDraggable } from './useDraggable.js';

export interface CommentDraft {
  comment: string;
  severity: UatSeverity;
  category?: UatCategory;
}

interface CommentPopoverProps {
  scope: 'element' | 'screen';
  anchor?: BoundingBox;
  onSubmit: (draft: CommentDraft) => void;
  onCancel: () => void;
}

const CATEGORIES: UatCategory[] = ['bug', 'change', 'question'];

/** Small, plain-language capture form. Dual-audience (testers + internal). */
export function CommentPopover({ scope, anchor, onSubmit, onCancel }: CommentPopoverProps) {
  const [comment, setComment] = useState('');
  const [severity, setSeverity] = useState<UatSeverity>('Medium');
  const [category, setCategory] = useState<UatCategory>('bug');

  const canSave = comment.trim().length > 0;
  const { offset, dragHandleProps } = useDraggable();

  // Anchor near the selected element when we have a box; else center-ish.
  const pos: React.CSSProperties = anchor
    ? {
        position: 'fixed',
        top: Math.min(anchor.y + anchor.height + 8, window.innerHeight - 320),
        left: Math.min(anchor.x, window.innerWidth - 340),
      }
    : { position: 'fixed', top: 80, right: 20 };

  return (
    <div
      role="dialog"
      aria-label={scope === 'screen' ? 'Screen note' : 'Element feedback'}
      style={{
        ...pos,
        zIndex: UAT_Z_INDEX,
        width: 320,
        transform: `translate(${offset.dx}px, ${offset.dy}px)`,
      }}
      className="font-body rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3 shadow-card-lg"
    >
      <div
        data-testid="uat-card-drag-handle"
        {...dragHandleProps}
        className="mb-2 -mx-1 -mt-1 flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-surface-container active:cursor-grabbing"
        title="Drag to move"
      >
        <GripVertical size={13} className="shrink-0 text-on-surface-variant/60" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {scope === 'screen' ? 'Screen note' : 'Element feedback'}
        </p>
      </div>

      <textarea
        autoFocus
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What's broken or needs changing?"
        rows={3}
        className="mb-2 w-full resize-none rounded-md border border-outline-variant/40 bg-surface px-2 py-1.5 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
      />

      <p className="mb-1 text-[11px] font-semibold text-on-surface-variant">Severity</p>
      <div className="mb-2 flex gap-1">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={severity === s}
            onClick={() => setSeverity(s)}
            className={[
              'flex-1 rounded-full py-1 text-[11px] font-semibold transition-shadow',
              SEVERITY_CLASSES[s],
              severity === s ? 'ring-2 ring-inset ring-primary' : 'opacity-70',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="mb-1 text-[11px] font-semibold text-on-surface-variant">Type</p>
      <div className="mb-3 flex gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={[
              'flex-1 rounded-full py-1 text-[11px] font-semibold capitalize transition-colors',
              category === c
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            ].join(' ')}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1 text-[12px] font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSubmit({ comment: comment.trim(), severity, category })}
          className="rounded-full bg-primary px-4 py-1 text-[12px] font-semibold text-on-primary disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
