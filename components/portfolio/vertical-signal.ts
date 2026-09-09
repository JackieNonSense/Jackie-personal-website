import { aperturePath } from "./signal-model";
export type VerticalGlyph = { x: number; y: number; speed: number; char: string; bright: boolean };
export function createColumns(width: number, height: number): VerticalGlyph[] {
  let seed = 63219;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const symbols = "01<>/.:+ナミリ01";
  const columns = Math.max(8, Math.floor(width / 39));
  return Array.from({ length: columns }, (_, col) => {
    const x = (col + .35 + random() * .3) * width / columns;
    const speed = (col % 2 ? -1 : 1) * [12, 20, 30][col % 3];
    const phase = random() * height * .25;
    return Array.from({ length: 7 }, (_, row) => ({ x, y: height * .34 + ((phase + row * 23) % (height * .4)), speed, char: symbols[Math.floor(random() * symbols.length)], bright: col % 4 === 0 && row % 3 === 0 }));
  }).flat();
}
export function advanceY(y: number, speed: number, elapsed: number, height: number) {
  const next = y + speed * Math.max(0, Math.min(.05, elapsed));
  if (next > height * .76) return height * .32;
  if (next < 0) return height * .76;
  return next;
}
const values = aperturePath.match(/\d+/g)!.map(Number);
const points = Array.from({ length: values.length / 2 }, (_, i) => [values[i * 2], values[i * 2 + 1]]);
const turn = points.findIndex(([x]) => x === 1586);
export function openingPath(gap: number, artScale = 1) {
  const amount = Math.max(0, Math.min(12, gap)) * artScale;
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y + (i <= turn ? -amount : amount)}`).join(" ") + " Z";
}
// Two independent cuts through the existing photographic paper. Separation
// reveals a persistent dark inner sheet, never an empty background.
const seam = [[0,.577],[.035,.568],[.078,.573],[.12,.57],[.17,.58],[.215,.57],[.258,.561],[.3,.567],[.342,.563],[.392,.559],[.44,.565],[.489,.569],[.53,.555],[.58,.547],[.627,.549],[.67,.55],[.718,.541],[.767,.553],[.81,.56],[.855,.576],[.901,.567],[.95,.55],[1,.534]];
export const upperPaperClip = `polygon(0% 0%,100% 0%,${[...seam].reverse().map(([x,y])=>`${x*100}% ${y*100+.1}%`).join(",")})`;
export const lowerPaperClip = `polygon(${seam.map(([x,y])=>`${x*100}% ${y*100-.1}%`).join(",")},100% 100%,0% 100%)`;
