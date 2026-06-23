import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDraggable } from '../src/useDraggable';

/**
 * Tiny harness: a draggable box whose transform reflects the hook offset,
 * plus a readout of didDragRef so tests can assert click-vs-drag.
 */
function Box() {
  const { offset, dragHandleProps, didDragRef } = useDraggable();
  return (
    <div>
      <div
        data-testid="handle"
        {...dragHandleProps}
        style={{ ...dragHandleProps.style, transform: `translate(${offset.dx}px, ${offset.dy}px)` }}
      >
        drag me
      </div>
      <span data-testid="offset">{`${offset.dx},${offset.dy}`}</span>
      <button
        type="button"
        data-testid="dragged"
        onClick={(e) => {
          (e.currentTarget as HTMLElement).textContent = String(didDragRef.current);
        }}
      >
        read
      </button>
    </div>
  );
}

/**
 * jsdom drops clientX/clientY on synthetic PointerEvents, so dispatch a
 * MouseEvent under the pointer-event type name — React reads clientX off the
 * native event and MouseEvent honors it.
 */
function pointer(el: HTMLElement, type: string, x: number, y: number) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
  fireEvent(el, ev);
}

describe('useDraggable', () => {
  it('starts with a zero offset', () => {
    render(<Box />);
    expect(screen.getByTestId('offset').textContent).toBe('0,0');
  });

  it('moves the offset by the pointer delta during a drag', () => {
    render(<Box />);
    const handle = screen.getByTestId('handle');
    pointer(handle, 'pointerdown', 100, 100);
    pointer(handle, 'pointermove', 130, 150);
    pointer(handle, 'pointerup', 130, 150);
    expect(screen.getByTestId('offset').textContent).toBe('30,50');
  });

  it('accumulates across successive drags', () => {
    render(<Box />);
    const handle = screen.getByTestId('handle');
    pointer(handle, 'pointerdown', 0, 0);
    pointer(handle, 'pointermove', 10, 10);
    pointer(handle, 'pointerup', 10, 10);
    pointer(handle, 'pointerdown', 0, 0);
    pointer(handle, 'pointermove', 5, -3);
    pointer(handle, 'pointerup', 5, -3);
    expect(screen.getByTestId('offset').textContent).toBe('15,7');
  });

  it('flags didDragRef true once movement passes the threshold', () => {
    render(<Box />);
    const handle = screen.getByTestId('handle');
    pointer(handle, 'pointerdown', 0, 0);
    pointer(handle, 'pointermove', 20, 0);
    pointer(handle, 'pointerup', 20, 0);
    fireEvent.click(screen.getByTestId('dragged'));
    expect(screen.getByTestId('dragged').textContent).toBe('true');
  });

  it('leaves didDragRef false for a click with no real movement', () => {
    render(<Box />);
    const handle = screen.getByTestId('handle');
    pointer(handle, 'pointerdown', 0, 0);
    pointer(handle, 'pointermove', 1, 1);
    pointer(handle, 'pointerup', 1, 1);
    fireEvent.click(screen.getByTestId('dragged'));
    expect(screen.getByTestId('dragged').textContent).toBe('false');
  });
});
