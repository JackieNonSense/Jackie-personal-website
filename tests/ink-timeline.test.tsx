import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InkReadingRoom from '../components/studies/inktrace-reading/InkReadingRoom';

describe('InkTrace event-led portfolio study', () => {
  it('shows five ordered sample events without requiring a tab change', () => {
    render(<InkReadingRoom />);
    const timeline = screen.getByRole('region', { name: 'Story timeline' });
    const events = within(timeline).getByRole('list', { name: 'Events in story order' });
    expect(within(events).getAllByRole('listitem')).toHaveLength(5);
    expect(within(events).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
      'Open event: Infiltration of the Palace', 'Open event: Discovery of the Grimoire',
      'Open event: The Great Purge Begins', 'Open event: Decoding the Star-Map', 'Open event: Arrival at Black Harbor',
    ]);
    expect(within(timeline).getByText('Story order · spacing is not elapsed time')).toBeVisible();
    expect(within(timeline).getByRole('region', { name: 'Event details' })).toHaveTextContent('Discovery of the Grimoire');
  });

  it('changes the event drawer to the last selected event', () => {
    render(<InkReadingRoom />);
    for (const name of ['Infiltration of the Palace', 'The Great Purge Begins', 'Arrival at Black Harbor']) {
      fireEvent.click(screen.getByRole('button', { name: `Open event: ${name}` }));
    }
    const detail = screen.getByRole('region', { name: 'Event details' });
    expect(within(detail).getByRole('heading', { name: 'Arrival at Black Harbor' })).toBeVisible();
    expect(within(detail).getByText(/smuggler’s ship/)).toBeVisible();
    expect(within(detail).queryByText('The Great Purge Begins')).not.toBeInTheDocument();
  });

  it('expands the real writing note associated with the discovery event', () => {
    render(<InkReadingRoom />);
    const reveal = screen.getByRole('button', { name: 'Read writing note' });
    fireEvent.click(reveal);
    expect(reveal).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Writing note' })).toHaveTextContent('must mirror the prologue scene');
    fireEvent.click(reveal);
    expect(screen.queryByRole('region', { name: 'Writing note' })).not.toBeInTheDocument();
  });

  it('filters to the two events whose supplied summaries name Kaelen', () => {
    render(<InkReadingRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Open event: The Great Purge Begins' }));
    fireEvent.click(screen.getByRole('button', { name: 'Follow Kaelen' }));
    expect(screen.getByRole('button', { name: 'Follow Kaelen' })).toHaveAttribute('aria-pressed', 'true');
    const list = screen.getByRole('list', { name: 'Events in story order' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Event details' })).toHaveTextContent('Discovery of the Grimoire');
    fireEvent.click(screen.getByRole('button', { name: 'All events' }));
    expect(within(screen.getByRole('list', { name: 'Events in story order' })).getAllByRole('listitem')).toHaveLength(5);
  });

  it('closes with Escape and restores focus to the selected event', () => {
    render(<InkReadingRoom />);
    const close = screen.getByRole('button', { name: 'Close event' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Event details' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open event: Discovery of the Grimoire' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Open event: Discovery of the Grimoire' }));
    expect(screen.getByRole('region', { name: 'Event details' })).toBeVisible();
  });

  it('supports keyboard event navigation and keeps event access when motion is paused', () => {
    render(<InkReadingRoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
    const discovery = screen.getByRole('button', { name: 'Open event: Discovery of the Grimoire' });
    discovery.focus();
    fireEvent.keyDown(discovery, { key: 'ArrowRight' });
    const purge = screen.getByRole('button', { name: 'Open event: The Great Purge Begins' });
    expect(purge).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Event details' })).toHaveTextContent('The Great Purge Begins');
    fireEvent.keyDown(purge, { key: 'End' });
    expect(screen.getByRole('button', { name: 'Open event: Arrival at Black Harbor' })).toHaveFocus();
  });
});
