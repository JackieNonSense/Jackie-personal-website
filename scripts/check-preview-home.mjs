import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = "http://localhost:3011";
const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200, "localhost:3011 root responds successfully");
const html = await response.text();
assert.ok(html.includes('data-testid="portfolio"'), "Root must show the interactive portfolio without a subpath");
assert.ok(!html.includes("TYPE PROOF 02"), "Root has no calibration toolbar");
assert.ok(!html.includes('class="signal-rift"'), "Root must not render the old signal hero");
for (const asset of ["material-plate-v02.png", "name-stencil-v04.png"]) {
  assert.ok(html.includes(`/portfolio/${asset}`), `Root includes ${asset}`);
  const assetResponse = await fetch(`${origin}/portfolio/${asset}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(assetResponse.status, 200, `${asset} is served`);
}
const { scripts } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(scripts.dev, /--port 3011(?:\s|$)/, "Default dev command keeps port 3011");
assert.match(scripts.start, /--port 3011(?:\s|$)/, "Default start command keeps port 3011");
for (const id of ["work", "about", "experiments", "contact"]) assert.ok(html.includes(`id="${id}"`), `${id} chapter exists`);
assert.equal((await fetch(`${origin}/proof/hero-00/reference.png`)).status, 404, "Unredacted reference is not public");
console.log("PASS: http://localhost:3011/ renders the interactive five-chapter portfolio; material assets and default port verified.");
