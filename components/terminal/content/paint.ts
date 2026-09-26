import { CANVAS, PAPER, PaintDoc, SHAPES, TOOLS, type Tool } from '../graphics/paint';
import { decodeDrawing, encodeDrawing } from '../graphics/pcx';
import { isoDate, machineNow } from './time';
import { Box, Widget, type DrawState, type GuiEvent, type GuiHost, type WindowSpec } from '../system/gui/widget';
import { Button, InputField, LINE, Label, ListView, Spacer, Toolbar, well } from '../system/gui/widgets';
import { contains, type Rect } from '../system/gui/geometry';
import type { Gfx, Icon } from '../system/gui/gfx';
import type { DirNode, FileNode } from '../system/fs';
import type { Machine } from '../system/machine';
import type { Text } from '../system/i18n';

/*
 * PAINT: Jackie's drawing program, and the visitor's. Drawings go to C:\DRAFTS
 * beside his, and stay there for the next visit. Undoing and rubbing out are
 * counted, as OS-SCORE.TXT says they should be: "People erase and redraw."
 */

// ── The visitor's drawings, in C:\DRAFTS ───────────────────────────────────────

export type Drawing = { name: string; data: string; at: number };
/** How many drawings the drafts folder keeps. */
const KEEP = 12;

export const drawings = (m: Machine): Drawing[] => m.store.get<Drawing[]>('drawings', []);

export function loadDrawing(m: Machine, name: string): Uint8Array | null {
  const found = drawings(m).find(d => d.name === name);
  return found ? decodeDrawing(found.data, CANVAS.w * CANVAS.h) : null;
}

function draftsDir(m: Machine): DirNode | null {
  const found = m.fs.resolve('/DRAFTS');
  return found?.node.kind === 'dir' ? found.node : null;
}

/** The file for a drawing, as C:\DRAFTS lists it. */
function drawingNode(d: Drawing): FileNode {
  return { kind: 'file', name: d.name, date: isoDate(machineNow(new Date(d.at))), drawing: d.name, size: d.data.length };
}

/** Puts the visitor's drawings back on the disk (at start, beside what restoreDisk puts back). */
export function restoreDrawings(m: Machine): void {
  const dir = draftsDir(m);
  if (!dir) return;
  dir.children = dir.children.filter(c => !(c.kind === 'file' && c.drawing));
  for (const d of drawings(m)) dir.children.push(drawingNode(d));
}

export function saveDrawing(m: Machine, name: string, data: Uint8Array): void {
  const kept = drawings(m).filter(d => d.name !== name);
  kept.push({ name, data: encodeDrawing(data), at: Date.now() });
  m.store.set('drawings', kept.slice(-KEEP));
  restoreDrawings(m);
  m.audio.sfx('disk', '0.4');
}

/** An 8.3 name, as DOS would take it: letters, digits, _ and -, eight at most, then .PCX. */
export function dosName(typed: string): string | null {
  const base = typed.trim().toUpperCase().replace(/\.PCX$/, '');
  return /^[A-Z0-9_-]{1,8}$/.test(base) ? `${base}.PCX` : null;
}

// ── Tools ──────────────────────────────────────────────────────────────────────

const art = (rows: string[]): Icon => ({ w: 16, h: rows.length, rows, ink: { '#': 'faceText', o: 'faceDim' } });
const TOOL_ICONS: Record<Tool, Icon> = {
  pencil: art(['          ##', '         #oo#', '        #oo#', '       #oo#', '      #oo#', '     #oo#', '    #oo#', '   ###', '   ##', '   #']),
  brush: art(['           ##', '          ##', '         ##', '        ##', '       ##', '     ####', '    #####', '   ######', '   #####', '    ##']),
  spray: art(['  #  #   ####', '    #  # #oo#', ' # #   ##oo##', '   #  # #oooo#', '  #    ##oooo#', '        #oooo#', '        #oooo#', '        ######']),
  eraser: art(['      #######', '     #ooooo##', '    #ooooo# #', '   #ooooo#  #', '  #######  #', '  #     # #', '  #     ##', '  #######']),
  line: art(['            #', '           #', '         ##', '       ##', '     ##', '   ##', '  #', ' #']),
  rect: art(['############', '#          #', '#          #', '#          #', '#          #', '#          #', '############']),
  box: art(['############', '############', '############', '############', '############', '############', '############']),
  ellipse: art(['   ######', ' ##      ##', '#          #', '#          #', '#          #', ' ##      ##', '   ######']),
  fill: art(['     #', '    ###', '   #ooo#', '  #ooooo#', ' #ooooooo#  #', '  #ooooo#   ##', '   #ooo#   ###', '    ###     #']),
};
const TOOL_NAMES: Record<Tool, Text> = {
  pencil: { en: 'Pencil', zh: '铅笔' }, brush: { en: 'Brush', zh: '刷子' }, spray: { en: 'Spray', zh: '喷枪' }, eraser: { en: 'Eraser', zh: '橡皮' },
  line: { en: 'Line', zh: '直线' }, rect: { en: 'Rectangle', zh: '矩形' }, box: { en: 'Filled box', zh: '实心矩形' }, ellipse: { en: 'Ellipse', zh: '椭圆' }, fill: { en: 'Fill', zh: '填充' },
};

/** The state of one Paint window: the drawing, its name, and what is in hand. */
type Studio = { doc: PaintDoc; name: string | null; tool: Tool; colour: number };

/** The strip on the left: nine tools, and the sixteen colours. */
class ToolStrip extends Widget {
  hoverable = true;
  constructor(private readonly studio: Studio) { super(); }

  private toolRect(i: number): Rect { return { x: this.r.x + 2 + (i % 2) * 30, y: this.r.y + 2 + Math.floor(i / 2) * 22, w: 29, h: 21 }; }
  private swatchRect(i: number): Rect {
    const top = this.r.y + 2 + Math.ceil(TOOLS.length / 2) * 22 + 6;
    return { x: this.r.x + 2 + (i % 4) * 15, y: top + Math.floor(i / 4) * 13, w: 14, h: 12 };
  }

  protected draw(g: Gfx, s: DrawState): void {
    g.fill(this.r, 'face');
    TOOLS.forEach((tool, i) => {
      const r = this.toolRect(i), on = this.studio.tool === tool;
      g.fill(r, on ? 'select' : 'face'); g.rect(r, 'frame');
      g.bevel({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 }, on ? 'pressed' : 'raised');
      const ic = TOOL_ICONS[tool];
      g.icon(ic, r.x + Math.floor((r.w - ic.w) / 2), r.y + Math.floor((r.h - ic.h) / 2), on ? { '#': 'selectText', o: 'selectText' } : undefined);
    });
    for (let i = 0; i < 16; i++) {
      const r = this.swatchRect(i);
      g.fill(r, i);
      g.rect(r, this.studio.colour === i ? 'accent' : 'frame');
      if (this.studio.colour === i) g.rect({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }, 'accent');
    }
    void s;
  }

  event(e: GuiEvent): boolean {
    if (e.type !== 'down') return true;
    const t = TOOLS.findIndex((_, i) => contains(this.toolRect(i), e.x, e.y));
    if (t >= 0) { this.studio.tool = TOOLS[t]; this.m.announce(this.m.t(TOOL_NAMES[TOOLS[t]])); this.invalidate(); }
    const c = [...Array(16).keys()].find(i => contains(this.swatchRect(i), e.x, e.y));
    if (c !== undefined) { this.studio.colour = c; this.invalidate(); }
    return true;
  }
}

/** The drawing itself, as large as its room allows. */
class Canvas extends Widget {
  cursor = 'cross' as const;
  private from: { x: number; y: number } | null = null;
  private last: { x: number; y: number } | null = null;
  private to: { x: number; y: number } | null = null;
  private held = false;
  private seed = 1;

  constructor(private readonly studio: Studio) { super(); }

  /** Where the drawing sits in the widget, and how many logical pixels one of its pixels takes. */
  private get fit(): { x: number; y: number; k: number } {
    const inner = { x: this.r.x + 2, y: this.r.y + 2, w: this.r.w - 4, h: this.r.h - 4 };
    let k = Math.min(inner.w / CANVAS.w, inner.h / CANVAS.h);
    if (k >= 1) k = Math.floor(k);
    return { x: inner.x + Math.floor((inner.w - CANVAS.w * k) / 2), y: inner.y + Math.floor((inner.h - CANVAS.h * k) / 2), k };
  }

  private cell(e: { x: number; y: number }): { x: number; y: number } {
    const f = this.fit;
    return { x: Math.floor((e.x - f.x) / f.k), y: Math.floor((e.y - f.y) / f.k) };
  }

  protected draw(g: Gfx): void {
    well(g, this.r, 'shadow');
    const f = this.fit, doc = this.studio.doc;
    // A shape being dragged shows before it is laid down.
    let data = doc.data;
    if (this.from && this.to && SHAPES.has(this.studio.tool)) {
      const preview = new PaintDoc();
      preview.data = doc.data.slice();
      this.shape(preview, this.from, this.to);
      data = preview.data;
    }
    g.canvas(data, CANVAS.w, CANVAS.h, { x: f.x, y: f.y, w: CANVAS.w * f.k, h: CANVAS.h * f.k });
  }

  private shape(doc: PaintDoc, a: { x: number; y: number }, b: { x: number; y: number }): void {
    const c = this.studio.colour;
    switch (this.studio.tool) {
      case 'line': doc.line(a.x, a.y, b.x, b.y, c); break;
      case 'rect': doc.rect(a.x, a.y, b.x, b.y, c, false); break;
      case 'box': doc.rect(a.x, a.y, b.x, b.y, c, true); break;
      case 'ellipse': doc.ellipse(a.x, a.y, b.x, b.y, c); break;
    }
  }

  private random = () => { this.seed = (this.seed * 1103515245 + 12345) >>> 0; return this.seed / 4294967296; };

  /** One step of a freehand tool, from the last point to this one. */
  private stroke(p: { x: number; y: number }): void {
    const { doc, tool, colour } = this.studio, from = this.last ?? p;
    if (tool === 'pencil') doc.line(from.x, from.y, p.x, p.y, colour);
    else if (tool === 'brush') doc.line(from.x, from.y, p.x, p.y, colour, 2);
    else if (tool === 'eraser') doc.line(from.x, from.y, p.x, p.y, PAPER, 4);
    else if (tool === 'spray') doc.spray(p.x, p.y, colour, this.random);
    this.last = p;
  }

  event(e: GuiEvent): boolean {
    const { doc, tool } = this.studio, p = this.cell(e);
    if (e.type === 'down') {
      doc.begin();
      this.from = p; this.to = p; this.last = null; this.held = true;
      if (tool === 'fill') doc.fill(p.x, p.y, this.studio.colour);
      else if (!SHAPES.has(tool)) this.stroke(p);
      // Rubbing out is a second thought, and the scorer counts it.
      if (tool === 'eraser') this.m.hesitate();
      this.invalidate();
    } else if ((e.type === 'drag' || e.type === 'dragstart') && this.held) {
      this.to = p;
      if (!SHAPES.has(tool) && tool !== 'fill') this.stroke(p);
      this.invalidate();
    } else if (e.type === 'up' || e.type === 'dragend') {
      if (this.held && this.from && SHAPES.has(tool)) this.shape(doc, this.from, p);
      this.held = false; this.from = null; this.to = null; this.last = null;
      this.invalidate();
    }
    return true;
  }

  /** The spray keeps spraying while it is held still. */
  tick(dt: number): void {
    super.tick(dt);
    if (this.held && this.studio.tool === 'spray' && this.last) { this.studio.doc.spray(this.last.x, this.last.y, this.studio.colour, this.random, 6, 3); this.invalidate(); }
  }
}

/** The Paint window: toolbar, tools, canvas. `open` names a drawing to start with. */
export function paintWindow(): WindowSpec & { studio: Studio } {
  const studio: Studio = { doc: new PaintDoc(), name: null, tool: 'pencil', colour: 15 };
  return {
    studio,
    id: 'paint', size: { w: 344, h: 238 }, place: { x: 160, y: 60 }, resizable: true, min: { w: 330, h: 220 },
    title: m => `${m.t({ en: 'Paint', zh: '画图' })}  ${studio.name ?? m.t({ en: '(untitled)', zh: '（未命名）' })}`,
    content: () => {
      const bar = new Toolbar();
      bar.add(new Button({ en: 'New', zh: '新建' }, h => { studio.doc.clear(); studio.name = null; h.invalidate(); }, { compact: true }));
      bar.add(new Button({ en: 'Open...', zh: '打开……' }, h => openDialog(h, studio), { compact: true }));
      bar.add(new Button({ en: 'Save', zh: '保存' }, h => (studio.name ? save(h, studio, studio.name) : saveAs(h, studio)), { compact: true }));
      bar.add(new Button({ en: 'Save as...', zh: '另存为……' }, h => saveAs(h, studio), { compact: true }));
      bar.add(new Button({ en: 'Undo', zh: '撤销' }, h => { if (studio.doc.undo()) { h.m.hesitate(); h.invalidate(); } else h.beep(); }, { compact: true, enabled: () => studio.doc.canUndo }));
      const body = new Box('row', [64, 'fill'], 4, 2);
      body.add(new ToolStrip(studio));
      body.add(new Canvas(studio));
      const box = new Box('column', [28, 'fill']);
      box.add(bar); box.add(body);
      return box;
    },
  };
}

function save(host: GuiHost, studio: Studio, name: string): void {
  saveDrawing(host.m, name, studio.doc.data);
  studio.name = name;
  studio.doc.dirty = false;
  host.m.announce(host.m.t({ en: `Saved C:\\DRAFTS\\${name}`, zh: `已保存 C:\\DRAFTS\\${name}` }));
  host.invalidate();
}

let asked = 0;

function saveAs(host: GuiHost, studio: Studio): void {
  const id = `paint-save-${++asked}`;
  const field = new InputField({ max: 8, upper: true, onEnter: (v, h) => done(h, v) });
  field.set(studio.name?.replace(/\.PCX$/, '') ?? '');
  const done = (h: GuiHost, typed: string) => {
    const name = dosName(typed);
    if (!name) { h.beep(); return; }
    h.close(id);
    save(h, studio, name);
  };
  const body = new Box('column', [LINE * 2, 26], 4);
  body.add(new Label({ en: 'Name, eight letters or digits at most. It goes in C:\\DRAFTS.', zh: '名字，最多八个字母或数字。存在 C:\\DRAFTS。' }));
  body.add(field);
  const row = new Box('row', ['fill', 76, 76], 6);
  row.add(new Spacer());
  row.add(new Button('OK', h => done(h, field.value), { isDefault: true }));
  row.add(new Button({ en: 'Cancel', zh: '取消' }, h => h.close(id)));
  const content = new Box('column', ['fill', 26], 8, 10);
  content.add(body); content.add(row);
  host.open({ id, title: { en: 'Save as', zh: '另存为' }, modal: true, place: 'centre', size: { w: 320, h: 150 }, content: () => content });
  host.focus(field);
}

function openDialog(host: GuiHost, studio: Studio): void {
  const id = `paint-open-${++asked}`;
  const pick = (h: GuiHost, d: Drawing | undefined) => {
    if (!d) { h.beep(); return; }
    const data = loadDrawing(h.m, d.name);
    if (!data) { h.beep(); return; }
    studio.doc.load(data);
    studio.name = d.name;
    h.close(id);
    h.invalidate();
  };
  const list = new ListView<Drawing>({
    items: m => drawings(m),
    columns: [{ width: 'fill', text: d => d.name }, { width: 96, text: d => isoDate(machineNow(new Date(d.at))) }],
    onOpen: (d, _i, h) => pick(h, d),
    empty: { en: 'Nothing saved yet.', zh: '还没有保存过。' },
  });
  list.selected = 0;
  const row = new Box('row', ['fill', 76, 76], 6);
  row.add(new Spacer());
  row.add(new Button({ en: 'Open', zh: '打开' }, h => pick(h, list.item), { isDefault: true }));
  row.add(new Button({ en: 'Cancel', zh: '取消' }, h => h.close(id)));
  const content = new Box('column', ['fill', 26], 8, 10);
  content.add(list); content.add(row);
  host.open({ id, title: { en: 'Open a drawing', zh: '打开画' }, modal: true, place: 'centre', size: { w: 300, h: 220 }, content: () => content });
}

