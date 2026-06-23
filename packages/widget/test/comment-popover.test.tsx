import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommentPopover } from '../src/CommentPopover';

function setup(props: Partial<React.ComponentProps<typeof CommentPopover>> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <CommentPopover scope="element" onSubmit={onSubmit} onCancel={onCancel} {...props} />,
  );
  return { onSubmit, onCancel };
}

describe('CommentPopover', () => {
  it('renders a comment field, severity options, and actions', () => {
    setup();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^critical$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^high$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^medium$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^low$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('disables Save until a comment is entered', () => {
    setup();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Broken layout' } });
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });

  it('submits the comment, chosen severity, and category', () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Crashes on load' } });
    fireEvent.click(screen.getByRole('button', { name: /^critical$/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ comment: 'Crashes on load', severity: 'Critical' }),
    );
  });

  it('calls onCancel when Cancel is clicked', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('applies the severity token classes', () => {
    setup();
    expect(screen.getByRole('button', { name: /^critical$/i }).className).toContain('text-red-700');
    expect(screen.getByRole('button', { name: /^high$/i }).className).toContain('text-amber-700');
    expect(screen.getByRole('button', { name: /^medium$/i }).className).toContain('text-yellow-700');
  });

  it('labels the popover by scope', () => {
    setup({ scope: 'screen' });
    expect(screen.getByText(/screen note/i)).toBeInTheDocument();
  });

  it('exposes a drag handle that repositions the card without losing the form', () => {
    setup();
    const handle = screen.getByTestId('uat-card-drag-handle');
    const card = screen.getByRole('dialog');
    expect(card.style.transform).not.toMatch(/translate\(40px, 30px\)/);

    const move = (type: string, x: number, y: number) => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
      Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
      fireEvent(handle, ev);
    };
    move('pointerdown', 0, 0);
    move('pointermove', 40, 30);
    move('pointerup', 40, 30);

    expect(card.style.transform).toContain('translate(40px, 30px)');
    // Form still usable after dragging.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'still works' } });
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });
});
