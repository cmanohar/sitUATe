import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ElementPicker } from '../src/ElementPicker';

// jsdom has no layout engine (elementFromPoint/getBoundingClientRect are inert),
// so hover-highlight + capture-phase click selection are verified live. Here we
// cover the wiring that IS testable: inactive render and Escape-to-cancel.
describe('ElementPicker', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(
      <ElementPicker active={false} onSelect={() => {}} onCancel={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('cancels on Escape while active', () => {
    const onCancel = vi.fn();
    render(<ElementPicker active onSelect={() => {}} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('removes its key listener after unmount (no cancel after unmount)', () => {
    const onCancel = vi.fn();
    const { unmount } = render(
      <ElementPicker active onSelect={() => {}} onCancel={onCancel} />,
    );
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
