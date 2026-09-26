"""Prepares a picture for the /terminal screen, PC-98 style.

The tube shows four beam levels well (0, 104, 188, 255), so pictures are reduced to
those with 4x4 ordered (Bayer) dithering: the crosshatched look of late-80s Japanese
computer art. Output is an 8-bit greyscale PNG the terminal reads directly.

  python scripts/build-terminal-picture.py INPUT.png NAME [--width 640] [--height 256]
  python scripts/build-terminal-picture.py --placeholder city

Pictures land in public/terminal/pictures/NAME.png. 640 wide fills the screen;
256 high leaves room for the text box of the illustrated story.
"""
import argparse
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/terminal/pictures"
LEVELS = np.array([0, 104, 188, 255], dtype=np.float64)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float64)


def dither(grey: np.ndarray) -> np.ndarray:
    h, w = grey.shape
    threshold = (np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w] + 0.5) / 16
    scaled = grey / 255.0 * (len(LEVELS) - 1)
    low = np.floor(scaled)
    index = np.clip(low + (scaled - low > threshold), 0, len(LEVELS) - 1).astype(int)
    return LEVELS[index].astype(np.uint8)


def prepare(image: Image.Image, width: int, height: int, contrast: float) -> np.ndarray:
    grey = ImageOps.grayscale(image)
    grey = ImageOps.fit(grey, (width, height), Image.LANCZOS)
    grey = ImageOps.autocontrast(grey, cutoff=1)
    arr = np.asarray(grey, dtype=np.float64)
    arr = np.clip((arr - 128) * contrast + 128, 0, 255)
    return dither(arr)


def placeholder(width: int, height: int) -> Image.Image:
    """A city at night, drawn from nothing: stand-in art until the real pictures exist."""
    rng = random.Random(1127)
    img = Image.new("L", (width, height), 0)
    d = ImageDraw.Draw(img)
    for y in range(height):
        d.line([(0, y), (width, y)], fill=int(20 + 70 * (y / height) ** 1.6))
    d.ellipse([width * 0.68, height * 0.1, width * 0.68 + 70, height * 0.1 + 70], fill=210)
    x = 0
    while x < width:
        w = rng.randint(28, 70)
        top = rng.randint(int(height * 0.25), int(height * 0.7))
        d.rectangle([x, top, x + w, height], fill=rng.randint(8, 30))
        for wy in range(top + 8, height - 6, 12):
            for wx in range(x + 5, x + w - 6, 10):
                if rng.random() < 0.18:
                    d.rectangle([wx, wy, wx + 3, wy + 4], fill=rng.randint(120, 230))
        x += w + rng.randint(0, 6)
    return img.filter(ImageFilter.GaussianBlur(0.6))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="?")
    ap.add_argument("name", nargs="?")
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=256)
    ap.add_argument("--contrast", type=float, default=1.1)
    ap.add_argument("--placeholder", metavar="NAME")
    args = ap.parse_args()
    if args.placeholder:
        image, name = placeholder(args.width, args.height), args.placeholder
    else:
        if not args.input or not args.name:
            ap.error("INPUT and NAME are required unless --placeholder is given")
        image, name = Image.open(args.input), args.name
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{name}.png"
    Image.fromarray(prepare(image, args.width, args.height, args.contrast)).save(out, optimize=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
