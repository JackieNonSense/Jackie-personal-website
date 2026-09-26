import { GAME } from '../../audio/tracks';
import { H, W, drawSprite, drawText, fillRect } from '../../graphics/bitmap';
import type { Game, GameInput } from '../../system/apps/game';
import type { Machine } from '../../system/machine';

/*
 * FALL, MOTH's idea and Jackie's first game on this machine (December 2029):
 * catch what falls; the more you catch, the faster it falls. Three missed and it is
 * over. Every fifteen seconds a catch is worth ten points more.
 */
const CATCHER = ['..####..', '.######.', '########', '#+#++#+#'];
const SEED = ['.#.', '###', '.#.'];
const SCALE = 4;

type Seed = { x: number; y: number; speed: number };

export class FallGame implements Game {
  readonly title = 'FALL';
  readonly music = GAME;
  readonly help = { en: 'Catch what falls. Miss three and it ends.', zh: '接住掉下来的东西。漏掉三个就结束。' };
  score = 0;
  over = false;
  private x = W / 2;
  private seeds: Seed[] = [];
  private spawn = 0;
  private missed = 0;
  private elapsed = 0;

  constructor(readonly table: Game['table'] = []) {}

  reset(): void {
    this.score = 0; this.over = false; this.x = W / 2; this.seeds = []; this.spawn = 0.4; this.missed = 0; this.elapsed = 0;
  }

  update(m: Machine, dt: number, input: GameInput): void {
    this.elapsed += dt;
    const dir = (input.held.has('Right') ? 1 : 0) - (input.held.has('Left') ? 1 : 0);
    const cw = CATCHER[0].length * SCALE;
    // The pointer leads and the catcher follows, as fast as its keys would move it.
    if (input.pointer && !dir) this.x += Math.max(-360 * dt, Math.min(360 * dt, input.pointer.x - this.x));
    else this.x += dir * 360 * dt;
    this.x = Math.max(cw / 2, Math.min(W - cw / 2, this.x));
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.seeds.push({ x: 20 + Math.random() * (W - 40), y: -12, speed: 90 + Math.min(160, this.elapsed * 6) + Math.random() * 40 });
      this.spawn = Math.max(0.35, 1.1 - this.elapsed * 0.02);
    }
    const top = H - 40;
    for (const s of this.seeds) s.y += s.speed * dt;
    this.seeds = this.seeds.filter(s => {
      if (s.y >= top - 8 && s.y <= top + 8 && Math.abs(s.x - this.x) < cw / 2 + 4) { this.score += 10 * (1 + Math.floor(this.elapsed / 15)); m.audio.sfx('catch'); return false; }
      if (s.y > H) { this.missed++; return false; }
      return true;
    });
    if (this.missed >= 3) this.over = true;
  }

  draw(m: Machine): void {
    const b = m.graphics();
    b.fill(0);
    fillRect(b, 0, H - 20, W, 1, 'tmDim');
    for (const s of this.seeds) drawSprite(b, SEED, s.x - 6, s.y - 6, SCALE);
    drawSprite(b, CATCHER, this.x - (CATCHER[0].length * SCALE) / 2, H - 40, SCALE);
    if (m.glyphs) {
      drawText(b, m.glyphs, 16, 12, `SCORE ${String(this.score).padStart(5, '0')}`, 'tmBright');
      drawText(b, m.glyphs, W - 16 - 8 * 7, 12, `MISS ${'x'.repeat(this.missed).padEnd(3, '.')}`, 'tmText');
    }
    m.present();
  }
}
