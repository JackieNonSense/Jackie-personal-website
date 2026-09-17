import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InkArchive from '../components/studies/inktrace/InkArchive';

describe('InkTrace paper-drawer study', () => {
  it('explains the work without requiring any drawer and keeps the exit visible', () => {
    const { container } = render(<InkArchive />);
    expect(screen.getByRole('heading', { name: 'INKTRACE', level: 1 })).toBeVisible();
    expect(screen.getByText('A writing workspace for connected stories.')).toBeVisible();
    expect(screen.getByRole('link', { name: /Explore InkTrace/ })).toHaveAttribute('href', 'https://inktrace.app');
    expect(container.querySelector('audio,video,canvas')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Why I built it' })).not.toBeInTheDocument();
  });

  it('opens the WHY insert and closes it from its original tab', async () => {
    render(<InkArchive />);
    const tab = screen.getByRole('button', { name: 'Why I built it' });
    expect(tab).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tab);
    const region = await screen.findByRole('region', { name: 'Why I built it' });
    expect(tab).toHaveAttribute('aria-controls', region.id);
    expect(tab).toHaveAttribute('aria-expanded', 'true');
    expect(within(region).getByText(/Creative work shouldn’t be scattered/)).toBeVisible();
    fireEvent.click(tab);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Why I built it' })).not.toBeInTheDocument());
  });

  it('switches exclusively between drawers, including rapid clicks', async () => {
    render(<InkArchive />);
    for (const name of ['Why I built it', 'Inside the workspace', 'How things connect', 'Why I built it', 'Inside the workspace']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    await screen.findByRole('region', { name: 'Inside the workspace' });
    await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(1));
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Inside the workspace' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('lets Escape and the insert close control return focus to the originating tab', async () => {
    render(<InkArchive />);
    const tab = screen.getByRole('button', { name: 'How things connect' });
    fireEvent.click(tab);
    const close = await screen.findByRole('button', { name: 'Close How things connect' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument());
    expect(tab).toHaveFocus();
    fireEvent.click(tab);
    fireEvent.click(await screen.findByRole('button', { name: 'Close How things connect' }));
    expect(tab).toHaveFocus();
  });

  it('allows touch-style click without hover and never dismisses content on pointer leave', async () => {
    render(<InkArchive />);
    const tab = screen.getByRole('button', { name: 'Inside the workspace' });
    fireEvent.click(tab);
    fireEvent.pointerLeave(tab);
    expect(await screen.findByRole('region', { name: 'Inside the workspace' })).toBeVisible();
    expect(screen.getByText('WORLD NOTES')).toBeVisible();
  });

  it('respects reduced motion while retaining all content and has a manual motion switch', async () => {
    render(<InkArchive />);
    expect(screen.getByRole('main')).toHaveAttribute('data-motion', 'still');
    const pause = screen.getByRole('button', { name: /Pause motion/ });
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: /Resume motion/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Why I built it' }));
    expect(await screen.findByRole('region', { name: 'Why I built it' })).toBeVisible();
  });

  it('responds to an OS motion preference change without requiring a reload', () => {
    const media = { matches: false, addEventListener: (_: string, handler: () => void) => listeners.add(handler), removeEventListener: (_: string, handler: () => void) => listeners.delete(handler) };
    const listeners = new Set<() => void>();
    const mock = vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList);
    try {
      render(<InkArchive />);
      act(() => { media.matches = false; listeners.forEach(handler => handler()); });
      expect(screen.getByRole('main')).toHaveAttribute('data-motion', 'animated');
      act(() => { media.matches = true; listeners.forEach(handler => handler()); });
      expect(screen.getByRole('main')).toHaveAttribute('data-motion', 'still');
    } finally { mock.mockRestore(); }
  });
});
