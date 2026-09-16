'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

/** Unlike the installed Motion 12 hook, this updates on live OS preference changes. */
export function useLiveReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
