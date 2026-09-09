/** Deterministic, front-projected ABS wear. No repeated tile or random refresh. */
const hash = (x: number, y: number) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = fx * fx * (3 - 2 * fx), b = fy * fy * (3 - 2 * fy);
  return (hash(ix, iy) * (1 - a) + hash(ix + 1, iy) * a) * (1 - b) + (hash(ix, iy + 1) * (1 - a) + hash(ix + 1, iy + 1) * a) * b;
}
const scuffs = [
  [-1.89, 1.48, -1.68, 1.51], [-1.83, 1.45, -1.76, 1.47], [1.52, 1.54, 1.78, 1.53],
  [1.87, 1.49, 1.96, 1.37], [1.96, .96, 1.94, .79], [-1.96, -.72, -1.93, -.9],
  [-1.78, -1.53, -1.58, -1.52], [1.62, -1.53, 1.86, -1.51], [-1.6, 1.39, -1.46, 1.4],
  [1.73, -1.31, 1.81, -1.29], [-1.89, -.17, -1.82, -.18], [1.92, -1.11, 1.93, -1.26],
];
export function housingMaps(width = 1024, height = 768) {
  const color = new Uint8Array(width * height * 4), roughness = new Uint8Array(color.length), bump = new Uint8Array(color.length), wear = new Float32Array(width * height);
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const x = (px / (width - 1) - .5) * 4.09, y = (py / (height - 1) - .5) * 3.24;
    const edge = Math.max(0, Math.min(2 - Math.abs(x), 1.575 - Math.abs(y)));
    const dx = Math.max(0, Math.abs(x) - 1.675), dy = Math.max(0, Math.abs(y - .18) - 1.235);
    const seam = Math.sqrt(dx * dx + dy * dy);
    const mottling = noise((x + 3) * 11, (y + 3) * 11), fine = hash(px, py);
    const dirt = (Math.exp(-edge / .026) * .72 + Math.exp(-seam / .018) * .7) * (.28 + mottling * .72);
    const yellowing = noise(x * 1.7 + 9, y * 1.7 + 3) * 4 + noise(x * 5 + 3, y * 5 + 5) * 2;
    let scratch = 0;
    for (const [ax, ay, bx, by] of scuffs) {
      if (x < Math.min(ax, bx) - .012 || x > Math.max(ax, bx) + .012 || y < Math.min(ay, by) - .012 || y > Math.max(ay, by) + .012) continue;
      const vx = bx - ax, vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
      const dist = Math.hypot(x - ax - t * vx, y - ay - t * vy);
      scratch = Math.max(scratch, Math.exp(-dist * dist / .000008) * (.25 + fine * .75));
    }
    const tone = -dirt * 42 + scratch * 20 + (fine - .5) * 2.5;
    const i = (py * width + px) * 4;
    color.set([191 + tone - yellowing, 181 + tone - yellowing * 1.3, 159 + tone - yellowing * 1.8, 255], i);
    const r = Math.round(156 + dirt * 36 - scratch * 37 + fine * 10);
    roughness.set([r, r, r, 255], i);
    const h = Math.round(128 + (fine - .5) * 15 - scratch * 45 - dirt * 5);
    bump.set([h, h, h, 255], i); wear[py * width + px] = dirt;
  }
  return { color, roughness, height: bump, wear, width, rows: height };
}
