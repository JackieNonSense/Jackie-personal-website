import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SpriteProof from '../components/studies/inktrace-living-review/SpriteProof';

describe('sprite action proof controls', () => {
  it('offers all four real action samples and a static keyframe option', () => {
    render(<SpriteProof />);
    for (const label of ['Idle', 'Walk', 'Turn', 'Work']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeEnabled();
    }
    fireEvent.click(screen.getByRole('button', { name: /^Work$/ }));
    expect(screen.getByRole('button', { name: /^Work$/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Next frame/i }));
    expect(screen.getByRole('img', { name: /Three independent archive characters/i })).toBeInTheDocument();
  });
  it('a global still flag cannot be overridden by a local play button', () => {
    render(<SpriteProof still />);
    expect(screen.queryByRole('button', { name: /^Play motion$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Motion is held/i)).toBeInTheDocument();
  });
});
