import { COMPOSITE_FS, DOWN_FS, FULLSCREEN_VS, PHOSPHOR_FS, PROBE_FS, UP_FS } from './shaders';
import { RASTER_H, RASTER_W } from './raster';
import { SHELL, beamSpread, type Layout } from './geometry';
import type { Beam } from './power';
import type { Tube } from './themes';

export type Frame = {
  /** Palette indices; see crt/palette.ts. */
  raster: Uint8Array;
  rasterChanged: boolean;
  /** 256 linear RGBA colours, one per index. */
  palette: Float32Array;
  paletteChanged: boolean;
  tube: Tube;
  /** A tube change in progress: how far the picture swims, and how much colour smears. */
  degauss: { wobble: number; purity: number };
  /** Buttons down under the screen (at most two), in pixels of the shell photograph. */
  press: readonly { rect: readonly [number, number, number, number]; depth: number }[];
  beam: Beam;
  time: number;
  dt: number;
  still: boolean;
};

export type CrtRenderer = {
  render(frame: Frame): void;
  /** `layout` is in CSS pixels, as returned by layoutShell. */
  resize(cssWidth: number, cssHeight: number, dpr: number, layout: Layout): void;
  dispose(): void;
};

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Program = { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation> };
type Uniform = number | readonly number[];

/** Backing-store budget: beyond this the canvas renders below device resolution. */
const MAX_PIXELS = 3_700_000;

function compile(gl: WebGL2RenderingContext, fs: string): Program {
  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, FULLSCREEN_VS], [gl.FRAGMENT_SHADER, fs]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
    gl.attachShader(program, shader); gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link');
  const uniforms = new Map<string, WebGLUniformLocation>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(program, i)!.name;
    uniforms.set(name, gl.getUniformLocation(program, name)!);
  }
  return { program, uniforms };
}

async function loadBitmap(url: string, alpha: boolean): Promise<ImageBitmap> {
  const blob = await fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.blob(); });
  return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: alpha ? 'default' : 'none' });
}

export async function createCrtRenderer(canvas: HTMLCanvasElement): Promise<CrtRenderer> {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 unavailable');
  const [photo, normal, occlusion] = await Promise.all([
    loadBitmap(SHELL.photo, true), loadBitmap(SHELL.normal, false), loadBitmap(SHELL.occlusion, false),
  ]);

  const float = !!gl.getExtension('EXT_color_buffer_float');
  const vao = gl.createVertexArray();
  // Everything created here is released on dispose; the context itself survives,
  // because React may mount the same canvas again (Strict Mode does exactly that).
  const owned: { textures: WebGLTexture[]; fbos: WebGLFramebuffer[] } = { textures: [], fbos: [] };

  function texture(w: number, h: number, internal: number, format: number, type: number, filter: number, data: ArrayBufferView | null = null) {
    const tex = gl!.createTexture()!;
    owned.textures.push(tex);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return tex;
  }
  /** A colour buffer: half float where the GPU can render to it, bytes otherwise. */
  function colour(w: number, h: number) {
    return texture(w, h, float ? gl!.RGBA16F : gl!.RGBA8, gl!.RGBA, float ? gl!.HALF_FLOAT : gl!.UNSIGNED_BYTE, gl!.LINEAR);
  }
  function framebuffer(attachments: WebGLTexture[]) {
    const fbo = gl!.createFramebuffer()!;
    owned.fbos.push(fbo);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    attachments.forEach((tex, i) => gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0 + i, gl!.TEXTURE_2D, tex, 0));
    gl!.drawBuffers(attachments.map((_, i) => gl!.COLOR_ATTACHMENT0 + i));
    gl!.clearColor(0, 0, 0, 1); gl!.clear(gl!.COLOR_BUFFER_BIT);
    return fbo;
  }
  function target(w: number, h: number): Target {
    const tex = colour(w, h);
    return { tex, fbo: framebuffer([tex]), w, h };
  }
  function image(bitmap: ImageBitmap, srgb: boolean) {
    const tex = gl!.createTexture()!;
    owned.textures.push(tex);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, srgb ? gl!.SRGB8_ALPHA8 : gl!.RGBA8, gl!.RGBA, gl!.UNSIGNED_BYTE, bitmap);
    if (srgb) gl!.generateMipmap(gl!.TEXTURE_2D);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, srgb ? gl!.LINEAR_MIPMAP_LINEAR : gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    bitmap.close();
    return tex;
  }

  const shellTex = image(photo, true), normalTex = image(normal, false), occlusionTex = image(occlusion, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const rasterTex = texture(RASTER_W, RASTER_H, gl.R8, gl.RED, gl.UNSIGNED_BYTE, gl.NEAREST);
  // Float32 textures only filter with an extension; indices are fetched exactly anyway.
  const paletteTex = texture(256, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
  // The phosphor: fast and slow components ping-pong between frames; `lit` is what it shows.
  const fast = [colour(RASTER_W, RASTER_H), colour(RASTER_W, RASTER_H)];
  const slow = [colour(RASTER_W, RASTER_H), colour(RASTER_W, RASTER_H)];
  const lit = colour(RASTER_W, RASTER_H);
  const phosphor = [0, 1].map(k => ({ fbo: framebuffer([fast[k], slow[k], lit]), w: RASTER_W, h: RASTER_H }));
  const litTarget: Target = { tex: lit, fbo: phosphor[0].fbo, w: RASTER_W, h: RASTER_H };
  const down = [1, 2, 3, 4].map(k => target(RASTER_W >> k, RASTER_H >> k));
  const up = [1, 2, 3].map(k => target(RASTER_W >> k, RASTER_H >> k));
  const probe = target(9, 5);
  gl.bindTexture(gl.TEXTURE_2D, probe.tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  const programs = {
    phosphor: compile(gl, PHOSPHOR_FS), down: compile(gl, DOWN_FS), up: compile(gl, UP_FS),
    probe: compile(gl, PROBE_FS), composite: compile(gl, COMPOSITE_FS),
  };

  let current = 0, frameIndex = 0, flicker = 1;
  let width = 1, height = 1, layout = { scale: 1, x: 0, y: 0 }, spread = 0;

  function bind(p: Program, textures: WebGLTexture[], values: Record<string, Uniform>) {
    gl!.useProgram(p.program);
    textures.forEach((tex, unit) => { gl!.activeTexture(gl!.TEXTURE0 + unit); gl!.bindTexture(gl!.TEXTURE_2D, tex); });
    for (const [name, value] of Object.entries(values)) {
      const loc = p.uniforms.get(name);
      if (!loc) continue;
      if (typeof value === 'number') gl!.uniform1f(loc, value);
      else if (value.length === 2) gl!.uniform2f(loc, value[0], value[1]);
      else if (value.length === 3) gl!.uniform3f(loc, value[0], value[1], value[2]);
      else if (value.length === 4) gl!.uniform4f(loc, value[0], value[1], value[2], value[3]);
    }
  }
  function samplers(p: Program, names: string[]) {
    gl!.useProgram(p.program);
    names.forEach((name, unit) => { const loc = p.uniforms.get(name); if (loc) gl!.uniform1i(loc, unit); });
  }
  samplers(programs.phosphor, ['uRaster', 'uFastPrev', 'uSlowPrev', 'uPalette']);
  samplers(programs.down, ['uSrc']);
  samplers(programs.up, ['uSrc', 'uBase']);
  samplers(programs.probe, ['uSrc']);
  samplers(programs.composite, ['uShell', 'uNormal', 'uOcc', 'uPhos', 'uHalo', 'uNear', 'uProbe']);

  function pass(to: { fbo: WebGLFramebuffer; w: number; h: number } | null) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, to ? to.fbo : null);
    gl!.viewport(0, 0, to ? to.w : width, to ? to.h : height);
    gl!.bindVertexArray(vao);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  return {
    resize(cssWidth, cssHeight, dpr, cssLayout) {
      let ratio = dpr;
      if (cssWidth * cssHeight * ratio * ratio > MAX_PIXELS) ratio = Math.sqrt(MAX_PIXELS / (cssWidth * cssHeight));
      width = Math.max(1, Math.round(cssWidth * ratio)); height = Math.max(1, Math.round(cssHeight * ratio));
      canvas.width = width; canvas.height = height;
      const k = width / cssWidth;
      layout = { scale: cssLayout.scale * k, x: cssLayout.x * k, y: cssLayout.y * k };
      spread = beamSpread(layout.scale);
    },
    render({ raster, rasterChanged, palette, paletteChanged, tube, degauss, press, beam, time, dt, still }) {
      frameIndex++;
      if (rasterChanged) {
        gl.bindTexture(gl.TEXTURE_2D, rasterTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, RASTER_W, RASTER_H, gl.RED, gl.UNSIGNED_BYTE, raster);
      }
      if (paletteChanged || frameIndex === 1) {
        gl.bindTexture(gl.TEXTURE_2D, paletteTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.FLOAT, palette);
      }
      // Mains ripple on the cathode: a small, wandering brightness.
      if (!still) flicker += (1 + (Math.random() - 0.5) * 0.03 - flicker) * 0.35;
      else flicker = 1;

      const next = 1 - current;
      bind(programs.phosphor, [rasterTex, fast[current], slow[current], paletteTex], {
        uDeflect: [beam.sx, beam.sy], uGain: beam.gain * tube.gain, uDt: Math.min(dt, 0.1), uDot: beam.dot,
        uEmit: beam.emitting ? 1 : 0, uBright: beam.brightness, uJitter: still ? 0 : 0.18 + beam.focus * 4, uFrame: frameIndex % 997,
        uFastTau: tube.fastTau, uSlowTau: tube.slowTau, uTail: tube.tail, uDotColor: tube.dot,
      });
      pass(phosphor[next]);
      current = next;

      let src: Target = litTarget;
      down.forEach(to => {
        bind(programs.down, [src.tex], { uTexel: [1 / src.w, 1 / src.h] });
        pass(to); src = to;
      });
      // up[2] (80x50) <- down[3] (40x25) + down[2]; ... up[0] (320x200) holds every scale.
      let lower: Target = down[3];
      for (let i = 2; i >= 0; i--) {
        bind(programs.up, [lower.tex, down[i].tex], { uTexel: [1 / lower.w, 1 / lower.h], uBaseWeight: 1 });
        pass(up[i]); lower = up[i];
      }
      bind(programs.probe, [down[3].tex], {});
      pass(probe);

      // Misconvergence is lost on a display too coarse to show the scanlines anyway.
      const converge = spread > 0 ? 0 : tube.converge;
      bind(programs.composite, [shellTex, normalTex, occlusionTex, lit, up[0].tex, down[2].tex, probe.tex], {
        uResolution: [width, height], uOrigin: [layout.x, layout.y], uScale: layout.scale,
        uTime: time, uFocus: beam.focus + spread, uLineContrast: 1 - spread / 0.3, uEmit: beam.emitting ? beam.brightness : 0,
        uFlicker: flicker, uStill: still ? 1 : 0, uSpill: tube.spill, uAmbient: 0.34, uExposure: 1.55,
        uMono: tube.mono ? 1 : 0, uCore: tube.core, uBaseGlow: tube.baseGlow, uConverge: converge,
        uWobble: degauss.wobble, uPurity: degauss.purity,
        uPressA: press[0]?.rect ?? [0, 0, 1, 1], uDepthA: press[0]?.depth ?? 0,
        uPressB: press[1]?.rect ?? [0, 0, 1, 1], uDepthB: press[1]?.depth ?? 0,
      });
      pass(null);
    },
    dispose() {
      owned.textures.forEach(t => gl.deleteTexture(t));
      owned.fbos.forEach(f => gl.deleteFramebuffer(f));
      Object.values(programs).forEach(p => gl.deleteProgram(p.program));
      gl.deleteVertexArray(vao);
    },
  };
}
