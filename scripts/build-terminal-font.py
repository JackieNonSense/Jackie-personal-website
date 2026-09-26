"""Rasterises the IBM VGA 8x16 webfont into the 1-bit glyph atlas used by /terminal.

Atlas: 16 x 16 cells of 8 x 16 px in code page 437 order. The terminal maps Unicode
to these cells with the same table (components/terminal/crt/font.ts).
Run: python scripts/build-terminal-font.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "public/fonts/oldschool-pc/Web437_IBM_VGA_8x16.woff"
OUT = ROOT / "public/terminal/vga-8x16.png"
CONTROL = " ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼"


def cp437():
    chars = list(bytes(range(256)).decode("cp437"))
    chars[:32] = list(CONTROL)
    chars[127] = "⌂"
    return chars


def main():
    font = ImageFont.truetype(str(FONT), 16)
    atlas = Image.new("L", (16 * 8, 16 * 16), 0)
    draw = ImageDraw.Draw(atlas)
    for i, ch in enumerate(cp437()):
        draw.text(((i % 16) * 8, (i // 16) * 16), ch, font=font, fill=255)
    atlas.point(lambda v: 255 if v >= 128 else 0).save(OUT, optimize=True)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
