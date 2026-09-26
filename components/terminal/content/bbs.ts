import { FallGame } from './games/fall';
import { OrbitGame } from './games/orbit';
import { FALL_SCORES } from './disk';
import { logOff } from './ending';
import { LIGHTHOUSE } from './lighthouse';
import { PHOTOS, ROOM_SCREEN_URL } from './photos';
import { BOOT } from './boot';
import { BootApp } from '../system/apps/boot';
import { GameApp } from '../system/apps/game';
import { NovelApp } from '../system/apps/novel';
import { PicViewApp, type Slide } from '../system/apps/picview';
import { ShellApp, type ProgramTable } from '../system/apps/shell';
import type { FileNode } from '../system/fs';
import type { App, Machine } from '../system/machine';

/*
 * How Jackie Random's machine is put together: what boots, which programs the disk
 * can run, and the DOS prompt under the desk. The desk itself is content/desktop.ts;
 * the words live in board.ts, diary.ts, disk.ts, channels.ts and lighthouse.ts.
 */

export const PROGRAMS: ProgramTable = {
  fall: () => new GameApp(new FallGame(FALL_SCORES), 'fall'),
  // ORBIT has five stages and counts on a sixth: a divide by zero Jackie meant to find later.
  orbit: () => new GameApp(new OrbitGame(), 'orbit'),
  picview: (m, args) => pictureViewer(m, args[0]),
  lighthouse: () => lighthouse(),
};

export const lighthouse = () => new NovelApp({ en: 'LIGHTHOUSE', zh: '灯塔' }, LIGHTHOUSE, 'read:lighthouse');

/** PICVIEW: the pictures in a directory, starting at the one named. */
export function pictureViewer(m: Machine, name?: string, dir?: string): App | { en: string; zh: string } {
  const found = name ? m.fs.resolve(name) : null;
  if (name && (!found || found.node.kind !== 'file' || !found.node.photo)) return { en: 'File not found', zh: '找不到文件' };
  const where = found ? m.fs.resolve('/' + found.parts.slice(0, -1).join('/')) : m.fs.resolve(dir ?? '.');
  if (!where || where.node.kind !== 'dir') return { en: 'File not found', zh: '找不到文件' };
  const files = m.fs.list(where.node).filter((n): n is FileNode => n.kind === 'file' && Boolean(n.photo));
  if (!files.length) return { en: 'No pictures here.', zh: '这里没有图片。' };
  const slides: Slide[] = files.map(f => {
    const photo = PHOTOS[f.photo!];
    return {
      name: f.name, url: photo.url, stall: photo.stall, flag: `photo:${f.photo}`,
      taken: photo.taken === 'now' ? null : photo.taken,
      screen: photo.live ? roomScreen : undefined,
    };
  });
  const start = found ? files.findIndex(f => f === found.node) : 0;
  return new PicViewApp(slides, Math.max(0, start));
}

async function roomScreen(): Promise<[number, number][] | null> {
  try {
    const data = await (await fetch(ROOM_SCREEN_URL)).json() as { screen: [number, number][] };
    return data.screen?.length === 4 ? data.screen : null;
  } catch { return null; }
}

let dos: ShellApp | null = null;
/** The DOS prompt under the desk: one for the session, so its screen and history stay. */
export function shell(): ShellApp {
  dos ??= new ShellApp(PROGRAMS, {
    exit: m => { logOff(m); return true; },
    logoff: m => { logOff(m); return true; },
    quit: m => { logOff(m); return true; },
  });
  return dos;
}

/** A fresh session (a new page, or a test): forget the old prompt. */
export function resetSession(): void { dos = null; }

export const boot = () => { resetSession(); return new BootApp(BOOT); };
