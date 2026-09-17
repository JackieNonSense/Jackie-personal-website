import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import {readFileSync} from 'node:fs';
import InktraceShowcase from '../components/portfolio/InktraceShowcase';
it('explains the actual product and the confirmed motivation',()=>{
  render(<InktraceShowcase still/>);
  expect(screen.getByText('A writing workspace for connected stories.')).toBeVisible();
  expect(screen.getByText(/Creative work shouldn’t be scattered across disconnected tools/)).toBeVisible();
  expect(screen.getByRole('link',{name:/Visit Inktrace/})).toHaveTextContent('EXPLORE INKTRACE');
});
it('offers two keyboard-accessible annotations without pretending a diagram is a screenshot',()=>{
  render(<InktraceShowcase still/>);
  const note=screen.getByRole('button',{name:/Connect the story/});
  fireEvent.focus(note);
  expect(screen.getByTestId('inktrace-exhibit')).toHaveAttribute('data-highlight','connections');
  fireEvent.blur(note);
  expect(screen.getByTestId('inktrace-exhibit')).toHaveAttribute('data-highlight','');
});
it('falls back honestly when the public demonstration image cannot load',()=>{
  render(<InktraceShowcase still/>);
  fireEvent.error(screen.getByAltText(/public mind-map demonstration/));
  expect(screen.getByText('WORKSPACE STRUCTURE / NOT A PRODUCT SCREENSHOT')).toBeVisible();
  expect(screen.getByRole('link',{name:/Visit Inktrace/})).toBeEnabled();
});
it('draws the keyboard cue inside the clipped visit button',()=>{
  const css=readFileSync('components/portfolio/Inktrace.module.css','utf8');
  expect(css).toContain('.visit:focus-visible');
  expect(css).toContain('inset 0 0 0 2px');
});
