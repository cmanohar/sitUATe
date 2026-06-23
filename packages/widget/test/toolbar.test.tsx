import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UatToolbar } from '../src/UatToolbar';

describe('UatToolbar', () => {
  it('renders the launcher button', () => {
    render(<UatToolbar active={false} count={0} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /uat feedback/i })).toBeInTheDocument();
  });

  it('shows a count badge when there are findings', () => {
    render(<UatToolbar active={false} count={3} onToggle={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides the badge when count is zero', () => {
    render(<UatToolbar active={false} count={0} onToggle={() => {}} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('calls onToggle when the launcher is clicked', () => {
    const onToggle = vi.fn();
    render(<UatToolbar active={false} count={0} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /uat feedback/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('reflects active state with a pressed aria attribute', () => {
    render(<UatToolbar active count={0} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /uat feedback/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('uses design-system token classes (no hardcoded hex)', () => {
    const { container } = render(<UatToolbar active={false} count={0} onToggle={() => {}} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('does not toggle when the launcher is dragged', () => {
    const onToggle = vi.fn();
    render(<UatToolbar active={false} count={0} onToggle={onToggle} />);
    const btn = screen.getByRole('button', { name: /uat feedback/i });

    const fire = (type: string, x: number, y: number) => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
      Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
      fireEvent(btn, ev);
    };
    fire('pointerdown', 0, 0);
    fire('pointermove', 60, 10);
    fire('pointerup', 60, 10);
    fireEvent.click(btn);

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('still toggles on a plain click with no drag', () => {
    const onToggle = vi.fn();
    render(<UatToolbar active={false} count={0} onToggle={onToggle} />);
    const btn = screen.getByRole('button', { name: /uat feedback/i });

    const fire = (type: string, x: number, y: number) => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
      Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
      fireEvent(btn, ev);
    };
    fire('pointerdown', 0, 0);
    fire('pointerup', 0, 0);
    fireEvent.click(btn);

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
