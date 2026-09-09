// Read-only browser checks plus screenshot artifacts. Uses an isolated Chrome CDP instance.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const destination = resolve("app/reference/production/hero-00/browser-proof-02");
await mkdir(destination, { recursive: true });
const target = await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, reject) => { socket.addEventListener("open", resolveOpen, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  clearTimeout(request.timeout);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
});
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolveRequest, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 45000);
    pending.set(id, { resolve: resolveRequest, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function settle() {
  await evaluate(`(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return true;
  })()`);
}
async function click(label) {
  const rect = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(el => el.textContent === ${JSON.stringify(label)}); if (!button) throw new Error('Button missing'); const r = button.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...rect });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...rect });
  await settle();
}
async function screenshot(name, full = false) {
  const clip = await evaluate(`(() => { const r = document.querySelector('[data-testid="proof-stage"]').getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()`);
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(full ? {} : { clip }) });
  await writeFile(resolve(destination, name), Buffer.from(shot.data, "base64"));
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1360, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.navigate", { url: "http://127.0.0.1:3011/design/hero-00" });
  await evaluate(`new Promise((resolve, reject) => { const start=Date.now(); const check=()=>{ if(document.querySelector('[data-testid="proof-stage"]')) resolve(true); else if(Date.now()-start>40000) reject(new Error('Proof did not render')); else setTimeout(check,100); }; check(); })`);
  await settle();
  const report = { checkedAt: new Date().toISOString(), url: "http://127.0.0.1:3011/design/hero-00", checks: [] };
  const initial = await evaluate(`({heading:document.querySelector('h1').textContent, mode:document.querySelector('[data-testid="proof-stage"]').dataset.type, images:[...document.images].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight})), scrollWidth:document.documentElement.scrollWidth, viewport:innerWidth})`);
  assert.equal(initial.heading, "Yuchao Wang");
  assert.equal(initial.mode, "artwork");
  assert.ok(initial.images.every((image) => image.width > 0));
  assert.ok(initial.images.every((image) => !image.src.endsWith("reference.png")));
  assert.ok(initial.scrollWidth <= initial.viewport);
  report.checks.push({ desktop: initial });
  await screenshot("01-artwork-composition.png");
  await screenshot("00-review-page.png", true);
  for (const [label, filename] of [["Six Caps", "02-six-caps.png"], ["League Gothic", "03-league-gothic.png"]]) {
    await click(label);
    const metrics = await evaluate(`(() => { const svg=document.querySelector('[data-testid="native-lettering"]'); const context=document.createElement('canvas').getContext('2d'); return {font:getComputedStyle(svg).fontFamily, glyphs:[...svg.querySelectorAll('text')].map(t=>{ const s=getComputedStyle(t); context.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily; const ink=context.measureText(t.textContent); return {text:t.textContent,x:t.getBBox().x,y:t.getBBox().y,width:t.getBBox().width,height:t.getBBox().height,inkTop:Number(t.getAttribute('y'))-ink.actualBoundingBoxAscent}; }), loaded:document.fonts.check('20px "Proof ${label}"')}; })()`);
    assert.ok(metrics.loaded);
    assert.ok(metrics.glyphs.every((glyph) => glyph.width > 0 && glyph.height > 0));
    assert.ok(metrics.glyphs[0].width < 1150, "Top name remains inside the reference's horizontal composition");
    assert.ok(metrics.glyphs[1].inkTop >= 690, "Bottom name does not collide with the paper aperture");
    report.checks.push({ label, metrics });
    await screenshot(filename);
  }
  await click("查看原图");
  assert.equal(await evaluate(`document.querySelector('[data-testid="proof-stage"]').dataset.view`), "reference");
  await click("查看组合");
  await click("原图字标");
  await evaluate(`(() => { const input=document.querySelector('input[type="range"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'50'); input.dispatchEvent(new Event('change',{bubbles:true})); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await settle();
  assert.equal(await evaluate(`Number(getComputedStyle(document.querySelector('[data-testid="reference-overlay"]')).opacity)`), 0.5);
  await evaluate(`(() => { const input=document.querySelector('input[type="range"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await settle();
  assert.equal(await evaluate(`document.querySelector('[data-testid="reference-overlay"]') === null`), true);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await settle();
  const mobile = await evaluate(`({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,stageWidth:document.querySelector('[data-testid="proof-stage"]').getBoundingClientRect().width})`);
  assert.ok(mobile.scrollWidth <= mobile.viewport, "No horizontal overflow on narrow screen");
  report.checks.push({ mobile });
  await screenshot("04-mobile-review.png", true);
  report.exceptions = exceptions;
  assert.equal(exceptions.length, 0, "No uncaught browser exceptions");
  await writeFile(resolve(destination, "checks.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:9333/json/close/${target.id}`).catch(() => {});
}
