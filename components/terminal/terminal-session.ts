import { INITIAL_MAILS, INITIAL_FILES, INITIAL_LOGS } from './terminal-data';
export const tabs = ['mail', 'files', 'logs', 'system', 'game'] as const;
export type Tab = typeof tabs[number];
export type Session = { awake: boolean; view: Tab | 'mail-read' | 'file-read'; selected: number; readIds: number[]; scroll: number };
export type Action = { type: 'wake' | 'sleep' | 'back' | 'open' } | { type: 'navigate'; view: Tab } | { type: 'select'; index: number } | { type: 'move'; delta: number };
export function initialSession(): Session { return { awake: false, view: 'mail', selected: 0, readIds: [], scroll: 0 }; }
export function activeTab(s: Session): Tab { return s.view === 'mail-read' ? 'mail' : s.view === 'file-read' ? 'files' : s.view; }
export function transition(s: Session, a: Action): Session {
  if (a.type === 'wake') return { ...s, awake: true };
  if (a.type === 'sleep') return { ...s, awake: false };
  if (!s.awake) return s;
  if (a.type === 'navigate') return { ...s, view: a.view, selected: 0, scroll: 0 };
  if (a.type === 'back') return { ...s, view: activeTab(s), scroll: 0 };
  if (a.type === 'open') {
    if (s.view === 'mail') return { ...s, view: 'mail-read', readIds: [...new Set([...s.readIds, INITIAL_MAILS[s.selected].id])] };
    if (s.view === 'files') return { ...s, view: 'file-read' };
    return s;
  }
  if (a.type === 'move' && s.view === 'logs') return { ...s, scroll: Math.max(0, Math.min(INITIAL_LOGS.length - 8, s.scroll + a.delta)) };
  if (a.type !== 'select' && a.type !== 'move') return s;
  const count = s.view === 'mail' ? INITIAL_MAILS.length : s.view === 'files' ? INITIAL_FILES.children!.length : 1;
  return { ...s, selected: Math.max(0, Math.min(count - 1, a.type === 'select' ? a.index : s.selected + a.delta)) };
}
export function contentFor(s: Session): { title: string; subtitle: string; body: string[] } {
  if (s.view === 'mail-read') { const m = INITIAL_MAILS[s.selected]; return { title: m.subject, subtitle: `${m.from} / ${m.date}`, body: m.body }; }
  if (s.view === 'file-read') { const f = INITIAL_FILES.children![s.selected]; return { title: f.name, subtitle: f.type === 'encrypted' ? 'RESTRICTED / LEVEL 5' : 'LOCAL ARCHIVE', body: f.content || [] }; }
  if (s.view === 'system') return { title: 'SYSTEM / DIAGNOSTICS', subtitle: 'TERMLINK v1.25 / BUILD 1981-03-01', body: ['MEMORY          64 KB / OK', 'STORAGE         360 KB FLOPPY', 'NETWORK         OFFLINE', '', 'PROJECT         ECHO', 'LOCATION        LAB 7', '', 'STATUS          CONTAINMENT BREACH'] };
  return { title: '', subtitle: '', body: [] };
}
export { INITIAL_MAILS as mails, INITIAL_FILES as files, INITIAL_LOGS as logs };

