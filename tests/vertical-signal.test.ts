import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
async function model() {
 const path = resolve("components/portfolio/vertical-signal.ts");
 expect(existsSync(path)).toBe(true); return import(path);
}
it("uses deterministic sparse columns flowing both upwards and downwards", async () => {
 const { createColumns } = await model(); const glyphs = createColumns(1440,900);
 expect(glyphs).toEqual(createColumns(1440,900));
 expect(glyphs.some((g:{speed:number})=>g.speed<0)).toBe(true);
 expect(glyphs.some((g:{speed:number})=>g.speed>0)).toBe(true);
 expect(glyphs.length).toBeLessThan(400);
});
it("caps resumed movement and expands the clipping contour with the same lip offset", async () => {
 const { advanceY, openingPath } = await model();
 expect(advanceY(100,20,100,900)).toBe(101);
 expect(advanceY(100,-20,100,900)).toBe(99);
 expect(openingPath(0)).not.toBe(openingPath(12));
 expect(openingPath(40)).toBe(openingPath(12));
});
