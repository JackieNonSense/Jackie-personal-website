"""Stand-in pictures for LIGHTHOUSE, the story on Jackie's machine.

Drawn from nothing, PC-98 style (four beam levels, ordered dithering), until the
real drawings exist: put those through scripts/build-terminal-picture.py under the
same names instead. Output: public/terminal/pictures/lh-*.png, 640 x 256.

Run: python scripts/build-terminal-story.py
"""
import importlib.util
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/terminal/pictures"
W, H, S = 640, 256, 2  # drawn at twice the size, then reduced

spec = importlib.util.spec_from_file_location("picture", ROOT / "scripts/build-terminal-picture.py")
picture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(picture)


def canvas():
    img = Image.new("L", (W * S, H * S), 0)
    return img, ImageDraw.Draw(img)


def lighten(img, layer):
    """Adds a light layer: the brighter of the two, pixel by pixel."""
    img.paste(Image.fromarray(np.maximum(np.asarray(img), np.asarray(layer))))


def sky(d, rng, horizon):
    # Dark overhead, a glow along the horizon.
    for y in range(horizon):
        t = y / horizon
        d.line([(0, y), (W * S, y)], fill=int(6 + 70 * t ** 3))
    for _ in range(110):
        x, y = rng.randrange(W * S), rng.randrange(int(horizon * 0.7))
        d.point((x, y), fill=rng.randint(90, 210))


def sea(d, rng, horizon, lights=()):
    for y in range(horizon, H * S):
        d.line([(0, y), (W * S, y)], fill=int(34 - 22 * ((y - horizon) / (H * S - horizon))))
    for _ in range(160):
        x, y = rng.randrange(W * S), rng.randrange(horizon + 4, H * S)
        d.line([(x, y), (x + rng.randint(8, 30), y)], fill=rng.randint(30, 60), width=1)
    # Reflections: broken horizontal strokes under each light.
    for (x, strength) in lights:
        for k in range(30):
            yy = horizon + 6 + k * 6 + rng.randint(-2, 2)
            if yy >= H * S:
                break
            w = rng.randint(6, 22) * (1 - k / 34)
            d.line([(x - w, yy), (x + w, yy)], fill=int(strength * (1 - k / 32)), width=2)


def glow(img, x, y, r, level):
    """A soft halo."""
    layer = Image.new("L", img.size, 0)
    ImageDraw.Draw(layer).ellipse([x - r, y - r, x + r, y + r], fill=level)
    lighten(img, layer.filter(ImageFilter.GaussianBlur(r * 0.6)))


def lighthouse(img, x, base, h, beam=None, strength=1.0):
    """A tapering striped tower with a lit lamp room; `beam` is the sweep's angle."""
    w0, w1 = h * 0.13, h * 0.075
    top = base - h
    lamp = (x, top - h * 0.06)
    if beam is not None:
        layer = Image.new("L", img.size, 0)
        ld = ImageDraw.Draw(layer)
        length = W * S * 0.9
        for spread, level in ((0.09, int(60 * strength)), (0.04, int(110 * strength))):
            a0, a1 = beam - spread, beam + spread
            ld.polygon([lamp, (x + math.cos(a0) * length, lamp[1] + math.sin(a0) * length),
                        (x + math.cos(a1) * length, lamp[1] + math.sin(a1) * length)], fill=level)
        lighten(img, layer.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    d.polygon([(x - w0, base), (x + w0, base), (x + w1, top), (x - w1, top)], fill=120)

    def half(y):
        return w0 + (w1 - w0) * (base - y) / h

    for band in (1, 3):
        y0, y1 = base - h * band / 4 - h * 0.06, base - h * band / 4 + h * 0.06
        d.polygon([(x - half(y1), y1), (x + half(y1), y1), (x + half(y0), y0), (x - half(y0), y0)], fill=40)
    d.rectangle([x - w1 * 1.5, top - 3, x + w1 * 1.5, top + 3], fill=60)
    d.rectangle([x - w1 * 1.1, top - h * 0.12, x + w1 * 1.1, top - 3], fill=255)
    d.polygon([(x - w1 * 1.5, top - h * 0.12), (x + w1 * 1.5, top - h * 0.12), (x, top - h * 0.22)], fill=50)
    glow(img, lamp[0], lamp[1], h * 0.16, 200)


def headland(d, x0, x1, top, horizon):
    """A dark cliff rising from the sea to a ragged top."""
    rng = random.Random(int(x0 * 7 + x1))
    pts = [(x0, horizon + 12)]
    steps = 16
    for i in range(steps + 1):
        t = i / steps
        rise = min(1, t * 3.2) if x0 > 0 else 1
        pts.append((x0 + (x1 - x0) * t, horizon - (horizon - top) * rise + rng.randint(-5, 5)))
    pts += [(x1, horizon + 12)]
    d.polygon(pts, fill=9)


def coast(n, seed, beams):
    rng = random.Random(seed)
    img, d = canvas()
    horizon = int(H * S * 0.6)
    sky(d, rng, horizon)
    xs = [W * S * (0.05 + 0.9 * (i + 0.5) / n) + rng.randint(-6, 6) for i in range(n)]
    sea(d, rng, horizon, [(x, 170) for x in xs])
    headland(d, -20, W * S + 20, horizon - 26, horizon)
    for i, x in enumerate(xs):
        angle = (math.pi + rng.uniform(-0.3, 0.25)) if rng.random() < 0.5 else rng.uniform(-0.25, 0.3)
        sweep = angle if beams and i % 3 == 0 else None
        lighthouse(img, x, horizon - 22, rng.randint(80 if beams else 110, 130 if beams else 150), sweep, 0.55)
    return img


def one():
    rng = random.Random(1)
    img, d = canvas()
    horizon = int(H * S * 0.6)
    sky(d, rng, horizon)
    d.ellipse([W * S * 0.14, H * S * 0.14, W * S * 0.14 + 60, H * S * 0.14 + 60], fill=215)
    glow(img, W * S * 0.14 + 30, H * S * 0.14 + 30, 60, 90)
    d = ImageDraw.Draw(img)
    sea(d, rng, horizon, [(W * S * 0.14 + 30, 130), (W * S * 0.72, 180)])
    headland(d, W * S * 0.5, W * S + 20, horizon - 70, horizon)
    lighthouse(img, W * S * 0.72, horizon - 64, 160, math.pi + 0.16)
    return img


def two():
    rng = random.Random(2)
    img, d = canvas()
    horizon = int(H * S * 0.6)
    sky(d, rng, horizon)
    sea(d, rng, horizon, [(W * S * 0.64, 170), (W * S * 0.83, 170)])
    headland(d, W * S * 0.45, W * S + 20, horizon - 70, horizon)
    lighthouse(img, W * S * 0.64, horizon - 64, 155, math.pi + 0.2)
    lighthouse(img, W * S * 0.83, horizon - 60, 155, math.pi - 0.3)
    return img


def window(dark: bool):
    rng = random.Random(3)
    img, d = canvas()
    # Outside, through the window: the night coast, lit from the horizon.
    horizon = int(H * S * 0.58)
    sky(d, rng, horizon)
    sea(d, rng, horizon)
    far = horizon - 6
    if dark:
        for i in range(48):
            x = W * S * (0.3 + 0.68 * (i + 0.5) / 48)
            ImageDraw.Draw(img).rectangle([x - 2, far - 16, x + 2, far], fill=90)
            glow(img, x, far - 20, 9, 230)
    else:
        ImageDraw.Draw(img).rectangle([W * S * 0.78 - 3, far - 26, W * S * 0.78 + 3, far], fill=110)
        glow(img, W * S * 0.78, far - 30, 14, 240)
    d = ImageDraw.Draw(img)
    # The room: a dark wall framing the window, the frame, the sill.
    wall = 4
    wx0, wx1, wy0, wy1 = W * S * 0.22, W * S * 0.96, H * S * 0.08, H * S * 0.74
    d.rectangle([0, 0, W * S, wy0], fill=wall)
    d.rectangle([0, 0, wx0, H * S], fill=wall)
    d.rectangle([wx1, 0, W * S, H * S], fill=wall)
    d.rectangle([wx0 - 6, wy0 - 6, wx1 + 6, wy0 + 4], fill=46)
    d.rectangle([wx0 - 6, wy0, wx0 + 4, wy1], fill=46)
    d.rectangle([wx1 - 4, wy0, wx1 + 6, wy1], fill=46)
    d.rectangle([(wx0 + wx1) / 2 - 4, wy0, (wx0 + wx1) / 2 + 4, wy1], fill=40)
    d.rectangle([0, wy1, W * S, H * S], fill=wall + 4)
    d.rectangle([wx0 - 20, wy1 - 6, wx1 + 20, wy1 + 16], fill=64)
    # The paper on the sill, and the pen.
    paper = [(W * S * 0.52, wy1 - 2), (W * S * 0.74, wy1 - 8), (W * S * 0.76, wy1 + 10), (W * S * 0.53, wy1 + 14)]
    d.polygon(paper, fill=150 if dark else 210)
    if not dark:
        d.line([(W * S * 0.6, wy1 + 2), (W * S * 0.605, wy1 - 6), (W * S * 0.612, wy1 + 2)], fill=60, width=3)
    d.line([(W * S * 0.78, wy1 + 8), (W * S * 0.86, wy1 + 4)], fill=120, width=5)
    # The girl, from behind, black against the window: a bob of hair, shoulders, an arm on the sill.
    cx = W * S * 0.42
    head_y = wy1 - (120 if dark else 170)
    d.polygon([(cx - 150, H * S), (cx - 120, wy1 - 40), (cx - 40, wy1 - 70), (cx + 40, wy1 - 70), (cx + 120, wy1 - 40), (cx + 150, H * S)], fill=0)
    d.rectangle([cx - 22, head_y + 60, cx + 22, wy1 - 60], fill=0)
    d.ellipse([cx - 62, head_y - 64, cx + 62, head_y + 70], fill=0)
    d.polygon([(cx - 66, head_y), (cx - 70, head_y + 78), (cx - 40, head_y + 70)], fill=0)
    d.polygon([(cx + 66, head_y), (cx + 70, head_y + 78), (cx + 40, head_y + 70)], fill=0)
    d.polygon([(cx + 90, wy1 - 50), (cx + 200, wy1 - 16), (cx + 250, wy1 - 4), (cx + 250, wy1 + 12), (cx + 180, wy1 + 10), (cx + 70, wy1 - 20)], fill=0)
    return img


def finish(img, name):
    small = img.filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)
    arr = np.asarray(small, dtype=np.float64)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(picture.dither(np.clip(arr * 1.1, 0, 255))).save(OUT / f"{name}.png", optimize=True)
    print("wrote", OUT / f"{name}.png")


def main():
    finish(one(), "lh-one")
    finish(window(False), "lh-window")
    finish(two(), "lh-two")
    finish(coast(9, 4, False), "lh-many")
    finish(coast(26, 5, True), "lh-coast")
    finish(window(True), "lh-window-dark")


if __name__ == "__main__":
    main()
