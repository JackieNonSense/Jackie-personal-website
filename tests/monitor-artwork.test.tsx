import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import MonitorEntry from '../components/portfolio/MonitorEntry';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

it('keeps the approved cyan shell and replaces boot explanations with the JR entry on hover', () => {
  const { container } = render(<MonitorEntry still />);
  const link = screen.getByRole('link', { name: 'Open monitor' });
  const image = container.querySelector('img[data-device-fallback="monitor"]');
  expect(image).toHaveAttribute('src', '/portfolio/monitor-cyan-cutout-v02.png');
  const screenLayer = container.querySelector('[data-monitor-fallback-screen]');
  expect(screenLayer).toHaveAttribute('aria-hidden', 'true');
  fireEvent.pointerEnter(link);
  expect(screenLayer).toHaveAttribute('aria-hidden', 'false');
  expect(screenLayer?.textContent).toBe('JR\nENTER');
  expect(screenLayer).not.toHaveTextContent('DISPLAY INITIALIZED');
  expect(screenLayer).not.toHaveTextContent('TERMINAL READY');
  expect(container.querySelector('img[data-device-fallback="monitor"]')).toBe(image);
  expect(container.querySelector('[data-crt-display]')).toHaveAttribute('data-crt-display', 'phosphor');
  expect(screenLayer).toHaveAttribute('data-display-transcript', 'true');
  fireEvent.pointerLeave(link);
  expect(screenLayer).toHaveAttribute('aria-hidden', 'true');
});

it('ships a real alpha cutout with an opaque dark screen instead of masking a rectangular picture', async () => {
  const path = 'public/portfolio/monitor-cyan-cutout-v02.png';
  expect(existsSync(path)).toBe(true);
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(4);
  for (const [x,y] of [[0,0],[info.width/2,20],[20,info.height/2],[info.width-20,info.height/2],[info.width/2,info.height-20]]) {
    expect(data[(Math.floor(y)*info.width+Math.floor(x))*4+3]).toBe(0);
  }
  const center = (Math.floor(info.height*.45)*info.width+Math.floor(info.width/2))*4;
  expect(data[center+3]).toBeGreaterThan(245);
  expect(Math.max(...data.subarray(center,center+3))).toBeLessThan(25);
  const css = readFileSync('components/portfolio/MonitorEntry.module.css','utf8');
  expect(css).not.toContain('mask-image');
});

it('offers the same screen text on keyboard focus even when motion is paused', () => {
  const { container } = render(<MonitorEntry still />);
  const link = screen.getByRole('link', { name: 'Open monitor' });
  fireEvent.focus(link);
  expect(container.querySelector('[data-monitor-fallback-screen]')).toHaveAttribute('aria-hidden', 'false');
  expect(link).toHaveAttribute('href', '/terminal');
  fireEvent.blur(link);
  expect(container.querySelector('[data-monitor-fallback-screen]')).toHaveAttribute('aria-hidden', 'true');
});

it('retains a usable terminal entry if the supplied artwork fails to load', () => {
  const { container } = render(<MonitorEntry still />);
  fireEvent.error(container.querySelector('img[data-device-fallback="monitor"]')!);
  expect(container.querySelector('[data-monitor-renderer]')).toHaveAttribute('data-artwork', 'unavailable');
  expect(container.querySelector('[data-monitor-fallback-screen]')).toHaveAttribute('aria-hidden', 'false');
  expect(screen.getByRole('link', { name: 'ENTER TERMINAL ↗' })).toHaveAttribute('href', '/terminal');
  expect(container.querySelector('audio, video')).toBeNull();
});
