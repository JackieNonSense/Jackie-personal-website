import { describe, expect, it, vi } from 'vitest';
import { TvApp } from '../components/terminal/system/apps/tv';
import { CHANNELS } from '../components/terminal/content/channels';
import { INK } from '../components/terminal/crt/palette';
import { strWidth } from '../components/terminal/crt/font';
import { createGrid, rowText } from '../components/terminal/crt/grid';
import { RASTER_W } from '../components/terminal/crt/raster';
import { FileSystem, dir, file } from '../components/terminal/system/fs';
import { createStore } from '../components/terminal/system/storage';
import { wrap } from '../components/terminal/system/screen';
import { Teletype } from '../components/terminal/system/teletype';
import { eventsBetween, midiOf, parsePattern, parseTrack } from '../components/terminal/audio/sequencer';
import { GAME, THEME } from '../components/terminal/audio/tracks';
import { LEVELS, degrade } from '../components/terminal/graphics/bitmap';
import { boot } from '../components/terminal/content/bbs';
import { seedNumber, validSeedNumber } from '../components/terminal/content/ending';
import { glyphs, harness } from './terminal-harness';

describe('boot', () => {
  it('shows the mark, tests the hardware, loads, logs in by itself and greets Jackie', () => {
    const h = harness();
    h.m.push(boot());
    h.run(0.5);
    expect(h.m.mode).toBe('graphics');
    h.run(40);
    const said = h.said.join(' ');
    for (const line of ['J&R.', 'JR Modular BIOS', 'Verifying DMI Pool Data', 'Starting JR-DOS', 'Loading JR-DESK 3.0', 'Logging in as JACKIE', 'Welcome back, Jackie.']) expect(said).toContain(line);
    expect(said).not.toMatch(/NODE|LINE 1|PERSONAL TERMINAL/);
    expect(h.sounds).toEqual(expect.arrayContaining(['beep', 'disk']));
    // The machine is quiet: no music until a scene asks for it.
    expect(h.sounds.some(s => s.startsWith('music:'))).toBe(false);
    expect(h.store.get('visits', 0)).toBe(1);
    expect(h.screen()).toContain('Messages');
  });

  it('lets any key finish each stage, without the sounds of the skipped ones', () => {
    const h = harness();
    h.m.push(boot());
    h.run(0.1);
    // Keys faster than any stage can start: none of their sounds play.
    for (let i = 0; i < 7; i++) h.m.key({ key: 'x', ctrl: false });
    h.run(0.1);
    expect(h.sounds).not.toContain('disk');
    expect(h.screen()).toContain('Messages');
  });

  it('goes straight to the login on ESC, and the password types itself', () => {
    const h = harness();
    h.m.push(boot());
    h.run(0.1);
    const typed = h.m.keystrokes;
    h.press('Escape');
    expect(h.screen()).toContain('JACKIE');
    h.run(2.5);
    expect(h.screen()).toContain('********');
    // Nobody at the keyboard typed it.
    expect(h.m.keystrokes).toBe(typed);
  });

  it('remembers the last call on this device', () => {
    const store = createStore(null);
    store.set('visits', 3); store.set('lastVisit', Date.now() - 1000);
    const h = harness('wide', store);
    h.m.push(boot()); h.run(40);
    expect(h.said.join(' ')).toMatch(/Last call: \d{4}-\d\d-\d\d \d\d:\d\d, today/);
  });

  it('fits the BIOS on the 40-column page', () => {
    const h = harness('large');
    h.m.push(boot());
    for (let i = 0; i < 6; i++) {
      h.run(0.8);
      // The text page's rows; the login's window, drawn in pixels, is not made of them.
      expect(h.screen().split('\n').slice(0, 12).every(r => strWidth(r) === 40)).toBe(true);
      h.press('x');
    }
  });
});

describe('DOS', () => {
  it('lists, changes directory and types files', () => {
    const h = harness();
    h.dos();
    h.type('dir');
    expect(h.screen()).toMatch(/DIARY\s+<DIR>/);
    h.type('cd diary');
    expect(h.screen()).toContain('C:\\DIARY>');
    h.type('type 0001.txt');
    expect(h.screen()).toContain('Saw a drawing in my feed today.');
    h.type('nonsense');
    expect(h.screen()).toContain('Bad command or file name');
  });

  it('pages long files and returns to the prompt', () => {
    const h = harness('large');
    h.dos();
    h.type('type diary\\0004.txt');
    expect(h.screen()).toContain('0004.TXT');
    expect(h.screen()).toMatch(/1\/\d/);
    h.press(' ');
    expect(h.screen()).toMatch(/2\/\d/);
    h.press('Escape'); h.run(0.5);
    expect(h.screen()).toContain('C:\\>');
  });

  it('undeletes a file only with its lost first letter', () => {
    const h = harness();
    h.dos();
    h.type('cd diary');
    h.type('dir');
    expect(h.screen()).not.toContain('0019');
    h.type('undelete');
    expect(h.screen()).toContain('?019.TXT');
    h.type('undelete x019.txt');
    expect(h.screen()).toContain('No deleted file matches');
    h.type('undelete 0019.txt');
    expect(h.screen()).toContain('File successfully undeleted: 0019.TXT');
    h.type('type 0019.txt');
    expect(h.screen()).toContain('It was there first.');
  });

  it('completes names with TAB and recalls commands with the arrows', () => {
    const h = harness();
    h.dos();
    h.keys('cd dia');
    h.press('Tab');
    expect(h.m.line).toBe('cd DIARY\\');
    h.press('Enter'); h.run(0.3);
    h.press('ArrowUp');
    expect(h.m.line).toBe('cd DIARY\\');
  });

  it('runs programs by name and goes back to the desk with DESK, ESC or the button in the corner', () => {
    const h = harness();
    h.dos();
    h.type('games\\fall');
    expect(h.m.inputMode).toBe('pad');
    h.press('Escape'); h.run(0.3);
    expect(h.m.inputMode).toBe('text');
    h.type('desk');
    expect(h.screen()).toContain('Messages');
    h.click(...h.at('dos')); h.run(0.3);
    expect(h.screen()).toContain('C:\\>');
    h.click(620, 8);
    expect(h.screen()).toContain('Messages');
    h.click(...h.at('dos')); h.run(0.3);
    h.press('Escape');
    expect(h.screen()).toContain('Messages');
  });
});

describe('television', () => {
  it('tunes through static to channels, and empty numbers stay static', () => {
    const h = harness();
    h.onDesk();
    h.m.push(new TvApp(CHANNELS));
    expect(h.m.mode).toBe('static');
    expect(h.sounds).toContain('hiss:true');
    expect(h.audio.current).toBeNull();
    h.run(0.5);
    expect(h.m.mode).toBe('graphics');
    h.press('.'); h.run(0.6);
    expect(h.m.mode).toBe('graphics');
    expect(h.screen()).toContain('WEATHER');
    // Channel 8 looks like empty air, and sounds like it, until the broadcast comes through.
    h.press('8'); h.run(1.3);
    expect(h.sounds.filter(x => x.startsWith('hiss')).at(-1)).toBe('hiss:true');
    h.run(7);
    expect(h.sounds.filter(x => x.startsWith('hiss')).at(-1)).toBe('hiss:false');
    h.press('1'); h.press('1'); h.run(0.6);
    expect(h.screen()).toContain('NEWS');
    h.press('Escape');
    expect(h.sounds).toContain('hiss:false');
    expect(h.audio.current).toBeNull();
    expect(h.screen()).toContain('Messages');
  });
});

describe('channels', () => {
  it('every channel draws through a whole programme, quickly, in both languages', () => {
    for (const lang of ['en', 'zh'] as const) {
      const h = harness();
      if (lang === 'zh') { void h.m.setLanguage('zh'); h.run(0.1); }
      const d = h.m;
      for (const c of CHANNELS) {
        // The first frame works out what the channel keeps (a map, a picture's copies); then the clock runs.
        c.draw(d, 0);
        let worst = 0;
        for (let t = 0; t < 30; t += 0.37) {
          const start = performance.now();
          c.draw(d, t);
          worst = Math.max(worst, performance.now() - start);
        }
        // A channel must never take several frames' worth (the test machine may be busy with others).
        expect(worst, `channel ${c.number}`).toBeLessThan(60);
      }
    }
  });
});

describe('games', () => {
  it('plays with held keys, ends, keeps the best score and restores the music', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('games'));
    h.clickText('Play');
    expect(h.audio.current?.id).toBe('game');
    expect(h.screen()).toContain('FALL');
    h.press(' ');
    h.m.key({ key: 'ArrowLeft', ctrl: false });
    h.run(1);
    h.m.release('ArrowLeft');
    h.run(40);
    expect(h.screen()).toMatch(/SCORE \d+\s+BEST \d+/);
    h.press('Escape');
    expect(h.audio.current).toBeNull();
    expect(h.screen()).toContain('Messages');
  });

  it('starts ORBIT from the Games window', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('games'));
    h.clickText('ORBIT');
    h.clickText('Play');
    // No music: only the ship, its shots and what it hits.
    expect(h.audio.current).toBeNull();
    expect(h.screen()).toContain('ORBIT');
    h.press('Escape');
    expect(h.screen()).toContain('Messages');
  });
});

describe('illustrated story', () => {
  it('types the text, finishes it on SPACE, then turns the page', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('library'));
    h.clickText('Read');
    expect(h.m.mode).toBe('graphics');
    h.run(0.2);
    const early = h.screen();
    h.press(' ');
    expect(h.screen().length).toBe(early.length);
    expect(h.screen()).toContain('here is the shore.');
    h.press(' '); h.run(4);
    expect(h.screen()).toContain('Xiao Cheng');
    h.press('Escape');
    expect(h.screen()).toContain('Messages');
  });
});

describe('display', () => {
  it('lays text over graphics with blank cells transparent', () => {
    const h = harness();
    const b = h.m.graphics();
    b.fill(77); h.m.present();
    h.m.grid.codes[0] = 65;
    const raster = new Uint8Array(b.length);
    expect(h.m.render(raster, 0, 1)).toBe(true);
    expect(raster[0]).toBe(INK.tmText);
    expect(raster[RASTER_W * 20 + 100]).toBe(77);
    expect(h.m.render(raster, 0, 1)).toBe(false);
  });
});

describe('disk', () => {
  const fs = new FileSystem(dir('', 'd', [dir('A', 'd', [file('X.TXT', 'd', { text: 'x' }), file('GONE.TXT', 'd', { deleted: true })]), file('B.TXT', 'd')]));
  it('resolves DOS paths case-insensitively and hides deleted files', () => {
    expect(fs.resolve('a\\x.txt')?.node.name).toBe('X.TXT');
    expect(fs.resolve('C:/A/X.TXT')?.node.name).toBe('X.TXT');
    expect(fs.resolve('a\\gone.txt')).toBeNull();
    expect(fs.cd('a')).toBe(true);
    expect(fs.prompt).toBe('C:\\A>');
    expect(fs.resolve('..\\b.txt')?.node.name).toBe('B.TXT');
    expect(fs.complete('')).toEqual(['X.TXT']);
    fs.cd('\\');
  });
});

describe('teletype', () => {
  it('prints at its line speed and skips what it must', () => {
    const grid = createGrid(), lines: string[] = [];
    const t = new Teletype(grid, l => lines.push(l));
    let sound = false, screen = false;
    t.print('hello', 0, 10).call(() => { sound = true; }, false).call(() => { screen = true; });
    t.tick(0.25);
    expect(rowText(grid, 0).trim()).toBe('he');
    t.skip();
    expect(lines).toEqual(['hello']);
    expect([sound, screen]).toEqual([false, true]);
  });

  it('wraps words, keeps blank lines and indentation, and breaks long words', () => {
    expect(wrap('one two three', 8)).toEqual(['one two', 'three']);
    expect(wrap('a\n\nb', 10)).toEqual(['a', '', 'b']);
    expect(wrap('  indented words here', 12)).toEqual(['  indented', '  words here']);
    expect(wrap('abcdefghijk', 4)).toEqual(['abcd', 'efgh', 'ijk']);
  });
});

describe('music', () => {
  it('reads notes, holds and rests', () => {
    expect(midiOf('A4')).toBe(69);
    expect(midiOf('C#3')).toBe(49);
    const p = parsePattern('A3~4 . C4');
    expect(p.length).toBe(6);
    expect(p.hits).toEqual([{ step: 0, midi: 57, length: 4 }, { step: 5, midi: 60, length: 1 }]);
  });

  it('loops every part on its own and finds the notes in a window', () => {
    const parsed = parseTrack(THEME);
    const bar = 60 / THEME.bpm;
    const events = eventsBetween(THEME, parsed, 0, bar * 32);
    expect(events.length).toBeGreaterThan(100);
    expect(events.every((e, i) => i === 0 || e.time >= events[i - 1].time)).toBe(true);
    // Each part of both tracks lasts whole bars.
    for (const track of [THEME, GAME]) for (const { length } of parseTrack(track)) expect(length % 16).toBe(0);
  });
});

describe('pictures and lettering', () => {
  it('degrades a picture toward flat grey in the tube\'s four levels', () => {
    const data = new Uint8Array(64 * 64);
    data.forEach((_, i) => { data[i] = (i % 64) < 32 ? 0 : 255; });
    const spread = (d: Uint8Array) => { const mean = d.reduce((a, b) => a + b, 0) / d.length; return d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length; };
    const once = degrade({ width: 64, height: 64, data }, 1), many = degrade({ width: 64, height: 64, data }, 12);
    expect(new Set([...many.data]).size).toBeLessThanOrEqual(LEVELS.length);
    expect([...many.data].every(v => (LEVELS as readonly number[]).includes(v))).toBe(true);
    expect(spread(many.data)).toBeLessThan(spread(once.data));
  });

  it('keeps working in memory when storage throws', () => {
    const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } as unknown as Storage;
    const store = createStore(broken);
    expect(() => store.set('visits', 2)).not.toThrow();
    // Remembered for this visit only.
    expect(store.get('visits', 0)).toBe(2);
  });
});

describe('Chinese', () => {
  it('switches language in the settings, and DOS speaks it too', async () => {
    const h = harness();
    h.onDesk();
    h.click(10, 8);
    h.clickText('Settings...');
    h.clickText('中文');
    await h.settle(); h.run(0.1);
    const s = h.screen();
    expect(s).toContain('留言板');
    expect(s).toContain('设置');
    expect(h.store.get('lang', 'en')).toBe('zh');
    h.press('Escape');
    h.click(...h.at('dos')); h.run(1);
    expect(h.screen()).toContain('汉字系统');
    h.type('nonsense');
    expect(h.screen()).toContain('命令或文件名错误');
    h.type('type diary/0001.txt');
    expect(h.screen()).toContain('今天在推荐流里刷到一张画。');
  });

  it('breaks Chinese anywhere but never starts a line with a comma or full stop', () => {
    glyphs();
    const lines = wrap('一二三四五六七八九，十一二三四。五六七八九十', 10);
    expect(lines.every(l => strWidth(l) <= 10)).toBe(true);
    expect(lines.some(l => /^[，。]/.test(l))).toBe(false);
    expect(lines.join('')).toBe('一二三四五六七八九，十一二三四。五六七八九十');
  });

  it('keeps pictures made of characters as they were drawn', () => {
    expect(wrap('    {   2   7   }', 40)).toEqual(['    {   2   7   }']);
  });
});

describe('story', () => {
  it('recovers the seed log, which counts the visitor, and then a new photo exists', () => {
    const h = harness();
    h.dos();
    h.type('dir photos');
    expect(h.screen()).not.toContain('ROOM_010');
    h.type('cd system');
    h.type('undelete seed.log');
    expect(h.screen()).toContain('File successfully undeleted: SEED.LOG');
    h.type('type seed.log');
    expect(h.m.has('file:SYSTEM/SEED.LOG')).toBe(true);
    expect(h.screen()).not.toMatch(/VARIANT \d|JR-\d{4}/);
    h.press('Escape'); h.run(0.5);
    h.type('cls');
    h.type('dir /photos');
    expect(h.screen()).toContain('ROOM_010');
  });

  it('asks for a seed before the line drops, and numbers it', () => {
    const h = harness();
    h.dos();
    h.type('cd system');
    h.type('undelete seed.log');
    h.type('type seed.log');
    h.press('Escape'); h.run(1);
    h.type('exit');
    h.run(8);
    expect(h.screen()).toContain('SUBMIT A SEED');
    h.keys('a name');
    h.press('Enter'); h.run(10);
    const code = /JR-\w{4}-\w{4}-\w{4}/.exec(h.screen())?.[0];
    expect(code).toBeTruthy();
    expect(validSeedNumber(code!)).toBe(true);
    expect(h.m.has('seeded')).toBe(true);
    h.press('x'); h.run(3);
    expect(h.exited).toBe(true);
  });

  it('asks for the seed when logging off from the desk too', () => {
    const h = harness();
    h.m.mark('file:SYSTEM/SEED.LOG');
    h.onDesk();
    h.click(10, 8);
    h.clickText('Log off');
    h.press('Enter'); h.run(8);
    expect(h.screen()).toContain('SUBMIT A SEED');
  });

  it('checks seed numbers', () => {
    const code = seedNumber('hello', 12);
    expect(validSeedNumber(code)).toBe(true);
    expect(validSeedNumber(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'))).toBe(false);
    expect(validSeedNumber('JR-AAAA-AAAA-AAAA')).toBe(false);
  });

  it('remembers what was recovered and seen on the next visit', () => {
    const store = createStore(null);
    const first = harness('wide', store);
    first.dos();
    first.type('cd diary');
    first.type('undelete 0019.txt');
    const second = harness('wide', store);
    second.dos();
    second.type('cd diary');
    second.type('type 0019.txt');
    expect(second.screen()).toContain('It was there first.');
  });

  it('shows Jackie\'s note on channel 7 once the diary mentions it', () => {
    const h = harness();
    h.dos();
    h.type('type diary/0004.txt');
    h.press('Escape'); h.run(0.5);
    h.click(...h.at('tv')); h.run(1);
    // In the window the set is too small to read: full screen shows the note.
    h.press('Enter'); h.run(0.2);
    h.press('7'); h.run(2);
    expect(h.screen()).toContain('I drew this.');
  });

  it('runs ORBIT from DOS, and counts every hesitation', () => {
    const h = harness();
    h.dos();
    h.type('games/orbit');
    expect(h.screen()).toContain('ORBIT');
    h.press('Escape'); h.run(0.3);
    const before = h.m.hesitations;
    h.press('Backspace');
    expect(h.m.hesitations).toBe(before + 1);
  });
});

describe('message board', () => {
  it('opens on the newest message, reads in order and turns with the arrows', () => {
    const h = harness();
    h.onDesk();
    expect(h.screen()).toContain("I didn't write anything.");
    h.press('Home');
    expect(h.screen()).toContain('This is my little board.');
    h.press('ArrowRight');
    expect(h.screen()).toContain('time travel back to 1993');
    h.press('ArrowLeft');
    expect(h.screen()).toContain('This is my little board.');
    expect(h.m.has('post:2029-10-01/23:02/SYSOP')).toBe(true);
  });

  it('posts as JACKIE, and Cheng answers', () => {
    const h = harness();
    h.onDesk();
    h.clickText('New');
    h.keys('hello');
    h.press('Tab');
    h.keys('is anyone here');
    h.press('Enter');
    expect(h.screen()).toMatch(/JACKIE\s+hello/);
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 120_000);
    h.clickText('hello', 'board-list');
    h.press('End');
    expect(h.screen()).toContain('re: hello');
    clock.mockRestore();
  });
});

describe('PICVIEW', () => {
  it('reads a picture off the disk a line at a time and stamps the camera time', async () => {
    const h = harness();
    h.dos();
    h.type('picview photos/room_001.pcx');
    expect(h.m.mode).toBe('graphics');
    await h.settle();
    h.run(1);
    expect(h.screen()).toContain('ROOM_001.PCX');
    expect(h.screen()).toContain('03:07');
    expect(h.m.has('photo:room_001')).toBe(true);
    h.press('ArrowRight');
    expect(h.screen()).toContain('ROOM_002.PCX');
    h.press('Escape'); h.run(0.5);
    expect(h.screen()).toContain('C:\\>');
  });
});

describe('scrolling', () => {
  it('looks back through the DOS scrollback with the wheel, and any key returns', () => {
    const h = harness();
    h.dos();
    h.type('type diary/0001.txt');
    h.type('type diary/0002.txt');
    h.type('type diary/0003.txt');
    expect(h.screen()).not.toContain('Saw a drawing in my feed today.');
    for (let i = 0; i < 12; i++) h.m.scroll(-3);
    expect(h.screen()).toContain('Saw a drawing in my feed today.');
    expect(h.screen()).toContain('SCROLLBACK');
    h.press('x');
    expect(h.screen()).not.toContain('SCROLLBACK');
    expect(h.m.line).toBe('x');
  });

  it('keeps what CLS cleared in the scrollback', () => {
    const h = harness();
    h.dos();
    h.type('type diary/0024.txt');
    h.type('cls');
    expect(h.screen()).not.toContain('output nominal');
    for (let i = 0; i < 5; i++) h.m.scroll(-3);
    expect(h.screen()).toContain('output nominal');
  });

  it('reads the diary with MORE, one entry after another', () => {
    const h = harness();
    h.dos();
    h.type('cd diary');
    h.type('more 0001.txt');
    expect(h.screen()).toContain('Saw a drawing in my feed today.');
    h.press('n');
    expect(h.screen()).toContain('0002.TXT');
    expect(h.m.has('file:DIARY/0002.TXT')).toBe(true);
    h.press('p');
    expect(h.screen()).toContain('0001.TXT');
  });

  it('moves the board with the wheel', () => {
    const h = harness();
    h.onDesk();
    const row = h.gui().find('the photos')!;
    expect(row).not.toBeNull();
    h.wheel(row.x, row.y, -20);
    expect(h.gui().find("i'm here!!")).not.toBeNull();
  });
});
