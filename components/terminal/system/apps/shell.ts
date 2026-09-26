import { ATTR, clearGrid, type GridRow } from '../../crt/grid';
import { charWidth } from '../../crt/font';
import { deletedName, fileFlag, readText, sizeOf, type DirNode, type FileNode } from '../fs';
import { body, restore, snapshot, strWidth, text, wrap, type Snapshot } from '../screen';
import { Teletype } from '../teletype';
import { PagerApp } from './pager';
import { ButtonTracker, drawButtons, type OverlayButton } from '../gui/overlay';
import { GLYPH } from '../gui/icons';
import type { Gfx } from '../gui/gfx';
import type { Text } from '../i18n';
import type { App, Key, Machine, Pointer } from '../machine';

/**
 * Programs the shell can start by name, e.g. FALL.EXE, with what was typed after the
 * name. A program either takes over the screen (an App) or just prints and exits.
 */
export type ProgramTable = Record<string, (m: Machine, args: string[]) => App | Text | null>;

/** Width of the command line, in cells. */
const MAX_LINE = 70;

/** What JR-DOS says, in both languages (the Chinese is what Chinese DOS said). */
const SAY = {
  banner: { en: 'JR-DOS  Version 6.22', zh: 'JR-DOS 6.22 版  汉字系统' },
  intro: { en: 'Type HELP for commands. DESK, or the button in the corner, goes back to the desk.', zh: '输入 HELP 查看命令。输入 DESK，或点右上角的按钮，回到桌面。' },
  help: {
    en: [
      'DIR [path]        list files',
      'CD path           change directory   (CD .. goes up)',
      'TYPE file         show a file',
      'MORE file         read a file a page at a time (N next, P previous)',
      'PICVIEW file      show a picture',
      'UNDELETE [name]   recover a deleted file',
      'CLS               clear the screen',
      'VER               version',
      'DESK              back to the desk (or ESC on an empty line)',
      'EXIT              log off',
      '',
      'Run a program by typing its name.',
      'The wheel or PAGE UP looks back at what scrolled away.',
    ].join('\n'),
    zh: [
      'DIR [路径]        列出文件',
      'CD 路径           进入目录（CD .. 返回上一层）',
      'TYPE 文件         显示文件',
      'MORE 文件         分页阅读（N 下一篇，P 上一篇）',
      'PICVIEW 文件      看图',
      'UNDELETE [文件]   恢复被删除的文件',
      'CLS               清屏',
      'VER               版本',
      'DESK              回到桌面（或在空行按 ESC）',
      'EXIT              断线',
      '',
      '输入程序的名字即可运行它。',
      '滚轮或 PAGE UP 可以往回翻看滚出屏幕的内容。',
    ].join('\n'),
  },
  invalidDir: { en: 'Invalid directory', zh: '无效目录' },
  notFound: { en: 'File not found', zh: '找不到文件' },
  missing: { en: 'Required parameter missing', zh: '缺少必要参数' },
  denied: { en: 'Access denied', zh: '拒绝访问' },
  bad: { en: 'Bad command or file name', zh: '命令或文件名错误' },
  program: { en: 'This is a program. Type its name to run it.', zh: '这是程序文件，输入它的名字来运行。' },
  picture: { en: 'This is a picture. Use PICVIEW to see it.', zh: '这是图片文件，请用 PICVIEW 查看。' },
  noDeleted: { en: 'No deleted files found.', zh: '没有找到被删除的文件。' },
  deletedHere: { en: 'Deleted files in this directory:', zh: '本目录中被删除的文件：' },
  howTo: { en: 'Type UNDELETE with the full name to recover one.', zh: '输入 UNDELETE 加完整文件名来恢复。' },
  lostLetter: { en: 'The first letter was lost; you must supply it.', zh: '文件名的第一个字母已经丢失，需要你补上。' },
  noMatch: { en: 'No deleted file matches that name.', zh: '没有与此名称匹配的已删除文件。' },
} satisfies Record<string, Text>;

/**
 * JR-DOS: the machine underneath the BBS. A prompt, a disk to walk, files to read
 * and programs to run. TAB completes names; the arrows recall earlier commands.
 */
export class ShellApp implements App {
  /** CTRL+C stops what is printing; TAB completes a name. Every other CTRL key is the browser's. */
  readonly ctrlKeys = ['c'];
  readonly captureKeys = ['Tab'];
  private readonly buttons = new ButtonTracker();
  private tty: Teletype | null = null;
  private screen: Snapshot | null = null;
  private typed = '';
  private history: string[] = [];
  private recall = -1;
  private waiting = false;
  /** Rows that went off the top of the screen, oldest first. */
  private back: GridRow[] = [];
  /** How far back the view is scrolled, in rows; 0 is the live screen. */
  private offset = 0;
  private live: Snapshot | null = null;

  constructor(
    private readonly programs: ProgramTable,
    private readonly extra: Record<string, (m: Machine, args: string[]) => boolean> = {},
  ) {}

  line(): string { return this.typed; }

  show(m: Machine): void {
    if (!this.tty) this.tty = new Teletype(m.grid, line => m.announce(line));
    m.grid.cursor.visible = true;
    m.grid.scrollback = this.back;
    if (this.screen) { restore(m.grid, this.screen); return; }
    clearGrid(m.grid);
    this.tty.print(m.t(SAY.banner), ATTR.bright)
      .print(m.t(SAY.intro), ATTR.dim)
      .print('');
    this.prompt(m);
  }

  hide(m: Machine): void {
    this.toLive(m);
    this.screen = snapshot(m.grid);
    m.grid.scrollback = undefined;
  }

  /** Output stops the moment a command opens another program, and resumes on return. */
  tick(m: Machine, dt: number): void {
    // New output always lands on the live screen.
    if (this.offset && this.tty?.busy) this.toLive(m);
    this.tty?.tick(dt, () => m.top === this);
  }

  /** The wheel, a swipe, or PAGE UP / PAGE DOWN: look back through what scrolled away. */
  scroll(m: Machine, lines: number): void {
    const next = Math.max(0, Math.min(this.back.length, this.offset - lines));
    if (next === this.offset) return;
    if (!this.offset) this.live = snapshot(m.grid);
    this.offset = next;
    if (!next) { this.toLive(m); return; }
    const g = m.grid, liveRows: GridRow[] = [];
    for (let y = 0; y < g.rows; y++) liveRows.push({ codes: this.live!.codes.slice(y * g.cols, (y + 1) * g.cols), attrs: this.live!.attrs.slice(y * g.cols, (y + 1) * g.cols) });
    const rows = [...this.back, ...liveRows], start = this.back.length - next;
    for (let y = 0; y < g.rows; y++) {
      const row = rows[start + y];
      g.codes.set(row.codes, y * g.cols); g.attrs.set(row.attrs, y * g.cols);
    }
    g.cursor.visible = false;
    const mark = m.t({ en: ` SCROLLBACK -${next} `, zh: ` 回看 ${next} 行 ` });
    text(g, g.cols - strWidth(mark) - 1, 0, mark, ATTR.inverse);
    g.version++;
  }

  /** The way back to the desk, for a visitor without a keyboard. */
  private controls(m: Machine): OverlayButton[] {
    const label = { en: 'Desk', zh: '桌面' }, width = 640 / m.scale;
    const w = 14 + GLYPH.close.w + strWidth(m.t(label)) * 8;
    return [{ id: 'desk', rect: { x: width - w - 2, y: 1, w, h: 16 }, glyph: GLYPH.close, label }];
  }

  overlay(m: Machine, g: Gfx): void { drawButtons(g, m, this.controls(m), this.buttons.hover, this.buttons.down); }

  pointer(m: Machine, p: Pointer): void {
    this.buttons.pointer(m, p, this.controls(m), () => { this.toLive(m); m.pop(); });
  }

  private toLive(m: Machine): void {
    if (!this.offset || !this.live) { this.offset = 0; return; }
    restore(m.grid, this.live);
    this.offset = 0; this.live = null;
  }

  /** What is on the screen goes into the scrollback before the screen is cleared. */
  private keep(m: Machine): void {
    const g = m.grid;
    for (let y = 0; y <= Math.min(g.cursor.y, g.rows - 1); y++) this.back.push({ codes: g.codes.slice(y * g.cols, (y + 1) * g.cols), attrs: g.attrs.slice(y * g.cols, (y + 1) * g.cols) });
  }

  private prompt(m: Machine): void {
    this.waiting = true;
    this.tty!.call(() => { this.tty!.write(m.fs.prompt); this.waiting = false; });
  }

  key(m: Machine, { key, ctrl }: Key): void {
    const tty = this.tty!;
    if (key === 'PageUp' || key === 'PageDown') { this.scroll(m, (key === 'PageUp' ? -1 : 1) * (m.rows - 1)); return; }
    // Any other key returns to the live screen first; ESC does only that.
    if (this.offset) { this.toLive(m); if (key === 'Escape') return; }
    if (tty.busy || this.waiting) { if (key === 'Escape' || (ctrl && key.toLowerCase() === 'c')) tty.skip(() => m.top === this); return; }
    if (ctrl && key.toLowerCase() === 'c') { tty.write('^C\n'); this.typed = ''; tty.write(m.fs.prompt); return; }
    if (ctrl) return;
    if (key === 'Enter') {
      const command = this.typed;
      tty.write('\n');
      this.typed = ''; this.recall = -1;
      if (command.trim()) this.history.unshift(command);
      this.run(m, command);
      return;
    }
    if (key === 'Escape') {
      // ESC always leads back: first it clears the line, then it returns to the board.
      if (!this.typed) { tty.write('\n'); this.prompt(m); m.pop(); return; }
      this.erase(); return;
    }
    if (key === 'Backspace') {
      const chars = Array.from(this.typed), last = chars.pop();
      if (last) { this.typed = chars.join(''); tty.write('\b'.repeat(charWidth(last))); }
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const next = Math.max(-1, Math.min(this.history.length - 1, this.recall + (key === 'ArrowUp' ? 1 : -1)));
      if (next === this.recall) return;
      this.recall = next;
      this.replaceLine(next < 0 ? '' : this.history[next]);
      return;
    }
    if (key === 'Tab') { this.complete(m); return; }
    if (Array.from(key).length === 1 && strWidth(this.typed + key) <= MAX_LINE) { this.typed += key; tty.write(key); }
  }

  private erase(): void {
    this.tty!.write('\b'.repeat(strWidth(this.typed)));
    this.typed = '';
  }

  private replaceLine(next: string): void {
    this.erase();
    this.typed = next;
    this.tty!.write(next);
  }

  private complete(m: Machine): void {
    const cut = this.typed.lastIndexOf(' ');
    const head = this.typed.slice(0, cut + 1), word = this.typed.slice(cut + 1);
    const options = m.fs.complete(word);
    if (options.length === 1) this.replaceLine(head + options[0]);
    else if (options.length > 1) {
      let common = options[0];
      for (const o of options) while (!o.startsWith(common)) common = common.slice(0, -1);
      if (common.length > word.length) this.replaceLine(head + common);
      else { this.tty!.write('\n' + options.join('  ') + '\n' + m.fs.prompt + this.typed); }
    }
  }

  private print(text = '', attr = 0): void { this.tty!.print(text, attr); }
  private say(m: Machine, text: Text, attr = 0): void { this.print(m.t(text), attr); }

  private run(m: Machine, input: string): void {
    const [raw = '', ...args] = input.trim().split(/\s+/);
    const name = raw.toLowerCase();
    const fs = m.fs;
    const here = () => fs.resolve('.')!.node as DirNode;
    if (!name) { this.prompt(m); return; }
    if (this.extra[name]?.(m, args)) { this.prompt(m); return; }
    switch (name) {
      case 'help': case '?':
        m.t(SAY.help).split('\n').forEach(l => this.print(l));
        this.print();
        break;
      case 'dir': case 'ls': this.dir(m, args[0] ?? '.'); break;
      case 'cd': case 'chdir': {
        if (!args[0]) { this.print('C:\\' + fs.cwd.join('\\')); break; }
        if (!fs.cd(args[0])) this.say(m, SAY.invalidDir);
        break;
      }
      case 'cd..': fs.cd('..'); break;
      case 'type': case 'cat': case 'more': {
        const found = args[0] ? fs.resolve(args[0]) : null;
        if (!found) { this.say(m, args[0] ? SAY.notFound : SAY.missing); break; }
        if (found.node.kind === 'dir') { this.say(m, SAY.denied); break; }
        this.typeFile(m, found.node, found.parts, name === 'more');
        return;
      }
      case 'undelete': this.undelete(m, here(), args[0]); break;
      case 'cls': case 'clear': this.tty!.call(() => { this.keep(m); clearGrid(m.grid); }); break;
      case 'ver': this.say(m, SAY.banner); this.print(); break;
      case 'desk': case 'bbs': case 'menu': this.tty!.call(() => m.pop()); this.prompt(m); return;
      case 'exit': case 'logoff': case 'quit': this.tty!.call(() => m.exit()); return;
      default: {
        const program = this.findProgram(m, raw);
        if (program) {
          const result = program(m, args);
          if (result && typeof result === 'object' && 'show' in result) { this.tty!.call(() => m.push(result)); this.prompt(m); return; }
          if (result) m.t(result).split('\n').forEach(l => this.print(l));
          break;
        }
        this.say(m, SAY.bad);
      }
    }
    this.prompt(m);
  }

  private findProgram(m: Machine, raw: string): ProgramTable[string] | null {
    if (this.programs[raw.toLowerCase()]) return this.programs[raw.toLowerCase()];
    const found = m.fs.resolve(raw) ?? m.fs.resolve(raw + '.EXE');
    if (found?.node.kind !== 'file') return null;
    if (found.node.program) return this.programs[found.node.program] ?? null;
    // A picture opens in the picture viewer, as a file association would.
    const view = this.programs.picview;
    if (found.node.photo && view) return mm => view(mm, [raw]);
    return null;
  }

  private dir(m: Machine, path: string): void {
    m.audio.sfx('disk', '0.12');
    const found = m.fs.resolve(path);
    if (!found) { this.say(m, SAY.notFound); return; }
    if (found.node.kind === 'file') { this.print(entry(found.node, m.narrow)); return; }
    const entries = m.fs.list(found.node);
    const where = `C:\\${found.parts.join('\\')}`;
    this.say(m, { en: ` Directory of ${where}`, zh: ` ${where} 的目录` }, ATTR.dim);
    this.print();
    for (const node of entries) this.print(entry(node, m.narrow));
    const files = entries.filter(e => e.kind === 'file');
    const count = String(files.length).padStart(9), bytes = String(files.reduce((s, f) => s + sizeOf(f), 0)).padStart(9);
    this.say(m, { en: `${count} file(s) ${bytes} bytes`, zh: `${count} 个文件 ${bytes} 字节` }, ATTR.dim);
    this.print();
  }

  /** TYPE prints; MORE (or TYPE of a long file) opens the pager, where N and P read on through the directory. */
  private typeFile(m: Machine, node: FileNode, parts: string[], paged = false): void {
    if (node.program) { this.say(m, SAY.program); this.prompt(m); return; }
    if (node.photo || node.drawing) {
      // A picture typed as text: what DOS always showed, the header bytes.
      this.print('\u00a0\u00a0\u00a0\u00b1\u2248\u2593\u00c7\u00fc\u2310\u00a0\u00ab\u00a0\u2663\u2640\u266a\u00a0PCX\u00a0\u2552\u2310\u2591\u2591\u2592', ATTR.dim);
      this.say(m, SAY.picture); this.print(); this.prompt(m); return;
    }
    m.mark(fileFlag(parts));
    m.audio.sfx('disk', '0.2');
    const source = readText(m, node);
    const lines = wrap(source, m.cols - 1);
    if (!paged && lines.length <= body(m.grid).height) { lines.forEach(l => this.print(l)); this.print(); this.prompt(m); return; }
    this.tty!.call(() => m.push(this.pager(m, node, parts)));
    this.prompt(m);
  }

  private pager(m: Machine, node: FileNode, parts: string[]): App {
    const dirParts = parts.slice(0, -1);
    const folder = m.fs.resolve('/' + dirParts.join('/'));
    const texts = folder?.node.kind === 'dir'
      ? m.fs.list(folder.node).filter((n): n is FileNode => n.kind === 'file' && !n.program && !n.photo && n.text !== undefined)
      : [node];
    const at = texts.indexOf(node);
    const open = (to: number) => (mm: Machine) => {
      const next = texts[to];
      if (!next) return;
      const where = [...dirParts, next.name];
      mm.mark(fileFlag(where));
      mm.audio.sfx('disk', '0.15');
      mm.replace(this.pager(mm, next, where));
    };
    const actions = texts.length > 1 ? [
      { hotkey: 'N', label: { en: 'next file', zh: '下一篇' }, run: open(at + 1) },
      { hotkey: 'P', label: { en: 'prev file', zh: '上一篇' }, run: open(at - 1) },
    ] : [];
    return new PagerApp(node.name, readText(m, node), actions, node.date);
  }

  private undelete(m: Machine, here: DirNode, name?: string): void {
    const gone = m.fs.deleted(here);
    if (!name) {
      if (!gone.length) { this.say(m, SAY.noDeleted); this.print(); return; }
      this.say(m, SAY.deletedHere);
      gone.forEach(f => this.print(`    ${deletedName(f.name).padEnd(13)}${String(sizeOf(f)).padStart(8)}  ${f.date}`));
      this.print();
      this.say(m, SAY.howTo, ATTR.dim);
      this.say(m, SAY.lostLetter, ATTR.dim);
      this.print();
      return;
    }
    m.audio.sfx('disk', '0.6');
    const restored = m.fs.undelete(here, name);
    if (restored) {
      m.mark('undeleted:' + [...m.fs.cwd, restored.name].join('/'));
      this.say(m, { en: `File successfully undeleted: ${restored.name}`, zh: `文件已恢复：${restored.name}` });
    } else this.say(m, SAY.noMatch);
    this.print();
  }
}

function entry(node: DirNode | FileNode, narrow: boolean): string {
  const [base, ext = ''] = node.name.split('.');
  const name = base.padEnd(9) + ext.padEnd(4);
  const size = node.kind === 'dir' ? '<DIR>'.padEnd(10) : String(sizeOf(node)).padStart(10);
  return narrow ? `${name}${size}` : `${name}${size}  ${node.date}`;
}
