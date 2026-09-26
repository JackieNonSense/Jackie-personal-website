import { describe, expect, it } from 'vitest';
import { CANVAS, PaintDoc } from '../components/terminal/graphics/paint';
import { decodeDrawing, encodeDrawing } from '../components/terminal/graphics/pcx';
import { dosName, drawings, loadDrawing, saveDrawing } from '../components/terminal/content/paint';
import { logOff } from '../components/terminal/content/ending';
import { SaverApp } from '../components/terminal/system/apps/saver';
import { CAMERA, clipNear, project, type Vec3 } from '../components/terminal/graphics/raster3d';
import { CRASH, OrbitGame, STAGES, newOrbit, step, type OrbitEvent } from '../components/terminal/content/games/orbit';
import { GameApp } from '../components/terminal/system/apps/game';
import { harness } from './terminal-harness';

describe('drawings on the disk', () => {
  it('keeps a drawing in a few bytes and gets every pixel back', () => {
    const doc = new PaintDoc();
    doc.rect(10, 10, 100, 60, 4, true);
    doc.line(0, 159, 255, 0, 15);
    const text = encodeDrawing(doc.data);
    expect(text.startsWith('JRPCX1:')).toBe(true);
    expect(text.length).toBeLessThan(6000);
    expect(decodeDrawing(text, CANVAS.w * CANVAS.h)).toEqual(doc.data);
    expect(decodeDrawing('nonsense', CANVAS.w * CANVAS.h)).toBeNull();
    expect(decodeDrawing(text, 10)).toBeNull();
  });

  it('names drawings the way DOS would', () => {
    expect(dosName('sea')).toBe('SEA.PCX');
    expect(dosName('Night_01')).toBe('NIGHT_01.PCX');
    expect(dosName('toolongname')).toBeNull();
    expect(dosName('two words')).toBeNull();
  });
});

describe('paint', () => {
  it('fills, draws lines and undoes', () => {
    const doc = new PaintDoc();
    doc.begin();
    doc.rect(0, 0, 9, 9, 2, false);
    doc.begin();
    doc.fill(5, 5, 9);
    expect(doc.data[5 * CANVAS.w + 5]).toBe(9);
    expect(doc.data[20 * CANVAS.w + 20]).toBe(0);
    expect(doc.undo()).toBe(true);
    expect(doc.data[5 * CANVAS.w + 5]).toBe(0);
    expect(doc.data[0]).toBe(2);
  });

  it('draws with the mouse, counts an undo as a second thought, and saves to C:\\DRAFTS', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('paint'));
    expect(h.gui().openWindows.at(-1)).toBe('paint');
    const r = h.gui().rectOf('paint')!;
    // Across the middle of the canvas.
    const y = r.y + 130;
    h.drag([r.x + 120, y], [r.x + 300, y]);
    const w = h.gui().rectOf('paint')!;
    void w;
    const painted = () => h.m.store.get<unknown[]>('drawings', []).length;
    const before = h.m.hesitations;
    h.clickText('Undo');
    expect(h.m.hesitations).toBe(before + 1);
    h.drag([r.x + 120, y], [r.x + 300, y]);
    h.clickText('Save as...');
    h.keys('sea');
    h.press('Enter');
    expect(painted()).toBe(1);
    expect(drawings(h.m)[0].name).toBe('SEA.PCX');
    const data = loadDrawing(h.m, 'SEA.PCX')!;
    expect(data.some(v => v !== 0)).toBe(true);
    // In the Files window, in C:\DRAFTS; a new visit finds it there too.
    const again = harness('wide', h.store);
    again.onDesk();
    again.click(...again.at('files'));
    again.dblclickText('DRAFTS', 'file-list');
    expect(again.screen()).toContain('SEA');
    again.dblclickText('SEA', 'file-list');
    expect(again.gui().openWindows.at(-1)).toBe('paint');
    expect(again.screen()).toContain('SEA.PCX');
  });
});

describe('screen saver', () => {
  it('comes on after a minute of quiet, and the touch that wakes it does nothing else', () => {
    const h = harness();
    h.onDesk();
    h.press('Escape');
    const [x, y] = h.at('files');
    h.run(61);
    expect(h.m.top).toBeInstanceOf(SaverApp);
    h.click(x, y);
    expect(h.m.top).not.toBeInstanceOf(SaverApp);
    expect(h.gui().openWindows).toEqual([]);
  });

  it('stays off when it is switched off', () => {
    const h = harness();
    h.store.set('saver', 'off');
    h.onDesk();
    h.run(70);
    expect(h.m.top).not.toBeInstanceOf(SaverApp);
  });

  it('draws the coast and the seeds without trouble', () => {
    for (const kind of ['lighthouse', 'seeds'] as const) {
      const h = harness();
      h.onDesk();
      h.m.push(new SaverApp(kind));
      h.run(8);
      expect([...h.m.graphics()].some(v => v !== 0)).toBe(true);
      h.press('x');
      expect(h.m.top).not.toBeInstanceOf(SaverApp);
    }
  });
});

describe('ORBIT', () => {
  const still = { x: 0, y: 0, aim: null, fire: false };
  /** Plays until the phase changes (or the time is up), collecting what happened. */
  const until = (s: ReturnType<typeof newOrbit>, phase: string, seconds: number, input = still) => {
    const events: OrbitEvent[] = [];
    for (let t = 0; t < seconds && s.phase !== phase; t += 1 / 30) events.push(...step(s, 1 / 30, input));
    return events;
  };

  it('projects through a pinhole and cuts at the near plane', () => {
    expect(project(CAMERA, [0, 0, 5])).toEqual([320, 200]);
    expect(project(CAMERA, [1, 1, 2])).toEqual([480, 40]);
    expect(project(CAMERA, [0, 0, 0.1])).toBeNull();
    const cut = clipNear([[0, 0, 0], [1, 0, 2], [0, 1, 2]] as Vec3[], 0.5);
    expect(cut.every(p => p[2] >= 0.5)).toBe(true);
    expect(cut.length).toBe(4);
  });

  it('goes from stage to stage, faster each time, and falls over after the fifth', () => {
    const s = newOrbit(7);
    s.lives = 99;
    expect(STAGES).toHaveLength(5);
    expect(STAGES.map(st => st.speed)).toEqual([...STAGES.map(st => st.speed)].sort((a, b) => a - b));
    for (let n = 0; n < 5; n++) {
      until(s, 'play', 5);
      expect(s.stage).toBe(n);
      s.safe = 999;
      until(s, 'clear', STAGES[n].length + 30);
      expect(s.phase).toBe('clear');
    }
    const events = until(s, 'crash', 10);
    expect(events).toContain('crash');
    expect(s.phase).toBe('crash');
  });

  it('takes a life for a collision, and scores a ring flown through', () => {
    const s = newOrbit(3);
    until(s, 'play', 5);
    s.objects.push({ kind: 'rock', pos: [s.ship.x, s.ship.y, 3.3], rot: [0, 0, 0], spin: [0, 0, 0], r: 0.6, hp: 2, mesh: { verts: [], faces: [] }, fire: 9 });
    step(s, 1 / 60, still);
    expect(s.lives).toBe(2);
    const score = s.score;
    s.safe = 0;
    s.objects.push({ kind: 'ring', pos: [s.ship.x, s.ship.y, 3.3], rot: [0, 0, 0], spin: [0, 0, 0], r: 1.1, hp: Infinity, mesh: { verts: [], faces: [] }, fire: 9 });
    const events = step(s, 1 / 60, still);
    expect(events).toContain('ring');
    expect(s.score).toBe(score + 50);
  });

  it('plays the same way from the same seed', () => {
    const a = newOrbit(11), b = newOrbit(11);
    for (let i = 0; i < 600; i++) { step(a, 1 / 30, { ...still, fire: i % 3 === 0 }); step(b, 1 / 30, { ...still, fire: i % 3 === 0 }); }
    expect(a.score).toBe(b.score);
    expect(a.objects.map(o => o.pos)).toEqual(b.objects.map(o => o.pos));
  });

  it('ends at the DOS prompt with the old error, and any key goes back', () => {
    const h = harness();
    h.onDesk();
    const game = new OrbitGame();
    const app = new GameApp(game, 'orbit');
    h.m.push(app);
    h.press(' ');
    game.state.phase = 'six';
    game.state.t = 2.1;
    h.run(0.5);
    expect(h.screen()).toContain(CRASH);
    expect(h.screen()).toContain('C:\\GAMES>');
    h.press('x');
    expect(h.m.top).not.toBe(app);
  });
});

describe('the seed and a drawing', () => {
  it('lets a drawing from the drafts go with the seed, and changes the number with it', () => {
    const run = (attach: boolean) => {
      const h = harness();
      h.onDesk();
      const doc = new PaintDoc();
      doc.rect(20, 20, 200, 120, 12, true);
      saveDrawing(h.m, 'MINE.PCX', doc.data);
      h.m.mark('file:SYSTEM/SEED.LOG');
      logOff(h.m);
      h.run(12);
      h.keys('same words');
      if (attach) h.click(274, 367);
      // With a drawing on the disk, SUBMIT sits to the right of ATTACH.
      h.click(402, 367);
      h.run(12);
      return { screen: h.screen(), code: (h.store.get<{ code: string } | null>('seed', null))!.code };
    };
    const plain = run(false), drawn = run(true);
    expect(drawn.screen).toContain('+ MINE.PCX');
    expect(plain.screen).not.toContain('MINE.PCX');
    expect(drawn.code).not.toBe(plain.code);
  });
});
