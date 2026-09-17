# 光影与动效技术研究：animejs.com / tools.dverso.io

调研日期：2026-09-17　调研对象：`https://animejs.com/`、`https://tools.dverso.io/bgremove/`

本报告中所有关于这两个站点的技术断言都来自实测（方法见第 0 节），不含凭印象的推测；确实无法确证的地方会标注「推测」。所有示例代码为原创，未复制对方的着色器或资产。

---

## 0. 方法

用 Chrome DevTools Protocol，在**页面自己的脚本执行之前**（`Page.addScriptToEvaluateOnNewDocument`）注入探针，劫持这些入口：

| 劫持点 | 得到什么 |
|---|---|
| `HTMLCanvasElement.prototype.getContext` | 上下文类型 + 创建参数 |
| `WebGL(2)RenderingContext.prototype.shaderSource` | 全部着色器源码 |
| `navigator.gpu.requestAdapter` | 是否真的走 WebGPU |
| `WebAssembly.instantiate(Streaming)` | WASM 模块 |
| `new Worker()` | worker 脚本 URL |
| `EventTarget.prototype.addEventListener` | 交互事件类型与数量 |
| `Network.requestWillBeSent` | 完整资源清单 |

着色器源码只用于**关键词频次统计**，用来判断技术手法。

> 一个方法论教训：第一次跑 dverso 时抓到 **0 个着色器**。不是它没用 WebGL，而是渲染跑在 Worker 里 —— 主线程的 `shaderSource` 根本不会被调用。这个「空结果」本身就是最重要的线索。

---

## 1. animejs.com 实测

| 项目 | 实测值 |
|---|---|
| 渲染库 | Three.js（6 个 ESM chunk 动态载入，无全局 `THREE`） |
| 画布 | **仅一张** `<canvas id="renderer">`，3048×1938（DPR 3），CSS 宽 1016px |
| 上下文 | `webgl2`：`alpha=true, depth=false, antialias=false, premultipliedAlpha=true, powerPreference=high-performance` |
| 着色器 | 6 个，`#version 300 es`，长度 1688 / 6987 / 1880 / 9717 / 19287 / **38541** |
| 模型 | **~20 个 `.glb`**，每个模块一个：timer / animate / easing / draggable / scroll / engine / scope / stagger / spring / svg / timeline / renderer / waapi |
| 环境贴图 | **一个都没有** —— 资源清单里无 `.hdr` / `.exr` / `.ktx` |
| Worker | 4 个 blob worker |
| 驱动 | 滚动（`home.js` 中 `scroll` 出现 41 次） |

着色器关键词频次：

```
specular 44 · roughness 31 · pointLight 20 · fresnel 20 · reflect 19
hash 16 · instance 12 · ambientOcclusion 5 · envMap 5
raymarch / sdf / metaball ── 0
```

### 能学到的三件事

**一、那种质感不需要环境贴图。** 没有 IBL，全部是片元着色器里手写的解析式光照：几个点光源 + 镜面高光 + 菲涅尔边缘 + 一点 AO。很多人以为「高级 = 上 HDR 环境贴图」，这个站点是反例。对你尤其相关 —— 你的 CD 机现在用的是 `envMap` + PMREM（`DeployDeckScene.tsx` 里的 `environment()` 函数），那是另一条路线，成本更高。

**二、`depth=false`。** 关掉深度缓冲，前后关系交给绘制顺序。省一块全屏缓冲和每帧一次清除。适用前提是场景结构你完全可控。

**三、一张画布服务整页。** 20 个模型共用一个 WebGL 上下文，随滚动切换。而不是每个演示区块一个 `<canvas>` —— 后者会迅速撞上浏览器的 WebGL 上下文数量上限（通常 8～16 个），这是很多作品集站点滚到一半 3D 集体变黑的原因。

---

## 2. tools.dverso.io/bgremove 实测

Nuxt（Vue）SPA。**核心架构是两个 Worker，主线程几乎不干重活。**

| Worker | 体积 | 实测指纹 |
|---|---|---|
| `bgrmworker-*.js` | 82 KB | `onnxruntime-web`、`ort-wasm-simd-threaded.jsep`、`wasmPaths`、`webgpu`、**`isnet`** |
| `render-*.js` | **1.9 MB** | `THREE.` ×181、`WebGLRenderer` ×33、`ShaderMaterial` ×16、`OffscreenCanvas` ×12、`createImageBitmap` ×8 |

**抠图**：ONNX Runtime Web 的 **JSEP 构建**（JavaScript Execution Provider，即 WebGPU 后端），失败时回退 WASM SIMD + 多线程。模型是 **IS-Net** —— 也就是 rembg 的 `isnet-general-use` / BRIA RMBG-1.4 那一族。

**渲染**：整个 Three.js 搬进 worker，靠 `canvas.transferControlToOffscreen()` 拿到 OffscreenCanvas，图像跨线程用 `createImageBitmap` 搬运（可转移对象，零拷贝）。主线程只剩 UI 和事件 —— 这就是它能一边跑神经网络推理一边不掉帧的原因。

上下文是 `webgl1`：`alpha=false, depth=false, antialias=false` —— 典型的合成 / 后期管线配置。

### 决定性证据：渲染 worker 的关键词频次

```
lut            280   ←── 比任何一个光照关键词都多
iridescence    166
displacement   159
roughness      136
blur           110
envMap         106
noise           96
normalMap       53
refract         30
Fresnel         21
```

**`lut` 出现 280 次，超过 `roughness`(136)、`envMap`(106) 之和的一半还多。**

这就是本次调研最值钱的一条结论：

> 那种「电影感」很大一部分**不是算出来的，是调出来的**。
> 一次三维查表把普通渲染结果映射成暖调、压暗部、偏色的胶片观感，成本是每像素一次纹理采样 —— 与场景多复杂完全无关。

场景本身是一间日式自助洗衣店（玻璃舱门高光、窗外夕照、地面光斑、格子地砖），配 ogg/mp3 环境音和吉祥物 PNG 精灵序列。氛围里**声音的贡献被严重低估** —— 那几段循环环境音对「沉浸」的作用不比任何一个着色器小，而且几乎不花性能。

---

## 3. 主体：LUT 调色 + 辉光 + 颗粒

### 3.1 3D LUT 到底是什么

把一个像素的 RGB 当作三维坐标，去一张立方体查找表里取值：

```
输入 (r, g, b)  →  当作 [0,1]³ 里的坐标  →  在 N×N×N 的格点上做三线性插值  →  输出 (r', g', b')
```

N 通常是 17 / 33 / 65。33³ = 35937 个格点，RGB 各一个 float，一张表也就一百多 KB，GPU 上就是一张 `sampler3D`。

**为什么它几乎不花钱**：每像素一次三维纹理采样，`O(像素数)`，和场景里有多少三角形、多少光源完全无关。这是所有「视觉性价比」里最高的一档 —— 没有之一。

**它能做什么**：整体色偏、对比曲线、分离色调（暗部偏青、高光偏暖）、褪色胶片感、通道串扰。
**它不能做什么**：任何依赖空间信息的事 —— 模糊、暗角、光晕、任何「这个像素受旁边像素影响」的效果。LUT 是**逐像素无状态**的。

### 3.2 自己做一张 LUT

唯一需要审美的一步，而且可以无限次重来：

1. **拿一张中性（identity）LUT**。可以直接生成 —— 下面是原创的 `.cube` 生成脚本：

   ```js
   // scripts/make-identity-lut.mjs —— 生成一张什么都不改的 33³ .cube
   import { writeFile } from 'node:fs/promises';
   const N = 33;
   const lines = [`TITLE "identity"`, `LUT_3D_SIZE ${N}`, `DOMAIN_MIN 0 0 0`, `DOMAIN_MAX 1 1 1`, ''];
   // .cube 的约定：R 变化最快，B 最慢
   for (let b = 0; b < N; b++)
     for (let g = 0; g < N; g++)
       for (let r = 0; r < N; r++)
         lines.push(`${(r/(N-1)).toFixed(6)} ${(g/(N-1)).toFixed(6)} ${(b/(N-1)).toFixed(6)}`);
   await writeFile('public/luts/identity.cube', lines.join('\n'));
   ```

2. **截一张你的场景图**，和一张中性 LUT 的 **Hald 图**（把立方体摊平成二维 PNG）并排放进同一个 PS / Affinity / DaVinci 工程。
3. **只用调整图层**调色（曲线、色彩平衡、可选颜色…）—— 不能用任何带模糊/空间性的滤镜。
4. 把**完全相同的调整图层**套到 Hald 图上，单独导出它。
5. 把导出的 Hald 转回 `.cube`（或直接当作 LUT 纹理用）。

> 第 3 步那条限制是关键：如果你在 PS 里加了高斯模糊或暗角，那部分**不可能**被烘进 LUT，实机上不会出现。很多人第一次做 LUT 翻车都在这里。

### 3.3 顺序：最容易做错的地方

```
场景渲染（线性 HDR）
  │
  ├─ 辉光 Bloom        ← 必须在线性 HDR 空间。对已经压过的 LDR 做辉光，亮部早被削平了，出不来光晕
  │
  ├─ 色调映射 ACES     ← HDR → 显示空间
  │
  ├─ LUT 调色          ← 必须在色调映射之后。你在 PS 里看到的是显示空间的图，LUT 也必须作用在同一空间才对得上
  │
  ├─ 暗角 Vignette
  │
  └─ 颗粒 Grain        ← 最后一步。放前面会被后续的色调映射和 LUT 磨平
```

**这里有一个你当前代码里就存在的隐患**（见 4.2）：同时设置渲染器级 `gl.toneMapping` **和**使用 `EffectComposer`，色调映射会发生在场景 pass 内部，于是 **Bloom 拿到的是已经压过的 LDR 值**，光晕质量会打折。`postprocessing` 的推荐做法是把 `gl.toneMapping` 设为 `NoToneMapping`，改用 `<ToneMapping>` 效果，让顺序回到上面那张图。

### 3.4 颗粒的分寸

三条经验，违反任何一条都会从「胶片」掉到「脏」：

1. **振幅极小** —— 2～4/255。看上去几乎察觉不到才是对的。
2. **必须逐帧变化** —— 静止的颗粒看起来像镜头脏了，不像胶片。
3. **叠加在亮度上，不是叠加在颜色上** —— 否则会出现彩色噪点。

原创的最小实现（如果内置 `Noise` 效果的表现不满意，可以自己写）：

```glsl
// 片元着色器片段：把颗粒叠在亮度上，并随时间变化
float grainHash(vec2 p, float t) {
  return fract(sin(dot(p + t, vec2(12.9898, 78.233))) * 43758.5453);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float n = grainHash(uv * resolution, time) - 0.5;   // [-0.5, 0.5]
  // 暗部给多一点颗粒，高光少一点 —— 更接近真实胶片的表现
  float luma = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float amount = mix(1.0, 0.35, luma) * intensity;    // intensity ≈ 0.012
  outputColor = vec4(inputColor.rgb + n * amount, inputColor.a);
}
```

### 3.5 成本

每个效果 = 一次全屏 pass。按分辨率线性增长，与场景复杂度无关。实测方法：

```js
// 在浏览器控制台里量单帧 GPU 时间（需要 EXT_disjoint_timer_query_webgl2）
// 更实用的粗测：开关效果，对比 requestAnimationFrame 间隔的 p95
let t = performance.now(), gaps = [];
const tick = () => { const n = performance.now(); gaps.push(n - t); t = n;
  if (gaps.length < 300) requestAnimationFrame(tick);
  else { gaps.sort((a,b)=>a-b); console.log('p50', gaps[150].toFixed(2), 'p95', gaps[285].toFixed(2)); } };
requestAnimationFrame(tick);
```

---

## 4. 落到你的 Terminal

### 4.1 好消息：依赖已经齐了

实测你 `node_modules` 里的版本：

```
three                       0.182.0
postprocessing              6.38.0
@react-three/postprocessing 3.0.4
```

`@react-three/postprocessing` 已导出：**Bloom、ChromaticAberration、EffectComposer、Glitch、LUT、Noise、Pixelation、ToneMapping、Vignette**。
`LUT` 组件签名是 `{ lut: Texture, blendFunction?, tetrahedralInterpolation? }`，内部就是 `postprocessing` 的 `LUT3DEffect`；`.cube` 文件用核心包里的 `LUTCubeLoader` 加载。

**一个包都不用装。**

### 4.2 你的现状

| 位置 | 现有配置 |
|---|---|
| [EchoMachine.tsx:252](../../components/terminal/EchoMachine.tsx) | `<EffectComposer multisampling={0}><Bloom intensity={.095} luminanceThreshold={.87} luminanceSmoothing={.18} mipmapBlur /></EffectComposer>` |
| [EchoMachine.tsx:266](../../components/terminal/EchoMachine.tsx) | `dpr={[1, 1.75]}`，正交相机 |
| [EchoMachine.tsx:270](../../components/terminal/EchoMachine.tsx) | `renderer.toneMapping = ACESFilmicToneMapping; toneMappingExposure = 1.03` |
| [CyanTerminalScene.tsx:114](../../components/terminal/CyanTerminalScene.tsx) | `<Bloom intensity={.18} luminanceThreshold={.62} luminanceSmoothing={.35} mipmapBlur />` |
| [CyanTerminalScene.tsx:118-119](../../components/terminal/CyanTerminalScene.tsx) | `dpr={[1, 1.5]}`，`gl.toneMapping = ACESFilmic; exposure = 1.05` |

**你已经有了 dverso 那套的一半**：辉光 + ACES 色调映射都在。缺的恰好是权重最大的另一半 —— **LUT、颗粒、暗角**。

两处都踩了 3.3 节说的那个顺序问题（渲染器级 toneMapping + EffectComposer 并用）。

### 4.3 建议的管线

```jsx
// 顺序 = JSX 子元素顺序。@react-three/postprocessing 按声明顺序串联。
<EffectComposer multisampling={0}>
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
  <Bloom intensity={.095} luminanceThreshold={.87} luminanceSmoothing={.18} mipmapBlur />
  <LUT lut={lutTexture} tetrahedralInterpolation />
  <Vignette offset={.32} darkness={.55} />
  {!still && <Noise premultiply opacity={.018} />}
</EffectComposer>
```

配套把 `gl.toneMapping` 改成 `THREE.NoToneMapping`（否则会压两次）。

⚠️ Bloom 现在排在 ToneMapping **之后**，与 3.3 节的理想顺序相反 —— 这是 `postprocessing` 的效果合并机制决定的现实取舍。**上线前请用同一帧截图 A/B 对比两种顺序**，挑好看的那个；不要照抄，也不要假设理论顺序一定更好看。

### 4.4 CRT 该配什么调性的 LUT

**不要用现成的「电影 LUT」套餐。** 那些是为实拍素材设计的，套在本来就是纯色发光的 CRT 画面上通常会脏。

你的终端应该自己调，方向：

- **暗部抬起来一点点，并偏青** —— 真实 CRT 的黑不是纯黑，玻璃有环境反光
- **高光偏暖偏白** —— 磷光过曝时会向白色去饱和，而不是一路更绿
- **整体降一点饱和** —— 荧光屏的绿是「亮」不是「艳」，过饱和会立刻变成廉价的赛博朋克感
- **压一点点对比** —— 配合暗角，让四角自然沉下去

### 4.5 必须接上的既有约定

你全站已经有一条 `still` / `prefers-reduced-motion` 通路（`Portfolio.tsx` 里的 `reduced || paused`）。**颗粒是逐帧变化的动态效果，必须能被它关掉** —— 否则违反你自己已经建立的无障碍约定。上面示例里的 `{!still && <Noise …/>}` 就是这个意思。

现有终端测试：`tests/terminal-cyan.test.ts`、`tests/echo-{display,engine,geometry,programs,rewards}.test.ts`。改动前先确认它们有没有断言渲染管线的结构。

> 注：`tests/echo-geometry.test.ts` 目前有一个**已经存在的**失败（与本话题无关的未完成工作），不要误以为是新改动引入的。

---

## 5. anime.js 选型：诚实结论

### 5.1 你现在有什么

```
gsap            3.14.2   （+ @gsap/react 2.1.2）
framer-motion   12.23.26
@react-spring/three 10.0.3
animejs         —— 未安装
```

实测你的 `node_modules/gsap/` 里已包含：**Draggable、Flip、InertiaPlugin、MorphSVGPlugin、ScrollTrigger、SplitText**。

### 5.2 结论：不建议引入

anime.js v4 相对你现有栈的独有价值，逐条核对后基本清零：

| anime.js v4 卖点 | 对你是否成立 |
|---|---|
| 自带免费 `Draggable` | ❌ 你的 GSAP 3.14.2 里 `Draggable` 就在，且已免费 |
| `ScrollObserver` | ❌ `ScrollTrigger` 已有，功能更强 |
| `Timeline` / `Stagger` / `Spring` | ❌ gsap 和 framer-motion 都有 |
| 24.5 KB、完全 tree-shakeable | ⚠️ 真实优势，但你已经付过 gsap 的体积了，再加一个是**净增加** |
| WAAPI 适配器（动画交给合成器线程） | ✅ 这是唯一真正独有的。但 framer-motion 在部分场景也会走 WAAPI |

**再加第四个动画库，对这个项目是负收益**：多一份体积、多一套缓动语义、多一个协调三套时间轴的问题。

### 5.3 真正让网站显得高级的是什么

不是库。是**克制与一致性**。下面这张表比换库实际得多 —— 用你现有的库就能全部做到：

| 场景 | 时长 | 缓动 | 要点 |
|---|---|---|---|
| 悬停反馈 | 80–120ms | `ease-out` | 要快到几乎无感 |
| 按键按下 | 40–60ms | `ease-out` | **非对称**：按下快 |
| 按键回弹 | 120–160ms | `ease-out` | 回弹慢于按下，才有物理感 |
| 元素入场 | 200–300ms | `cubic-bezier(.2,.7,.3,1)` | 配 8–16px 位移，不要更多 |
| 成组入场 | 每项错开 40–70ms | 同上 | 超过 8 项就分组，否则最后一项等太久 |
| 模态 / 面板开合 | 240–320ms | 开 `ease-out`，关 `ease-in` | 开慢关快 |
| 页面级转场 | 300–400ms | `ease-in-out` | 超过 400ms 就开始让人等 |

三条铁律：

1. **全站只用 2～3 条缓动曲线。** 你已经有 `cubic-bezier(.2,.7,.3,1)`（见 `Deck.module.css` 的按键过渡），把它定为标准曲线，别再引入新的。
2. **所有「进入 vs 退出」都要非对称。** 这是最便宜、最见效的一条 —— 你的 CD 机按键已经这么做了（按下 rate 55、回弹 rate 20）。
3. **`prefers-reduced-motion` 是硬约束，不是加分项。** 你已经做到了，保持住。

### 5.4 真想借鉴 animejs.com 的话

值得抄的不是它的库，是它的**工程决策**：

- 一张 WebGL 画布服务整页，随滚动切换内容 —— 而不是每个区块一个上下文
- 光照解析式手写，不上 IBL
- 关掉不需要的缓冲（`depth`、`antialias`、`stencil`）
- 演示用 Canvas2D 就够了，不必什么都上 WebGL（它文档里那 5 张演示图全是 2D 画布）

---

## 6. 一页速查

| 想要的效果 | 实现手段 | 性价比 |
|---|---|---|
| 「电影感 / 高级感」的整体色调 | **3D LUT**（每像素一次三维采样） | ★★★★★ |
| 发光物体的光晕 | Bloom，**必须在线性 HDR 空间** | ★★★★ |
| 胶片质感 | 颗粒，振幅 2–4/255，逐帧变化，叠在亮度上 | ★★★★ |
| 画面向中心收拢 | 暗角，配合 LUT 一起调 | ★★★★ |
| 沉浸氛围 | **循环环境音**（dverso 用了 5 段 ogg） | ★★★★★ |
| 玻璃 / 金属质感 | 菲涅尔 + 镜面高光，解析式即可，不必上 HDR 环境贴图 | ★★★ |
| 一边跑重计算一边不掉帧 | Worker + `transferControlToOffscreen` + `createImageBitmap` | ★★★ |
| 浏览器端 AI 推理 | ONNX Runtime Web（JSEP/WebGPU，回退 WASM SIMD+threads） | ★★ |
| 换动画库 | —— | ☆ |

**如果只做一件事**：做一张自己的 LUT，接进 Terminal。你的辉光和色调映射已经就位，这一步的视觉收益/工作量比是整份报告里最高的。
