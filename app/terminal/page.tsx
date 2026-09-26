import type { Metadata, Viewport } from 'next';
import Terminal from '@/components/terminal/Terminal';

export const metadata: Metadata = {
  title: 'Terminal — Yuchao Wang',
};

/** The screen is the whole page on a phone: it does not zoom. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TerminalPage() {
  return <Terminal />;
}
