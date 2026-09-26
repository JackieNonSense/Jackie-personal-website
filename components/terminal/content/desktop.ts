import { ABOUT, WORKS } from './board';
import { CHANNELS } from './channels';
import { lastCallers } from './callers';
import { FALL_SCORES } from './disk';
import { logOff } from './ending';
import { DESK_ICONS } from './icons';
import { MARK_ICON } from './mark';
import { openBrowser } from './browser';
import { messages, post, readFlag, type Message } from './messages';
import { PHOTOS } from './photos';
import { PROGRAMS, lighthouse, pictureViewer, shell } from './bbs';
import { hhmm, isoDate, machineNow } from './time';
import { deletedName, fileFlag, readText, sizeOf, type DirNode, type FileNode } from '../system/fs';
import { Desktop, type DeskIcon } from '../system/gui/desktop';
import { Box, Widget, type DrawState, type GuiEvent, type GuiHost, type MenuItem, type WindowSpec } from '../system/gui/widget';
import {
  Button, ButtonRow, Checkbox, Deck, InputField, Knob, LINE, Label, ListView, PictureView, Radio, Spacer, Split, TextView, ThumbGrid, Toolbar, well,
} from '../system/gui/widgets';
import { SMALL_ICONS } from '../system/gui/icons';
import { contains, type Rect } from '../system/gui/geometry';
import type { Gfx } from '../system/gui/gfx';
import { THEMES, BUTTONS } from '../crt/themes';
import { Tuner, TvApp } from '../system/apps/tv';
import { OffscreenDisplay } from '../system/display';
import { SaverApp } from '../system/apps/saver';
import { loadDrawing, paintWindow } from './paint';
import { CANVAS } from '../graphics/paint';
import type { App, Key, Machine } from '../system/machine';
import type { Lang, Text } from '../system/i18n';

/*
 * JR-DESK as Jackie set it up: the icons, the windows and what is in them. The
 * toolkit is system/gui; this is only the content.
 */

// ── Dialogs ────────────────────────────────────────────────────────────────────

/** A dialog's inside: what it says, and its buttons along the bottom. */
class DialogBody extends Widget {
  constructor(readonly body: Widget, readonly buttons: ButtonRow) {
    super();
    this.add(body); this.add(buttons);
  }

  protected arrange(): void {
    const r = this.r;
    this.body.place({ x: r.x + 12, y: r.y + 10, w: r.w - 24, h: r.h - 52 });
    this.buttons.place({ x: r.x + 12, y: r.y + r.h - 38, w: r.w - 24, h: 30 });
  }
}

let dialogs = 0;

/** A dialog's button: `run` returning false keeps the dialog open (a wrong answer, an empty field). */
type Choice = { label: Text; run?: (host: GuiHost) => boolean | void; isDefault?: boolean };

/** A small window that waits for an answer; everything else waits with it. */
function dialog(host: GuiHost, title: Text, body: Widget, buttons: Choice[], size: { w: number; h: number }): string {
  const id = `dialog-${++dialogs}`;
  const row = new ButtonRow('right');
  for (const b of buttons) row.add(new Button(b.label, h => { if (b.run?.(h) !== false) h.close(id); }, { isDefault: b.isDefault }));
  host.open({ id, title, modal: true, place: 'centre', size, content: () => new DialogBody(body, row) });
  return id;
}

export function messageBox(host: GuiHost, title: Text, text: Text, buttons?: Choice[]): string {
  const lines = Math.min(12, host.m.t(text).split('\n').length + Math.ceil(host.m.t(text).length / 40));
  return dialog(host, title, new Label(text), buttons ?? [{ label: 'OK', isDefault: true }], { w: 360, h: Math.max(120, 70 + lines * LINE) });
}

// ── A list with what the selected entry says beside it ─────────────────────────

type Entry = { label: Text; note?: string; text(m: Machine): Text; action?: { label: Text; run(host: GuiHost): void } };

function listWindow(id: string, title: Text, entries: (m: Machine) => Entry[], size: { w: number; h: number }, first = 176): WindowSpec {
  return {
    id, title, size, resizable: true,
    content: host => {
      const text = new TextView(m => { const e = list.item; return e ? m.t(e.text(m)) : ''; });
      const act = new Button(m => { const e = list.item; return e?.action ? m.t(e.action.label) : ''; }, host => list.item?.action?.run(host), { isDefault: true });
      const row = new ButtonRow('right');
      row.add(act);
      const list: ListView<Entry> = new ListView<Entry>({
        items: entries,
        // A second column only where some entry has a note (a year, a version).
        columns: entries(host.m).some(e => e.note)
          ? [{ width: 'fill', text: (e, m) => m.t(e.label) }, { width: 44, align: 'right', text: e => e.note ?? '' }]
          : [{ width: 'fill', text: (e, m) => m.t(e.label) }],
        onSelect: (_e, _i, _h, tapped) => {
          text.set(text.text); act.visible = Boolean(list.item?.action); row.place(row.r);
          if (tapped) split.showSecond();
        },
        onOpen: (e, _i, host) => e.action?.run(host),
      });
      list.selected = 0;
      act.visible = Boolean(entries(host.m)[0]?.action);
      const right = new Box('column', ['fill', 34], 0);
      right.add(text); right.add(row);
      const split = new Split(list, right, { direction: 'row', first });
      return split;
    },
  };
}

// ── Messages ───────────────────────────────────────────────────────────────────

type Numbered = Message & { n: number };
const numbered = (m: Machine): Numbered[] => messages(m).map((msg, i) => ({ ...msg, n: i + 1 }));

function compose(host: GuiHost, list: ListView<Numbered>): void {
  const subject = new InputField({ max: 40 }), text = new InputField({ max: 400 });
  const form = new Box('column', [LINE, 24, 8, LINE, 24], 2);
  form.add(new Label({ en: 'Subject', zh: '标题' })); form.add(subject);
  form.add(new Spacer());
  form.add(new Label({ en: 'Message', zh: '内容' })); form.add(text);
  const send = (h: GuiHost) => {
    if (!subject.value.trim() || !text.value.trim()) { h.beep(); return false; }
    post(h.m, subject.value.trim(), text.value.trim());
    h.m.audio.sfx('disk', '0.4');
    list.refresh();
    list.select(list.items.length - 1);
    return true;
  };
  dialog(host, { en: 'New message  ·  from JACKIE', zh: '发新帖  ·  作者 JACKIE' }, form, [
    { label: { en: 'Send', zh: '发送' }, isDefault: true, run: send },
    { label: { en: 'Cancel', zh: '取消' } },
  ], { w: 420, h: 200 });
  host.focus(subject);
}

const BOARD: WindowSpec = {
  id: 'board', title: { en: 'Messages', zh: '留言板' }, size: { w: 460, h: 330 }, place: { x: 160, y: 30 }, resizable: true,
  content: host => {
    const body = new TextView(m => {
      const msg = list.item;
      if (!msg) return '';
      return m.t({
        en: `From: ${msg.from}\nDate: ${msg.date} ${msg.time}\nSubj: ${m.t(msg.subject)}\n${'─'.repeat(24)}\n`,
        zh: `作者：${msg.from}\n时间：${msg.date} ${msg.time}\n标题：${m.t(msg.subject)}\n${'─'.repeat(24)}\n`,
      }) + m.t(msg.body);
    });
    const small = host.m.scale === 2;
    const list: ListView<Numbered> = new ListView<Numbered>({
      items: numbered,
      header: true,
      columns: [
        { title: '#', width: 30, align: 'right', text: msg => String(msg.n) },
        ...(small ? [] : [
          { title: { en: 'Date', zh: '日期' }, width: 92, text: (msg: Numbered) => msg.date },
          { title: { en: 'From', zh: '作者' }, width: 96, text: (msg: Numbered) => msg.from },
        ]),
        { title: { en: 'Subject', zh: '标题' }, width: 'fill', text: (msg, m) => m.t(msg.subject) },
      ],
      // What has not been read stands out.
      style: (msg, m) => (m.has(readFlag(msg)) ? 'normal' : 'bold'),
      onSelect: (msg, _i, h, tapped) => { body.set(body.text); h.m.mark(readFlag(msg)); if (tapped) split.showSecond(); },
    });
    list.id = 'board-list';
    // Opens on the newest message.
    list.items = numbered(host.m);
    list.selected = list.items.length - 1;
    list.top = Math.max(0, list.items.length - 6);
    host.m.mark(readFlag(list.items[list.selected]));
    const bar = new Toolbar();
    bar.add(new Button({ en: 'New', zh: '发帖' }, h => compose(h, list)));
    bar.add(new Button({ en: '◄ Previous', zh: '◄ 上一篇' }, () => list.select(list.selected - 1)));
    bar.add(new Button({ en: 'Next ►', zh: '下一篇 ►' }, () => list.select(list.selected + 1)));
    const box = new Box('column', [28, 'fill']);
    box.add(bar);
    const split = new Split(list, body, { direction: 'column', first: 130 });
    box.add(split);
    return box;
  },
};

// ── Files ──────────────────────────────────────────────────────────────────────

type Row =
  | { kind: 'up' }
  | { kind: 'dir'; node: DirNode }
  | { kind: 'file'; node: FileNode; deleted: boolean };

/** How long a text file sits in the preview before it counts as read. */
const DWELL = 2;
const dosName = (name: string) => { const [b, e = ''] = name.split('.'); return `${b.padEnd(8)} ${e}`; };

function takenOf(node: FileNode): string {
  const taken = PHOTOS[node.photo!]?.taken ?? '';
  if (taken !== 'now') return taken;
  const now = machineNow();
  return `${isoDate(now)} ${hhmm(now)}`;
}

/** The disk, shared by the Files window, the diary icon and the reader. */
const disk = { path: [] as string[], showDeleted: false };
let filesList: ListView<Row> | null = null;

function rowsOf(m: Machine): Row[] {
  const dir = m.fs.resolve('/' + disk.path.join('/'))?.node as DirNode | undefined;
  if (!dir) return [];
  return [
    ...(disk.path.length ? [{ kind: 'up' } as Row] : []),
    ...m.fs.list(dir).map((n): Row => (n.kind === 'dir' ? { kind: 'dir', node: n } : { kind: 'file', node: n, deleted: false })),
    ...(disk.showDeleted ? m.fs.deleted(dir).map((n): Row => ({ kind: 'file', node: n, deleted: true })) : []),
  ];
}

function go(host: GuiHost, path: string[]): void {
  disk.path = path;
  host.m.fs.cwd = [...path];
  if (filesList) { filesList.selected = 0; filesList.top = 0; }
  host.m.audio.sfx('disk', '0.12');
  host.invalidate();
}

/** A button for each character a name can start with: undelete by pointing. */
class LetterPicker extends Widget {
  static readonly LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  hoverable = true;
  cursor = 'hand' as const;
  constructor(private readonly pick: (ch: string, host: GuiHost) => void) { super(); }

  private cell(i: number): Rect {
    const across = 12, w = Math.floor(this.r.w / across);
    return { x: this.r.x + (i % across) * w, y: this.r.y + Math.floor(i / across) * 20, w: w - 2, h: 18 };
  }

  protected draw(g: Gfx): void {
    [...LetterPicker.LETTERS].forEach((ch, i) => {
      const c = this.cell(i);
      g.fill(c, 'face'); g.rect(c, 'frame'); g.bevel({ x: c.x + 1, y: c.y + 1, w: c.w - 2, h: c.h - 2 }, 'raised');
      g.text(c.x + Math.floor((c.w - 8) / 2), c.y + 1, ch, 'faceText');
    });
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'click') {
      const i = [...LetterPicker.LETTERS].findIndex((_, k) => contains(this.cell(k), e.x, e.y));
      if (i >= 0) this.pick(LetterPicker.LETTERS[i], this.host!);
    }
    return true;
  }
}

function undelete(host: GuiHost, node: FileNode): void {
  const field = new InputField({ max: 1, upper: true, onEnter: (value, h) => { if (tryLetter(h, value)) h.close(id); } });
  const tryLetter = (h: GuiHost, letter: string): boolean => {
    const dir = h.m.fs.resolve('/' + disk.path.join('/'))?.node as DirNode | undefined;
    if (!dir || !letter) { h.beep(); return false; }
    h.m.audio.sfx('disk', '0.6');
    const restored = h.m.fs.undelete(dir, letter.toUpperCase() + node.name.slice(1));
    if (!restored) {
      // A wrong guess: the scorer counts it, as it counts every second thought.
      h.m.hesitate();
      h.beep();
      field.set('');
      return false;
    }
    h.m.mark('undeleted:' + [...disk.path, restored.name].join('/'));
    h.m.announce(h.m.t({ en: `File successfully undeleted: ${restored.name}`, zh: `文件已恢复：${restored.name}` }));
    const at = rowsOf(h.m).findIndex(r => r.kind === 'file' && r.node === restored);
    if (at >= 0) filesList?.select(at);
    return true;
  };
  const small = host.m.scale === 2;
  const body = new Box('column', small ? [LINE * 3, 64] : [LINE * 3, 6, 26, 6, 84], 0);
  body.add(new Label(small
    ? { en: `${deletedName(node.name)}: its first letter was lost. Give it back.`, zh: `${deletedName(node.name)}：文件名的第一个字母丢了。把它还回去。` }
    : { en: `${deletedName(node.name)} was deleted. DOS forgot the first letter of its name: give it back and the file returns.`, zh: `${deletedName(node.name)} 已被删除。DOS 忘记了它名字的第一个字母：把字母还给它，文件就回来了。` }));
  if (!small) {
    body.add(new Spacer());
    const line = new Toolbar(6, 0);
    line.add(new Label({ en: 'First letter:', zh: '首字母：' }));
    line.add(new FieldBox(field, 34));
    line.add(new Label(`${deletedName(node.name).slice(1)}`));
    body.add(line);
    body.add(new Spacer());
  }
  const picker = body.add(new LetterPicker((ch, h) => { field.set(ch); if (tryLetter(h, ch)) h.close(id); }));
  picker.id = 'letters';
  // The dialog stays until a letter works.
  const id = dialog(host, 'UNDELETE', body, [
    { label: { en: 'Undelete', zh: '恢复' }, isDefault: true, run: h => tryLetter(h, field.value) },
    { label: { en: 'Cancel', zh: '取消' } },
  ], { w: 420, h: 270 });
  if (!small) host.focus(field);
}

/** A field at a fixed width, for toolbars. */
class FieldBox extends Widget {
  constructor(readonly field: InputField, private readonly w: number) { super(); this.add(field); }
  width(): number { return this.w; }
  protected arrange(): void { this.field.place({ x: this.r.x, y: this.r.y - 3, w: this.r.w, h: 22 }); }
}

function openRow(host: GuiHost, row: Row): void {
  const m = host.m;
  if (row.kind === 'up') { go(host, disk.path.slice(0, -1)); return; }
  if (row.kind === 'dir') { go(host, [...disk.path, row.node.name]); return; }
  const node = row.node;
  if (row.deleted) { undelete(host, node); return; }
  if (node.photo) {
    const app = pictureViewer(m, '/' + [...disk.path, node.name].join('/'));
    if ('show' in app) host.run(app);
    return;
  }
  if (node.drawing) { openPaint(host, node.drawing); return; }
  if (node.program) {
    const result = PROGRAMS[node.program]?.(m, []);
    if (result && typeof result === 'object' && 'show' in result) { host.run(result as App); return; }
    host.beep();
    messageBox(host, node.name, result ?? { en: 'Cannot run this.', zh: '无法运行。' });
    return;
  }
  if (node.text !== undefined) readFile(host, node);
}

/** The reader: one text file, with the ones beside it a click away. */
let reading: { node: FileNode; path: string[] } | null = null;
let readerText: TextView | null = null;

function readFile(host: GuiHost, node: FileNode): void {
  reading = { node, path: [...disk.path] };
  host.m.mark(fileFlag([...disk.path, node.name]));
  host.m.audio.sfx('disk', '0.15');
  readerText?.set(readerText.text);
  host.open(READER);
}

function stepReader(host: GuiHost, step: number): void {
  if (!reading) return;
  const dir = host.m.fs.resolve('/' + reading.path.join('/'))?.node as DirNode | undefined;
  if (!dir) return;
  const texts = host.m.fs.list(dir).filter((n): n is FileNode => n.kind === 'file' && n.text !== undefined && !n.program && !n.photo);
  const next = texts[texts.indexOf(reading.node) + step];
  if (!next) { host.beep(); return; }
  reading = { node: next, path: reading.path };
  host.m.mark(fileFlag([...reading.path, next.name]));
  host.m.audio.sfx('disk', '0.12');
  readerText?.set(readerText.text);
  const at = rowsOf(host.m).findIndex(r => r.kind === 'file' && r.node === next);
  if (at >= 0 && filesList && disk.path.join('/') === reading.path.join('/')) filesList.select(at);
}

const READER: WindowSpec = {
  id: 'reader', size: { w: 470, h: 330 }, place: { x: 150, y: 30 }, resizable: true,
  title: m => (reading ? `${reading.node.name}  ·  ${reading.node.date}` : m.t({ en: 'Reader', zh: '阅读' })),
  content: () => {
    readerText = new TextView(m => (reading ? readText(m, reading.node) : ''));
    const bar = new Toolbar();
    bar.add(new Button({ en: '◄ Previous', zh: '◄ 上一篇' }, h => stepReader(h, -1)));
    bar.add(new Button({ en: 'Next ►', zh: '下一篇 ►' }, h => stepReader(h, 1)));
    const box = new Box('column', [28, 'fill']);
    box.add(bar); box.add(readerText);
    return box;
  },
};

function describeRow(r: Row | undefined, m: Machine): string {
  if (!r) return '';
  if (r.kind === 'up') return m.t({ en: 'Up one directory.', zh: '返回上一层目录。' });
  if (r.kind === 'dir') {
    const names = m.fs.list(r.node).map(n => (n.kind === 'dir' ? `${n.name}\\` : n.name));
    return m.t({ en: `DIRECTORY  C:\\${[...disk.path, r.node.name].join('\\')}\n\n`, zh: `目录  C:\\${[...disk.path, r.node.name].join('\\')}\n\n` }) + names.join('\n');
  }
  const node = r.node;
  if (r.deleted) return m.t({
    en: `${deletedName(node.name)}   ${sizeOf(node)} bytes   deleted\n\nThe first letter of its name was lost when it was deleted. Give it back and the file returns.`,
    zh: `${deletedName(node.name)}   ${sizeOf(node)} 字节   已删除\n\n删除时，它名字的第一个字母丢失了。把字母还给它，文件就回来了。`,
  });
  if (node.program) return m.t({ en: `${node.name}   ${sizeOf(node)} bytes\n\nA program.`, zh: `${node.name}   ${sizeOf(node)} 字节\n\n程序文件。` });
  if (node.drawing) return m.t({ en: `${node.name}   ${node.date}\n\nA drawing, made here.`, zh: `${node.name}   ${node.date}\n\n一幅画，在这台机器上画的。` });
  if (node.text !== undefined) return readText(m, node);
  return m.t({ en: `${node.name}   ${sizeOf(node)} bytes\n\n(binary)`, zh: `${node.name}   ${sizeOf(node)} 字节\n\n（二进制文件）` });
}

/** The Files window's right side: the text, the picture, or what can be done with the file. */
class Preview extends Widget {
  private dwell = 0;
  private shown: Row | undefined;
  readonly text = new TextView(m => describeRow(filesList?.item, m));
  readonly picture = new PictureView();
  readonly drawing = new DrawingView();
  private readonly deck = new Deck();
  private readonly action = new Button('', h => { const r = filesList?.item; if (r) openRow(h, r); }, { isDefault: true });
  private readonly caption = new Label(() => this.captionOf(), { colour: 'faceText' });

  constructor() {
    super();
    this.deck.add(this.text); this.deck.add(this.picture); this.deck.add(this.drawing);
    this.add(this.deck); this.add(this.caption); this.add(this.action);
  }

  private captionOf(): string {
    const r = filesList?.item;
    if (r?.kind !== 'file' || r.deleted || !r.node.photo) return '';
    return `${r.node.name}   ${takenOf(r.node)}`;
  }

  private actionOf(r: Row | undefined): Text | null {
    if (!r || r.kind === 'up') return null;
    if (r.kind === 'dir') return { en: 'Open', zh: '打开' };
    if (r.deleted) return { en: 'Undelete...', zh: '恢复……' };
    if (r.node.photo) return { en: 'View', zh: '查看' };
    if (r.node.drawing) return { en: 'Open in Paint', zh: '用画图打开' };
    if (r.node.program) return { en: 'Run', zh: '运行' };
    return r.node.text !== undefined ? { en: 'Read', zh: '阅读' } : null;
  }

  protected arrange(): void {
    const r = this.r;
    this.deck.place({ x: r.x, y: r.y, w: r.w, h: r.h - 34 });
    this.caption.place({ x: r.x + 4, y: r.y + r.h - 28, w: r.w - 110, h: LINE });
    this.action.place({ x: r.x + r.w - 100, y: r.y + r.h - 30, w: 100, h: 24 });
  }

  /** Follows the selection: the right view, and the right button. */
  update(): void {
    const r = filesList?.item;
    // Rows are made afresh on every look at the disk: compare what they are, not which object.
    const same = r?.kind === this.shown?.kind && (r?.kind !== 'file' && r?.kind !== 'dir' ? true : r.node === (this.shown as typeof r).node)
      && (r?.kind !== 'file' || r.deleted === (this.shown as typeof r).deleted);
    if (!same) {
      this.shown = r;
      this.dwell = 0;
      const photo = r?.kind === 'file' && !r.deleted && r.node.photo ? PHOTOS[r.node.photo]?.url ?? null : null;
      const drawn = r?.kind === 'file' && !r.deleted && r.node.drawing ? r.node.drawing : null;
      this.deck.show(photo ? this.picture : drawn ? this.drawing : this.text);
      if (photo) this.picture.show(photo);
      else if (drawn) this.drawing.show(drawn);
      else this.text.set(this.text.text);
    }
    const label = this.actionOf(r);
    this.action.visible = Boolean(label);
    if (label) this.action.label = label;
  }

  tick(dt: number): void {
    super.tick(dt);
    const m = this.host?.m, r = filesList?.item;
    if (!m) return;
    this.update();
    // Sitting in the preview long enough counts as having read it.
    if (r?.kind === 'file' && !r.deleted && r.node.text !== undefined && !m.has(fileFlag([...disk.path, r.node.name]))) {
      this.dwell += dt;
      if (this.dwell >= DWELL) { m.mark(fileFlag([...disk.path, r.node.name])); this.invalidate(); }
    }
  }
}

const FILES: WindowSpec = {
  id: 'files', size: { w: 476, h: 340 }, place: { x: 156, y: 26 }, resizable: true,
  title: m => `${m.t({ en: 'Files', zh: '文件' })}  C:\\${disk.path.join('\\')}`,
  content: () => {
    const preview = new Preview();
    const list: ListView<Row> = new ListView<Row>({
      items: rowsOf,
      columns: [
        { width: 104, text: r => (r.kind === 'up' ? '..' : r.kind === 'dir' ? r.node.name : dosName(r.deleted ? deletedName(r.node.name) : r.node.name)) },
        { width: 56, align: 'right', text: r => (r.kind === 'up' ? '' : r.kind === 'dir' ? '<DIR>' : String(sizeOf(r.node))) },
      ],
      icon: r => SMALL_ICONS[r.kind === 'up' || r.kind === 'dir' ? 'folder' : r.deleted ? 'gone' : r.node.photo ? 'picture' : r.node.drawing ? 'drawing' : r.node.program ? 'program' : 'text'],
      // Deleted files are dim; text not yet read stands out.
      style: (r, m) => (r.kind === 'file' ? (r.deleted ? 'dim' : r.node.text !== undefined && !m.has(fileFlag([...disk.path, r.node.name])) ? 'bold' : 'normal') : 'normal'),
      onSelect: (r, _i, h, tapped) => {
        preview.update();
        if (!tapped || !split.stacked) return;
        if (r.kind === 'file') split.showSecond(); else openRow(h, r);
      },
      onOpen: (r, _i, h) => openRow(h, r),
    });
    filesList = list;
    list.selected = 0;
    list.id = 'file-list';
    const bar = new Toolbar();
    bar.add(new Button({ en: '↑ Up', zh: '↑ 上一级' }, h => { if (disk.path.length) go(h, disk.path.slice(0, -1)); else h.beep(); }, { enabled: () => disk.path.length > 0 }));
    bar.add(new Spacer());
    const deleted = new Checkbox({ en: 'Show deleted', zh: '显示已删除' }, () => disk.showDeleted, (m, on, h) => {
      disk.showDeleted = on;
      m.announce(m.t(on ? { en: 'Showing deleted files', zh: '显示被删除的文件' } : { en: 'Hiding deleted files', zh: '隐藏被删除的文件' }));
      h.invalidate();
    });
    deleted.id = 'show-deleted';
    bar.add(deleted);
    const box = new Box('column', [28, 'fill']);
    box.add(bar);
    const split = new Split(list, preview, { direction: 'row', first: 214 });
    box.add(split);
    return box;
  },
};

/** The diary: the Files window, opened on C:\DIARY at the first entry not yet read. */
function openDiary(host: GuiHost): void {
  disk.path = ['DIARY'];
  host.m.fs.cwd = ['DIARY'];
  host.open(FILES);
  const rows = rowsOf(host.m);
  const first = rows.findIndex(r => r.kind === 'file' && !r.deleted && !host.m.has(fileFlag(['DIARY', r.node.name])));
  filesList?.refresh();
  filesList?.select(Math.max(0, first));
}

/** A drawing from C:\DRAFTS, shown whole. */
class DrawingView extends Widget {
  private name: string | null = null;
  private data: Uint8Array | null = null;

  show(name: string): void {
    if (name === this.name) return;
    this.name = name;
    this.data = loadDrawing(this.m, name);
    this.invalidate();
  }

  protected draw(g: Gfx): void {
    const r = well(g, this.r, 'shadow');
    if (!this.data) return;
    const k = Math.min(r.w / CANVAS.w, r.h / CANVAS.h), w = Math.floor(CANVAS.w * k), h = Math.floor(CANVAS.h * k);
    g.canvas(this.data, CANVAS.w, CANVAS.h, { x: r.x + Math.floor((r.w - w) / 2), y: r.y + Math.floor((r.h - h) / 2), w, h });
  }
}

// ── Paint ──────────────────────────────────────────────────────────────────────

const PAINT = paintWindow();

function openPaint(host: GuiHost, name?: string): void {
  if (name) {
    const data = loadDrawing(host.m, name);
    if (data) { PAINT.studio.doc.load(data); PAINT.studio.name = name; }
  }
  host.open(PAINT);
}

// ── Photos ─────────────────────────────────────────────────────────────────────

const photoFiles = (m: Machine): FileNode[] => {
  const dir = m.fs.resolve('/PHOTOS')?.node;
  return dir?.kind === 'dir' ? m.fs.list(dir).filter((n): n is FileNode => n.kind === 'file' && Boolean(n.photo)) : [];
};

const GALLERY: WindowSpec = {
  id: 'photos', title: { en: 'Photos  C:\\PHOTOS', zh: '相册  C:\\PHOTOS' }, size: { w: 440, h: 320 }, place: { x: 170, y: 40 }, resizable: true,
  content: () => new ThumbGrid<FileNode>({
    items: photoFiles,
    url: f => PHOTOS[f.photo!].url,
    caption: f => f.name.replace(/\.PCX$/, ''),
    onOpen: (f, _i, host) => {
      const app = pictureViewer(host.m, `/PHOTOS/${f.name}`);
      if ('show' in app) host.run(app);
    },
  }),
};

// ── Library, games, system ─────────────────────────────────────────────────────

const LIBRARY = listWindow('library', { en: 'Library', zh: '书库' }, () => [
  {
    label: { en: 'LIGHTHOUSE', zh: '《灯塔》' }, note: '2030',
    text: () => ({
      en: 'LIGHTHOUSE\n\nA girl draws a lighthouse every night, and every morning there is one more on the coast.\n\nChapters one to six. No ending yet.',
      zh: '《灯塔》\n\n一个女孩每天晚上画一座灯塔，第二天早上，海边就多出一座。\n\n第一章到第六章。还没有结局。',
    }),
    action: { label: { en: 'Read', zh: '阅读' }, run: host => host.run(lighthouse()) },
  },
  ...WORKS.map((w): Entry => ({
    label: w.title, note: w.year,
    text: m => `${m.t(w.title)}\n\n${m.t(w.body)}`,
    action: w.url ? { label: { en: 'Open link', zh: '打开链接' }, run: host => host.m.openUrl(w.url!) } : undefined,
  })),
  { label: { en: 'About Jackie', zh: '关于 Jackie' }, text: () => ABOUT },
], { w: 460, h: 290 });

function scores(m: Machine): string {
  const best = m.store.get('best:fall', 0);
  const rows = [...FALL_SCORES, ...(best ? [{ name: m.t({ en: 'YOU', zh: '你' }), score: best, date: '' }] : [])].sort((a, b) => b.score - a.score);
  return `FALL  ${m.t({ en: 'HIGH SCORES', zh: '最高分' })}\n\n${rows.map((s, i) => `${String(i + 1).padStart(2)}. ${s.name.padEnd(6)} ${String(s.score).padStart(6)}   ${s.date}`).join('\n')}`;
}


const GAMES = listWindow('games', { en: 'Games', zh: '游戏' }, () => [
  {
    label: 'FALL', note: '1.0',
    text: m => ({
      en: `FALL\n\nCatch what falls. The more you catch, the faster it falls. Miss three and it ends.\n\nIdea: MOTH. Code and pictures: JR.\n\nYour best: ${m.store.get('best:fall', 0)}`,
      zh: `FALL\n\n接住掉下来的东西。接得越多，掉得越快。漏掉三个就结束。\n\n点子：MOTH。代码和画：JR。\n\n你的最高分：${m.store.get('best:fall', 0)}`,
    }),
    action: { label: { en: 'Play', zh: '开始' }, run: host => host.run(PROGRAMS.fall(host.m, []) as App) },
  },
  {
    label: 'ORBIT', note: '0.3',
    text: m => ({
      en: `ORBIT\n\nFly the ship through the belt: five stages. Go through the rings, shoot the mines and the patrols, keep away from the rocks.\n\nThe mouse steers and fires.\n\nYour best: ${m.store.get('best:orbit', 0)}\n\n// there is still a bug after stage 5. later. -- JR`,
      zh: `ORBIT\n\n开着飞船穿过小行星带，一共五关。钻过光环，打掉水雷和巡逻机，躲开石头。\n\n鼠标控制方向和开火。\n\n你的最高分：${m.store.get('best:orbit', 0)}\n\n// 第五关之后还有个 bug。以后再说。-- JR`,
    }),
    action: { label: { en: 'Play', zh: '开始' }, run: host => host.run(PROGRAMS.orbit(host.m, []) as App) },
  },
  { label: { en: 'High scores', zh: '最高分' }, text: m => scores(m) },
], { w: 420, h: 260 });

function sysinfo(m: Machine): Text {
  const n = (v: number) => v.toLocaleString('en-US');
  const visits = m.store.get('visits', 1);
  return {
    en: `JR-DESK 3.0

BIOS      JR Modular BIOS v2.6
          (C) 1987-2030 N.O. Electronics
CPU       486DX2-66
MEMORY    640K base, 7424K extended
DISPLAY   640 x 400, ${m.t(m.theme.name)} tube
DISK      340 MB
MODEM     2400 baud, answers the phone
FONTS     VGA 8x16, HZK16 (GB2312)

THIS SESSION
Visits        ${n(visits)}
Keystrokes    ${n(m.keystrokes)}
Clicks        ${n(m.clicks)}
Hesitations   ${n(m.hesitations)}`,
    zh: `JR-DESK 3.0

BIOS      JR Modular BIOS v2.6
          (C) 1987-2030 N.O. Electronics
处理器    486DX2-66
内存      640K 基本内存，7424K 扩展内存
显示      640 x 400，显像管 ${m.t(m.theme.name)}
硬盘      340 MB
调制解调器 2400 波特，自动应答
字库      VGA 8x16，HZK16（GB2312）

本次会话
来访次数  ${n(visits)}
按键      ${n(m.keystrokes)}
点击      ${n(m.clicks)}
犹豫      ${n(m.hesitations)}`,
  };
}

function callersText(m: Machine): Text {
  const rows = lastCallers(m).map(c => `${c.date}  ${c.time}  ${c.user.padEnd(11)}${c.now ? (m.lang === 'zh' ? '← 本次' : '← now') : ''}`).join('\n');
  return { en: `LAST CALLERS\n\n${rows}`, zh: `最近来电\n\n${rows}` };
}

export const HELP: Text = {
  en: `JR-DESK

Click an icon to open it.

Windows move by their title bars. The box in the corner closes one; the one beside it makes it fill the screen. Drag the bottom right corner to make a window bigger.

In a list, click to look and double-click to open. The wheel scrolls.

The six buttons under the screen change the tube. The knob on the right switches the machine off.

The keys work too: the arrows, ENTER to open, ESC to close.

The JR mark at the top left has the rest: help, settings, the DOS prompt, and logging off.`,
  zh: `JR-DESK

点一下图标就能打开。

按住标题栏可以拖动窗口。角上的方框关闭窗口，旁边那个让它占满屏幕。拖动右下角可以把窗口拉大。

列表里单击查看，双击打开。滚轮可以滚动。

屏幕下面的六个按键可以换显像管。右边的圆钮是电源。

键盘也能用：方向键移动，回车打开，ESC 关闭。

左上角的 JR 标志里还有别的：帮助、设置、DOS 命令行和断线。`,
};

const HELP_WINDOW: WindowSpec = {
  id: 'help', title: { en: 'Help', zh: '帮助' }, size: { w: 420, h: 300 }, place: { x: 200, y: 50 }, resizable: true,
  content: () => new TextView(HELP),
};

class SettingsBody extends Widget {
  /** Under the tubes, and two lines long in a narrow column. */
  private readonly note: Label;

  constructor() {
    super();
    this.add(new Label({ en: 'Tube', zh: '显像管' }, { bold: true }));
    BUTTONS.forEach((id, i) => this.add(new Radio(m => `${i + 1} ${m.t(THEMES[id].name)}`, m => m.theme.id === id, m => m.setTheme(id))));
    this.note = this.add(new Label({ en: 'Or the buttons under the screen.', zh: '也可以按屏幕下面的按键。' }, { colour: 'faceDim' }));
    this.add(new Label({ en: 'Language', zh: '语言' }, { bold: true }));
    const lang = (label: string, l: Lang) => new Radio(label, m => m.lang === l, (m, host) => { void m.setLanguage(l).then(() => host.invalidate()); });
    this.add(lang('English', 'en'));
    this.add(lang('中文', 'zh'));
    this.add(new Label({ en: 'Sound', zh: '声音' }, { bold: true }));
    this.add(new Checkbox({ en: 'Sound on', zh: '打开声音' }, m => m.audio.enabled, (m, on) => { m.audio.setEnabled(on); m.store.set('sound', on); }));
    this.add(new Label({ en: 'Screen saver', zh: '屏幕保护' }, { bold: true }));
    const saver = (label: Text, kind: string) => new Radio(label, m => m.store.get('saver', 'lighthouse') === kind, m => m.store.set('saver', kind));
    this.add(saver({ en: 'Lighthouses', zh: '灯塔' }, 'lighthouse'));
    this.add(saver({ en: 'Seeds', zh: '种子' }, 'seeds'));
    this.add(saver({ en: 'Off', zh: '关闭' }, 'off'));
  }

  protected arrange(): void {
    // Too narrow for one column of everything: the tubes on the left (their names are
    // the longer ones, so they get more of the width), the rest on the right.
    const two = this.r.w < 400, split = two ? 8 : this.children.length, cut = Math.floor(this.r.w * 0.55);
    const step = this.r.h < 190 ? LINE + 1 : LINE + 3;
    let y = this.r.y + 6;
    this.children.forEach((c, i) => {
      if (i === split) y = this.r.y + 6;
      const heading = c instanceof Label, right = two && i >= split;
      const x = this.r.x + (right ? cut : 0), w = !two ? this.r.w : right ? this.r.w - cut : cut;
      const extra = c === this.note ? LINE : 0;
      c.place({ x: x + 10 + (heading ? 0 : 6), y, w: w - 20, h: LINE + 2 + extra });
      y += step + (heading ? 1 : 0) + extra;
    });
  }
}

const SETTINGS: WindowSpec = {
  id: 'settings', title: { en: 'Settings', zh: '设置' }, size: { w: 320, h: 214 }, place: 'centre',
  content: () => new SettingsBody(),
};

const SYSTEM = listWindow('system', { en: 'System', zh: '系统' }, () => [
  { label: { en: 'System info', zh: '系统信息' }, text: sysinfo },
  { label: { en: 'Last callers', zh: '最近来电' }, text: callersText },
  { label: { en: 'Settings', zh: '设置' }, text: () => ({ en: 'The tube, the language, the sound, the screen saver.', zh: '显像管、语言、声音、屏幕保护。' }), action: { label: { en: 'Settings...', zh: '设置……' }, run: host => host.open(SETTINGS) } },
  { label: { en: 'Help', zh: '帮助' }, text: () => HELP },
], { w: 470, h: 320 }, 140);

// ── The desk ───────────────────────────────────────────────────────────────────

function about(host: GuiHost): void {
  messageBox(host, { en: 'About JR-DESK', zh: '关于 JR-DESK' }, {
    en: 'JR-DESK 3.0\nfor JR\n\n(C) 1987-2030\nOne phone line, 2400 baud.',
    zh: 'JR-DESK 3.0\nJR 专用\n\n(C) 1987-2030\n一根电话线，2400 波特。',
  });
}

function quit(host: GuiHost): void {
  messageBox(host, { en: 'Log off', zh: '断线' }, { en: 'Close the session and switch off?', zh: '关闭会话并关机？' }, [
    { label: { en: 'Log off', zh: '断线' }, isDefault: true, run: h => logOff(h.m) },
    { label: { en: 'Cancel', zh: '取消' } },
  ]);
}

// ── Television ─────────────────────────────────────────────────────────────────

/** The set on the desk: its tuner, and the screen the channels draw on. */
type TvSet = { tuner: Tuner; display: OffscreenDisplay };
let tvSet: TvSet | null = null;

/** The picture, small: a double click (or ENTER) fills the machine's screen with it; the arrows and digits change channel. */
class TvScreen extends Widget {
  cursor = 'hand' as const;
  focusable = true;
  private readonly frame = new Uint8Array(640 * 400);
  private since = 0;
  constructor(private readonly set: TvSet) { super(); }

  tick(dt: number): void {
    super.tick(dt);
    const m = this.m;
    this.set.tuner.tick(this.set.display, m.audio, dt);
    // A small set's picture changes twenty times a second; the desk is drawn again with it.
    this.since += dt;
    if (this.since >= 0.05) { this.since = 0; this.invalidate(); }
  }

  protected draw(g: Gfx, s: DrawState): void {
    const inner = well(g, this.r, 'tmBg');
    const w = Math.min(inner.w, Math.floor(inner.h * 1.6)), h = Math.floor(w / 1.6);
    this.set.display.compose(this.frame, s.m.clock);
    g.shrink(this.frame, s.m.theme.level, { x: inner.x + Math.floor((inner.w - w) / 2), y: inner.y + Math.floor((inner.h - h) / 2), w, h });
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'dblclick') this.host!.run(new TvApp(this.set.tuner));
    return true;
  }

  key(k: Key): boolean {
    const { tuner, display } = this.set, audio = this.m.audio;
    if (k.key === 'Enter') { this.host!.run(new TvApp(tuner)); return true; }
    if (k.key === 'ArrowRight' || k.key === 'ArrowUp') { tuner.tune(display, audio, tuner.number + 1); return true; }
    if (k.key === 'ArrowLeft' || k.key === 'ArrowDown') { tuner.tune(display, audio, tuner.number - 1); return true; }
    if (/^\d$/.test(k.key)) { tuner.digit(display, audio, k.key); return true; }
    return false;
  }
}

const TV: WindowSpec = {
  id: 'tv', title: { en: 'Television', zh: '电视' }, size: { w: 300, h: 250 }, place: { x: 250, y: 40 },
  onOpen: host => { if (tvSet) tvSet.tuner.tune(tvSet.display, host.m.audio, tvSet.tuner.number); },
  // The box in the corner (and a double click on the title) fills the screen with the set.
  onMaximise: host => { if (tvSet) host.run(new TvApp(tvSet.tuner)); },
  onClose: host => { tvSet?.tuner.sound(host.m.audio, false); },
  content: host => {
    const set: TvSet = { tuner: new Tuner(CHANNELS), display: new OffscreenDisplay(host.m) };
    tvSet = set;
    const turn = (d: number) => (h: GuiHost) => set.tuner.tune(set.display, h.m.audio, set.tuner.number + d);
    const bar = new Toolbar();
    bar.add(new Button('◄', turn(-1), { compact: true }));
    bar.add(new Label(m => `${set.tuner.label}  ${m.t(set.tuner.channel?.name ?? { en: 'no signal', zh: '无信号' })}`));
    bar.add(new Spacer());
    bar.add(new Button({ en: 'Full', zh: '全屏' }, h => h.run(new TvApp(set.tuner)), { compact: true }));
    bar.add(new Button('►', turn(1), { compact: true }));
    bar.add(new Knob((d, h) => turn(d)(h)));
    const box = new Box('column', ['fill', 30]);
    box.add(new TvScreen(set));
    box.add(bar);
    return box;
  },
};

const tv = (host: GuiHost) => host.open(TV);

const MENU: MenuItem[] = [
  { label: { en: 'About JR-DESK', zh: '关于 JR-DESK' }, run: about },
  { label: { en: 'Help', zh: '帮助' }, run: host => host.open(HELP_WINDOW) },
  { label: { en: 'Settings...', zh: '设置……' }, run: host => host.open(SETTINGS) },
  'separator',
  { label: { en: 'DOS prompt', zh: 'DOS 命令行' }, run: host => host.run(shell()) },
  'separator',
  { label: { en: 'Log off', zh: '断线' }, run: quit },
];

const ICONS: DeskIcon[] = [
  { id: 'board', label: { en: 'Messages', zh: '留言板' }, icon: DESK_ICONS.messages, open: host => host.open(BOARD) },
  { id: 'files', label: { en: 'Files', zh: '文件' }, icon: DESK_ICONS.files, open: host => host.open(FILES) },
  { id: 'diary', label: { en: 'Diary', zh: '日记' }, icon: DESK_ICONS.diary, open: openDiary },
  { id: 'photos', label: { en: 'Photos', zh: '相册' }, icon: DESK_ICONS.photos, open: host => host.open(GALLERY) },
  { id: 'library', label: { en: 'Library', zh: '书库' }, icon: DESK_ICONS.library, open: host => host.open(LIBRARY) },
  { id: 'tv', label: { en: 'TV', zh: '电视' }, icon: DESK_ICONS.tv, open: tv },
  { id: 'net', label: { en: 'Navigator', zh: '网络' }, icon: DESK_ICONS.net, open: openBrowser },
  { id: 'paint', label: { en: 'Paint', zh: '画图' }, icon: DESK_ICONS.paint, open: host => openPaint(host) },
  { id: 'games', label: { en: 'Games', zh: '游戏' }, icon: DESK_ICONS.games, open: host => host.open(GAMES) },
  { id: 'dos', label: 'DOS', icon: DESK_ICONS.dos, open: host => host.run(shell()) },
  { id: 'system', label: { en: 'System', zh: '系统' }, icon: DESK_ICONS.system, open: host => host.open(SYSTEM) },
];

/** The desk as it comes up: the board open on the newest message, as Jackie left it. */
export function desktop(): Desktop {
  disk.path = []; disk.showDeleted = false; filesList = null; reading = null; readerText = null; tvSet = null;
  return new Desktop({
    icons: ICONS,
    menu: MENU,
    mark: MARK_ICON,
    tip: { en: 'Tip: click an icon to open it', zh: '提示：点一下图标就能打开' },
    start: host => host.open(BOARD),
    saver: m => {
      const kind = m.store.get<string>('saver', 'lighthouse');
      return kind === 'off' ? null : new SaverApp(kind === 'seeds' ? 'seeds' : 'lighthouse');
    },
  });
}

