/** The top screen: long-exposure ribbons of light on black, one per band of the
 *  spectrum, drifting in layers of depth. On a hit a highlight runs along them, the
 *  same light that runs round the trim when the machine powers up. Each track keeps
 *  the ink-green ribbons and gets its own accent. The title is laid in small caps.
 *  Uniforms: time, bass, the spectrum (32x1), the travelling highlight, the title,
 *  and picture / noise / degauss for the screen coming on. */

export const SCREEN_VERTEX = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const SCREEN_FRAGMENT = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime, uBass, uKick, uScene, uAspect, uPicture, uNoise, uDegauss, uPulse, uPulseGlow;
uniform sampler2D uSpec, uText;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float spec(float x){ return texture2D(uSpec, vec2(clamp(x, 0.0, 1.0), .5)).r; }

vec3 accent(){
  return uScene < .5 ? vec3(1.0, .7, .34) : uScene < 1.5 ? vec3(.6, .55, 1.0) : vec3(1.0, .46, .56);
}

float wave(float x, float fi, float amp, float speed, float base, float t){
  return base + amp * (.62 * sin(x * (1.05 + fi * .13) + t * speed + fi * 1.7) + .38 * sin(x * (2.3 - fi * .1) - t * speed * 1.4 + fi));
}

vec3 ribbons(vec2 p, float t){
  // Near-black with a breath of green where the ribbons gather.
  vec3 col = vec3(.003, .009, .007) + vec3(.012, .04, .03) * exp(-abs(p.y + .05) * 3.0) * (.6 + .6 * uBass);
  vec3 acc = accent();
  float hx = mix(-uAspect - .4, uAspect + .4, uPulse);
  // One screen pixel in these units: a line thinner than that is widened and dimmed, not broken.
  float px = max(fwidth(p.y), 1e-4);
  for (int i = 0; i < 8; i++){
    float fi = float(i), depth = mod(fi * 3.0, 8.0) / 7.0;
    float lvl = spec(.03 + fi * .11);
    float amp = (.08 + .45 * lvl) * (1.0 - depth * .45);
    float speed = (.22 + fi * .045) * (1.0 - depth * .4);
    float base = (fi - 3.5) * .055 + .03 * sin(t * .17 + fi * 2.0);
    float y = wave(p.x, fi, amp, speed, base, t);
    float slope = (wave(p.x + .01, fi, amp, speed, base, t) - y) / .01;
    float d = abs(p.y - y) / sqrt(1.0 + slope * slope);
    float w = mix(.0042, .0016, depth);
    float ww = max(w, px * .75), energy = w / ww;
    float core = smoothstep(ww + px * .5, max(ww - px * .5, 0.0), d) * energy;
    float halo = pow(ww / (d + ww), 1.6) * energy;
    float ends = smoothstep(-uAspect, -uAspect + .7, p.x) * smoothstep(uAspect, uAspect - .7, p.x);
    vec3 c = mix(vec3(.1, .5, .34), vec3(.62, 1.0, .82), .5 + .5 * sin(p.x * .9 - t * .35 + fi));
    if (i == 2 || i == 6) c = mix(c, acc, .8);
    float bright = (1.0 - depth * .7) * (.45 + 1.0 * lvl);
    float hd = p.x - hx;
    float hot = (exp(-hd * hd * 22.0) * 1.6 + (hd < 0.0 ? exp(hd * 2.2) * .45 : 0.0)) * uPulseGlow;
    col += c * (core * 1.25 + halo * .5) * bright * ends * (1.0 + hot * 2.6);
  }
  // Motes drifting up through the dark, a little depth.
  vec2 g = vec2(p.x * 9.0, p.y * 9.0 - t * .25);
  vec2 cell = floor(g), f = fract(g) - .5;
  vec2 o = vec2(hash(cell), hash(cell + 7.0)) - .5;
  float mote = smoothstep(.06, .0, length(f - o * .7)) * step(.82, hash(cell + 3.0));
  col += vec3(.5, 1.0, .8) * mote * .18 * (.6 + .4 * sin(t * 2.0 + hash(cell) * 6.0));
  return col;
}

void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float t = uTime;
  // Degauss: the raster shivers sideways and the colours fringe while the coil rings.
  float shiver = sin(uv.y * 38.0 + t * 42.0) * .012 + sin(uv.y * 7.0 - t * 23.0) * .008;
  vec2 duv = uv + vec2(shiver * uDegauss, 0.0);
  vec2 p = vec2((duv.x * 2.0 - 1.0) * uAspect, duv.y * 2.0 - 1.0);
  vec3 col = ribbons(p, t);
  vec4 title = texture2D(uText, duv);
  col += title.rgb * title.a * .85;
  col += vec3(sin(uv.y * 14.0 + t * 30.0), sin(uv.y * 14.0 + t * 30.0 + 2.1), sin(uv.y * 14.0 + t * 30.0 + 4.2)) * .22 * uDegauss;
  col *= mix(1.0, 1.35, uDegauss);
  // Glass: film grain, a faint line structure, a vignette.
  col += (hash(floor(uv * vec2(900.0, 360.0)) + floor(t * 24.0)) - .5) * .012;
  col *= .96 + .04 * sin(uv.y * 900.0);
  col *= smoothstep(1.4, .3, length((uv - .5) * vec2(1.2, 1.5)));
  // Static before the picture tunes in: noise that scrolls and rolls.
  float n = hash(floor(uv * vec2(420.0, 170.0)) + floor(t * 30.0));
  float roll = smoothstep(.0, .06, abs(fract(uv.y - t * .7) - .5));
  vec3 snow = vec3(n * .85 + .1) * (.6 + .4 * roll);
  col = mix(col * uPicture, snow, uNoise);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

/** Which accent a track plays in. */
export function sceneForTrack(track: number) {
  return track % 3;
}

/** The title card laid over the ribbons: small caps, wide tracking, bottom left. */
export function drawTitle(c: CanvasRenderingContext2D, title: string, artist: string, track: number, tracks: number) {
  const { width: w, height: h } = c.canvas;
  const spaced = c as CanvasRenderingContext2D & { letterSpacing: string };
  c.clearRect(0, 0, w, h);
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(143,245,196,.95)';
  c.font = `600 ${Math.round(h * .085)}px "Arial Narrow", "Tw Cen MT Condensed", Arial, sans-serif`;
  spaced.letterSpacing = `${Math.round(h * .02)}px`;
  c.fillText(title.toUpperCase(), w * .05, h * .87);
  c.fillStyle = 'rgba(143,245,196,.5)';
  c.font = `500 ${Math.round(h * .042)}px "Arial Narrow", Arial, sans-serif`;
  spaced.letterSpacing = `${Math.round(h * .012)}px`;
  c.fillText(`${String(track + 1).padStart(2, '0')} / ${String(tracks).padStart(2, '0')}   ${artist.toUpperCase()}`, w * .05, h * .93);
  c.fillRect(w * .05, h * .77, w * .04, Math.max(1, h * .004));
}
