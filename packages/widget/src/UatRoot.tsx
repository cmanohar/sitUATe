import { useCallback, useState } from 'react';
import { UAT_Z_INDEX } from '@situate/core';
import type { BoundingBox, UatScope } from '@situate/core';
import { UatToolbar } from './UatToolbar.js';
import { ElementPicker } from './ElementPicker.js';
import { CommentPopover, type CommentDraft } from './CommentPopover.js';
import { useUatSession } from './useUatSession.js';
import { useGating, type SituateConfig } from './gating.js';

interface Selection {
  scope: UatScope;
  element?: Element;
  box?: BoundingBox;
}

/** Top-level overlay: owns select-mode + draft state, wires the child widgets. */
export function UatRoot({ config = {} }: { config?: SituateConfig }) {
  // Runtime gating (D5): resolve on mount; render nothing until allowed. Fail-closed.
  const decision = useGating(config);
  const { count, submit } = useUatSession({ collectorUrl: config.collectorUrl });
  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [saving, setSaving] = useState(false);

  const exitSelect = useCallback(() => setSelectMode(false), []);

  const onSelectElement = useCallback((element: Element, box: BoundingBox) => {
    setSelectMode(false);
    setSelection({ scope: 'element', element, box });
  }, []);

  const noteScreen = useCallback(() => {
    setSelectMode(false);
    setSelection({ scope: 'screen' });
  }, []);

  const onSubmit = useCallback(
    async (draft: CommentDraft) => {
      if (!selection) return;
      setSaving(true);
      try {
        await submit({
          scope: selection.scope,
          comment: draft.comment,
          severity: draft.severity,
          category: draft.category,
          element: selection.element,
          box: selection.box,
        });
      } finally {
        setSaving(false);
        setSelection(null);
      }
    },
    [selection, submit],
  );

  // Gate the entire overlay: pending or denied renders nothing (fail-closed).
  if (decision !== 'allowed') return null;

  return (
    <>
      <UatToolbar
        active={selectMode}
        count={count}
        onToggle={() => setSelectMode((m) => !m)}
      />

      <ElementPicker
        active={selectMode && !selection}
        onSelect={onSelectElement}
        onCancel={exitSelect}
      />

      {selectMode && !selection && (
        <div
          style={{ position: 'fixed', bottom: 20, left: 90, zIndex: UAT_Z_INDEX }}
          className="font-body flex items-center gap-3 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-[12px] text-on-surface-variant shadow-card"
        >
          <span>Click an element to flag it</span>
          <button
            type="button"
            onClick={noteScreen}
            className="rounded-full bg-surface-container px-3 py-1 font-semibold text-on-surface hover:bg-surface-container-high"
          >
            Note this screen
          </button>
          <span className="text-on-surface-variant/70">Esc to exit</span>
        </div>
      )}

      {selection && (
        <CommentPopover
          scope={selection.scope}
          anchor={selection.box}
          onSubmit={onSubmit}
          onCancel={() => !saving && setSelection(null)}
        />
      )}
    </>
  );
}
