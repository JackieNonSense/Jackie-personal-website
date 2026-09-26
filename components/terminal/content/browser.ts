import { HW } from '../crt/palette';
import { HOME, fetchPage, normalise } from './web';
import { PageView, type Page } from '../system/gui/page';
import { Box, Widget, type DrawState, type GuiHost, type WindowSpec } from '../system/gui/widget';
import { Button, InputField, LINE, Label, Spacer, Toolbar } from '../system/gui/widgets';
import type { Gfx } from '../system/gui/gfx';
import type { Machine } from '../system/machine';

/*
 * NAVIGATOR: the web browser N.O. left on the machine, older than every page it is
 * asked for. It goes out down the phone line (the network cable is still unplugged),
 * so a page comes down a piece at a time; the stars in its corner turn while it does.
 */

/** A page's weight, roughly: how long the line takes over it. */
const seconds = (page: Page) => Math.min(2.6, 0.7 + JSON.stringify(page.blocks).length / 2600);

/** The corner mark: a small night sky, its stars moving while a page comes. */
class Throbber extends Widget {
  private time = 0;
  constructor(private readonly busy: () => boolean) { super(); }
  width(): number { return 30; }
  protected draw(g: Gfx): void {
    const r = this.r;
    g.fill(r, HW.blue); g.rect(r, HW.black);
    const stars = [[4, 5], [12, 12], [21, 4], [8, 17], [24, 15], [16, 8]];
    const drift = this.busy() ? this.time * 18 : 0;
    stars.forEach(([x, y], i) => g.fill({ x: r.x + 2 + ((x + drift * (1 + (i % 3) * 0.5)) % (r.w - 4)), y: r.y + 1 + y, w: 1, h: 1 }, HW.white));
    // A comet across, while busy.
    if (this.busy()) { const cx = r.x + 2 + ((this.time * 30) % (r.w - 6)); g.fill({ x: cx, y: r.y + r.h - 7, w: 3, h: 2 }, HW.yellow); }
  }
  tick(dt: number): void { this.time += dt; if (this.busy()) this.invalidate(); }
}

/** The status line along the foot: what the line is doing, and how far it has got. */
class Status extends Widget {
  constructor(private readonly say: (m: Machine) => string, private readonly progress: () => number) { super(); }
  protected draw(g: Gfx, s: DrawState): void {
    const r = this.r, p = this.progress();
    g.fill(r, 'face'); g.hline(r.x, r.y, r.w, 'shadow');
    const bar = { x: r.x + r.w - 104, y: r.y + 4, w: 96, h: r.h - 8 };
    g.save(); g.clip({ x: r.x + 4, y: r.y, w: r.w - 116, h: r.h });
    g.text(r.x + 6, r.y + Math.floor((r.h - LINE) / 2), this.say(s.m), 'faceText');
    g.restore();
    g.rect(bar, 'shadow');
    if (p > 0 && p < 1) g.fill({ x: bar.x + 1, y: bar.y + 1, w: Math.round((bar.w - 2) * p), h: bar.h - 2 }, 'select');
  }
}

/** Back, forward and where the line is now. */
class Navigator {
  history: string[] = [];
  index = -1;
  page: Page | null = null;
  /** Seconds into the page coming down; `length` is how long it takes. */
  time = 0;
  length = 0;
  hover: string | null = null;
  view!: PageView;
  address!: InputField;

  get loading(): boolean { return this.page !== null && this.time < this.length; }
  get progress(): number { return this.length ? Math.min(1, this.time / this.length) : 1; }

  go(m: Machine, url: string, remember = true): void {
    const page = fetchPage(m, url);
    if (remember) { this.history = this.history.slice(0, this.index + 1); this.history.push(page.url); this.index = this.history.length - 1; }
    this.page = page;
    this.time = 0;
    this.length = m.still ? 0.01 : seconds(page);
    this.view.show(page);
    this.view.arrived = 0;
    this.address.set(`http://${page.url}`);
  }

  step(m: Machine, d: number): void {
    const i = this.index + d;
    if (i < 0 || i >= this.history.length) return;
    this.index = i;
    this.go(m, this.history[i], false);
  }

  tick(dt: number): boolean {
    if (!this.loading) return false;
    this.time += dt;
    // The first part is the connection; then the page, top to bottom.
    this.view.arrived = Math.max(0, (this.progress - 0.25) / 0.75);
    return true;
  }

  status(m: Machine): string {
    if (this.hover) return this.hover.startsWith('http') ? this.hover : `http://${normalise(this.hover)}`;
    if (!this.page) return '';
    const host = this.page.url.split('/')[0];
    if (this.loading) {
      const p = this.progress;
      if (p < 0.12) return m.t({ en: `Contacting host: ${host}...`, zh: `正在联系主机：${host}……` });
      if (p < 0.25) return m.t({ en: 'Host contacted. Waiting for reply...', zh: '已联系上主机，等待回复……' });
      return m.t({ en: `Transferring data from ${host} (${Math.round(p * 100)}%)`, zh: `正在从 ${host} 传输数据（${Math.round(p * 100)}%）` });
    }
    return m.t(this.page.done ?? { en: 'Document: Done', zh: '文档：完成' });
  }
}

let nav: Navigator | null = null;

/** The page and its bits, ticking the line along. */
class BrowserBody extends Box {
  constructor(private readonly n: Navigator) { super('column', [30, 26, 'fill', 20]); }
  tick(dt: number): void {
    super.tick(dt);
    if (this.n.tick(dt)) this.invalidate();
  }
}

export const BROWSER: WindowSpec = {
  id: 'browser', title: m => `NAVIGATOR - ${m.t(nav?.page?.title ?? '')}`,
  size: { w: 560, h: 360 }, place: 'centre', resizable: true, min: { w: 360, h: 220 },
  onOpen: host => { if (nav && !nav.page) nav.go(host.m, HOME); },
  content: host => {
    const n = new Navigator();
    nav = n;
    const body = new BrowserBody(n);
    const bar = new Toolbar();
    bar.add(new Button({ en: '◄ Back', zh: '◄ 后退' }, h => n.step(h.m, -1), { compact: true, enabled: () => n.index > 0 }));
    bar.add(new Button({ en: 'Forward ►', zh: '前进 ►' }, h => n.step(h.m, 1), { compact: true, enabled: () => n.index < n.history.length - 1 }));
    bar.add(new Button({ en: 'Home', zh: '主页' }, h => n.go(h.m, HOME), { compact: true }));
    bar.add(new Button({ en: 'Reload', zh: '刷新' }, h => { if (n.page) n.go(h.m, n.page.url, false); }, { compact: true }));
    bar.add(new Spacer());
    bar.add(new Throbber(() => n.loading));
    const where = new Box('row', [76, 'fill'], 4, 3);
    where.add(new Label({ en: 'Location:', zh: '地址：' }));
    n.address = where.add(new InputField({ max: 60, onEnter: (url, h: GuiHost) => { if (url.trim()) n.go(h.m, url); } }));
    n.address.id = 'address';
    n.view = new PageView({
      follow: (href, external) => { if (external) host.m.openUrl(href); else n.go(host.m, href); },
      hover: href => { n.hover = href; },
    });
    n.view.id = 'page';
    body.add(bar); body.add(where); body.add(n.view);
    body.add(new Status(m => n.status(m), () => (n.loading ? n.progress : 1)));
    n.go(host.m, HOME);
    return body;
  },
};

export const openBrowser = (host: GuiHost) => host.open(BROWSER);
