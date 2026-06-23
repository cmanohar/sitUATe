import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UatRoot } from '../src/UatRoot';

// Covers the orchestration that doesn't need layout/paint: toggling select mode
// reveals the hint bar, and the "note this screen" path opens the popover.
// Element-pick + capture are verified live.
describe('UatRoot', () => {
  it('renders the launcher and no popover initially', () => {
    render(<UatRoot />);
    expect(screen.getByRole('button', { name: /uat feedback/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the select-mode hint after toggling the launcher', () => {
    render(<UatRoot />);
    fireEvent.click(screen.getByRole('button', { name: /uat feedback/i }));
    expect(screen.getByRole('button', { name: /note this screen/i })).toBeInTheDocument();
  });

  it('opens a screen-note popover from the hint bar', () => {
    render(<UatRoot />);
    fireEvent.click(screen.getByRole('button', { name: /uat feedback/i }));
    fireEvent.click(screen.getByRole('button', { name: /note this screen/i }));
    expect(screen.getByRole('dialog', { name: /screen note/i })).toBeInTheDocument();
  });

  it('closes the popover on cancel', () => {
    render(<UatRoot />);
    fireEvent.click(screen.getByRole('button', { name: /uat feedback/i }));
    fireEvent.click(screen.getByRole('button', { name: /note this screen/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
