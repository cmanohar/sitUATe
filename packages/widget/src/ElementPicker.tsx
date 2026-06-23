import { useEffect, useRef, useState } from 'react';
import { UAT_ROOT_ATTR, UAT_Z_INDEX, getBoundingBox } from '@cmanohar/flow-core';
import type { BoundingBox } from '@cmanohar/flow-core';

interface ElementPickerProps {
  active: boolean;
  onSelect: (el: Element, box: BoundingBox) => void;
  onCancel: () => void;
}

function isOverlay(el: Element | null): boolean {
  return !!el?.closest(`[${UAT_ROOT_ATTR}]`);
}

/**
 * Select-mode controller: hover-highlights elements and selects one on click.
 * Listeners run in the capture phase and suppress the click so the app never
 * navigates/mutates while picking. Escape cancels.
 */
export function ElementPicker({ active, onSelect, onCancel }: ElementPickerProps) {
  const [box, setBox] = useState<BoundingBox | null>(null);
  const hovered = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) {
      setBox(null);
      hovered.current = null;
      return;
    }

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOverlay(el)) {
        hovered.current = null;
        setBox(null);
        return;
      }
      hovered.current = el;
      setBox(getBoundingBox(el));
    };

    const onClick = (e: MouseEvent) => {
      const el = hovered.current;
      if (!el || isOverlay(el)) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(el, getBoundingBox(el));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [active, onSelect, onCancel]);

  if (!active || !box) return null;

  return (
    <div
      data-testid="uat-highlight"
      style={{
        position: 'fixed',
        top: box.y,
        left: box.x,
        width: box.width,
        height: box.height,
        zIndex: UAT_Z_INDEX - 1,
        pointerEvents: 'none',
      }}
      className="rounded-sm border-2 border-primary bg-primary/10"
    />
  );
}
