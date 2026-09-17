# 首屏 00 / 第二轮：姓名与纸张静态对照

2026-09-05。状态：本地浏览器预览已实现；不是完整首屏，不是线上发布。

## 在哪里看

本地入口现已统一为：<http://localhost:3011/>。开发模式的根首页直接显示新预览，无需输入子路径。

原对照路径 `/design/hero-00` 仍可访问。此次根据用户要求切换了本地根首页；下文“不修改原首页”的说明仅描述最初第二轮交付，现已由此入口调整取代。monitor 和线上网站没有改动。

此页面只在开发模式提供，声明了 noindex；生产模式下路由调用 `notFound()`。本轮没有执行生产部署。

如果开发服务已关闭，在项目根目录运行：

```powershell
npm run dev
```

不使用 3000。`dev` 与 `start` 的默认端口均已统一为 3011；新预览仅在开发模式显示。如另一 Next 开发实例已持有 `.next` 锁，先确认它的用途，不要强制杀进程。

## 本轮实际完成

- 独立预览路由和局部 CSS Module，不修改原首页、全局样式或 monitor。
- 材料图与姓名图层独立组合。默认不加载完整概念图。
- A：独立固定姓名图形；B：Six Caps；C：League Gothic。
- 可以隐藏材料、姓名和小字；可以切换原图、调整原图叠加透明度。
- 小字只是排版定位，不伪装成可用的 Work/About/Contact 链接。
- 本轮明确保持静态，没有 Three.js、音频或拖动反馈。

## 字形选择：观察与取舍

| 候选 | 当前观察 | 限制 |
| --- | --- | --- |
| A / 图形姓名 | 更接近原图的轮廓、断裂和蓝色墨迹，作为当前默认候选 | 是生成编辑后的图形，不是矢量字形或字体；纹理较原图更粗，局部呈线状，需要后续校准 |
| B / Six Caps | 原生窄体，Y、U、A 的字面可以独立比较 | 与原图字形不相同；此视图未加侵蚀材质，不能拿干净字面对照成品材质后宣称字体本身失败 |
| C / League Gothic | 原生宽度轴设为 75，笔画与 U 的形状和 B 有明显差异 | 同样不等于原图字体，未完成材料处理 |

A 是还原原有姓名艺术效果的候选，B/C 用来检验可排字方案的字形差异；三者不是已经完成相同材质处理的公平风格投票。本轮不声称识别出了概念图字体。

对照字体没有使用 CSS 横向压缩。浏览器测试按实际字面检查下排姓名是否侵入纸张开口，而不仅检查 DOM 是否存在。首次截图发现位置问题后，已调整字号和基线并复测。

## A 的资产合同

- [姓名图形](../../app/reference/production/hero-00/name-lettering-v01.png)，1586 × 992。
- [完整生成提示词](../../app/reference/production/hero-00/name-lettering-v01.prompt.txt)。
- 使用内置 `image_gen`，编辑对象为已认可的 section-00 概念图。
- 输出采用不透明纯黑底，浏览器使用 `mix-blend-mode: screen` 滤色合成；不是透明 PNG。
- 纸张来自前一轮独立材料板，小字来自独立 HTML 元素。不是把原概念图铺在底下冒充实现。
- 两排姓名暂时共用一个图形文件；如果以后要分别运动，需要单独裁切/遮罩或另制图层。
- 该分辨率用于当前参考尺寸检验，不证明高像素密度大屏表现。
- 原稿保存在 reference/production，预览用副本放在 public/proof；没有替换原图或原页面资产。

## 字体来源与许可

直接下载自 Google Fonts 官方仓库，未修改字体文件。完整许可证与字体一同保存在 `public/proof/hero-00/fonts/`。

- Six Caps：[元数据](https://raw.githubusercontent.com/google/fonts/main/ofl/sixcaps/METADATA.pb)、[原始字体](https://raw.githubusercontent.com/google/fonts/main/ofl/sixcaps/SixCaps.ttf)、[OFL 许可证](https://raw.githubusercontent.com/google/fonts/main/ofl/sixcaps/OFL.txt)。
- League Gothic：[元数据](https://raw.githubusercontent.com/google/fonts/main/ofl/leaguegothic/METADATA.pb)、[原始字体](https://raw.githubusercontent.com/google/fonts/main/ofl/leaguegothic/LeagueGothic%5Bwdth%5D.ttf)、[OFL 许可证](https://raw.githubusercontent.com/google/fonts/main/ofl/leaguegothic/OFL.txt)。

## 浏览器证据

截图由独立 Chrome 实例加载实际 Next 页面后生成，不是图片生成的网页示意。

- [默认组合](../../app/reference/production/hero-00/browser-proof-02/01-artwork-composition.png)。
- [Six Caps 对照](../../app/reference/production/hero-00/browser-proof-02/02-six-caps.png)。
- [League Gothic 对照](../../app/reference/production/hero-00/browser-proof-02/03-league-gothic.png)。
- [窄屏预览](../../app/reference/production/hero-00/browser-proof-02/04-mobile-review.png)。
- [检查数据](../../app/reference/production/hero-00/browser-proof-02/checks.json)。

窄屏只检验预览工具不横向溢出、控件可用；画板缩小不等于手机首页设计已完成。

## 验证与未完成项

- `npm test -- tests/`：19 项项目测试通过，包含 7 项新增对照页测试。
- 新增 TSX/测试/浏览器脚本的 ESLint 检查通过。
- `tsc --noEmit` 通过。
- 真实浏览器：图层图片加载、字体加载、鼠标切换、原图切换、叠加归零、字面位置和窄屏无横向溢出；检查脚本记录未捕获异常。
- 浏览器配置从项目移至专用临时目录，避免扩展缓存被项目扫描；没有移动用户日常浏览器资料。
- 开发服务仍有既有 baseline-browser-mapping 数据过期警告，没有为隐藏警告更新依赖。
- 尚未实现绿色信号、蓝色纸面信息、最终微型字体、真实导航、拖动回报、手机构图和生产构建验收。

下一轮应在这个独立预览里制作信号层，并保留材料/姓名切换和对照能力。不要在静态目标未确认时扩大到其他 section。
