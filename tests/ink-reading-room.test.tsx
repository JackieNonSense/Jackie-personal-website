import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InkReadingRoom from '../components/studies/inktrace-reading/InkReadingRoom';

describe('InkTrace reading-room design study', () => {
  it('presents an explicitly labelled, silent editorial demo and an unconditional product link', () => {
    const { container } = render(<InkReadingRoom />);
    expect(screen.getByRole('heading', { name: 'A world beyond the page.' })).toBeVisible();
    expect(screen.getByText('Interactive excerpt · not product UI')).toBeVisible();
    expect(screen.getByRole('link', { name: /Visit InkTrace/ })).toHaveAttribute('href', 'https://inktrace.app');
    expect(container.querySelector('audio,video,canvas,iframe')).toBeNull();
  });

  it('opens the shared record from a name without removing the source paragraph', () => {
    render(<InkReadingRoom />);
    const reference = screen.getByRole('button', { name: 'Read about Archivists of Old' });
    fireEvent.click(reference);
    expect(reference).toHaveAttribute('aria-expanded', 'true');
    const record = screen.getByRole('region', { name: 'Linked record' });
    expect(within(record).getByRole('heading', { name: 'Archivists of Old' })).toBeVisible();
    expect(within(record).getByText(/not a single individual/)).toBeVisible();
    expect(screen.getByText('The sealed archives beneath the Capital.')).toBeVisible();
    expect(reference).toHaveAttribute('aria-controls', record.id);
  });

  it('keeps only the last requested record after rapid selection', () => {
    render(<InkReadingRoom />);
    for (const name of ['Archivists of Old', 'Second Era', 'Archivists of Old', 'Second Era']) {
      fireEvent.click(screen.getByRole('button', { name: `Read about ${name}` }));
    }
    const record = screen.getByRole('region', { name: 'Linked record' });
    expect(within(record).getByRole('heading', { name: 'Second Era' })).toBeVisible();
    expect(within(record).queryByRole('heading', { name: 'Archivists of Old' })).not.toBeInTheDocument();
  });

  it('closes with Escape and restores focus to the source reference', () => {
    render(<InkReadingRoom />);
    const reference = screen.getByRole('button', { name: 'Read about Archivists of Old' });
    fireEvent.click(reference);
    const close = screen.getByRole('button', { name: 'Close record' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Linked record' })).not.toBeInTheDocument();
    expect(reference).toHaveFocus();
    expect(reference).toHaveAttribute('aria-expanded', 'false');
  });

  it('has a visible close control and supports touch without a hover gate', () => {
    render(<InkReadingRoom />);
    const reference = screen.getByRole('button', { name: 'Read about Second Era' });
    fireEvent.click(reference);
    fireEvent.pointerLeave(reference);
    expect(screen.getByRole('region', { name: 'Linked record' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close record' }));
    expect(reference).toHaveFocus();
    expect(screen.queryByRole('region', { name: 'Linked record' })).not.toBeInTheDocument();
  });

  it('provides a connection view with the correct source and two distinct relationships', () => {
    render(<InkReadingRoom />);
    fireEvent.click(screen.getByRole('tab', { name: 'Connections' }));
    expect(screen.getByRole('tab', { name: 'Connections' })).toHaveAttribute('aria-selected', 'true');
    const graph = screen.getByRole('region', { name: 'Connections from The Dungeon' });
    expect(within(graph).getByText('Built by')).toBeVisible();
    expect(within(graph).getByText('Built during')).toBeVisible();
    expect(within(graph).getByRole('button', { name: 'Open Archivists of Old record' })).toBeVisible();
    fireEvent.click(within(graph).getByRole('button', { name: 'Open Archivists of Old record' }));
    expect(screen.getByRole('tab', { name: 'Writing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('region', { name: 'Linked record' })).toBeVisible();
  });

  it('supports arrow-key tab navigation with one selected panel', () => {
    render(<InkReadingRoom />);
    const writing = screen.getByRole('tab', { name: 'Writing' });
    writing.focus();
    fireEvent.keyDown(writing, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Connections' })).toHaveFocus();
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Connections' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'AI workflow' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'AI workflow' })).toHaveAttribute('aria-selected', 'true');
  });

  it('describes AI review before writing and never pretends to run live AI', () => {
    const { container } = render(<InkReadingRoom />);
    fireEvent.click(screen.getByRole('tab', { name: 'AI workflow' }));
    const panel = screen.getByRole('tabpanel', { name: 'AI workflow' });
    expect(within(panel).getByText('Workflow illustration. No live AI runs here.')).toBeVisible();
    expect(within(panel).getByRole('heading', { name: 'Review before writing.' })).toBeVisible();
    expect(within(panel).getByText(/Only after your confirmation/)).toBeVisible();
    expect(container.querySelector('form,textarea,audio,video,iframe')).toBeNull();
  });

  it('respects manual pause without making records inaccessible', () => {
    render(<InkReadingRoom />);
    expect(screen.getByRole('main')).toHaveAttribute('data-motion', 'still');
    fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(screen.getByRole('button', { name: 'Resume motion' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Read about Archivists of Old' }));
    expect(screen.getByRole('region', { name: 'Linked record' })).toBeVisible();
  });

  it('responds to live system motion preferences without remounting', () => {
    const listeners = new Set<() => void>();
    const media = { matches: false, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) };
    const mock = vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList);
    try {
      render(<InkReadingRoom />);
      expect(screen.getByRole('main')).toHaveAttribute('data-motion', 'animated');
      act(() => { media.matches = true; listeners.forEach(fn => fn()); });
      expect(screen.getByRole('main')).toHaveAttribute('data-motion', 'still');
    } finally { mock.mockRestore(); }
  });
});
