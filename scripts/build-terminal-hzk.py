"""Builds the /terminal's Chinese character ROM, like HZK16 under UCDOS.

Every GB2312 character, the full-width forms and CJK punctuation, plus any other
character the terminal's source uses that code page 437 lacks, taken from GNU Unifont
(16 px, SIL OFL 1.1; see public/fonts/unifont/SOURCE.md). Characters code page 437
already has keep their VGA look and are left out.

Output public/terminal/hzk16.bin:
  'HZ16', u32 count, then per character: u16 code point, u8 width in cells (1 or 2),
  then all bitmaps in the same order: 16 rows of `width` bytes, most significant bit left.

Run: python scripts/build-terminal-hzk.py   (fails if the source uses a character Unifont lacks)
"""
import gzip
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEX = ROOT / "public/fonts/unifont/unifont-17.0.05.hex.gz"
OUT = ROOT / "public/terminal/hzk16.bin"
SOURCES = [ROOT / "components/terminal"]
CONTROL = " ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼"
# The terminal maps these to ASCII itself (crt/font.ts), so they need no glyph.
MAPPED = set("‘’“”–—βμ ")


def cp437() -> set[str]:
    chars = list(bytes(range(256)).decode("cp437"))
    chars[:32] = list(CONTROL)
    chars[127] = "⌂"
    return set(chars)


def gb2312() -> set[str]:
    out = set()
    for hi in range(0xA1, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return out


def used_in_source() -> set[str]:
    out = set()
    for root in SOURCES:
        for path in root.rglob("*.ts*"):
            text = path.read_text(encoding="utf8")
            # Escapes such as   in the source count too.
            text += "".join(chr(int(h, 16)) for h in re.findall(r"\\u([0-9a-fA-F]{4})", text))
            out.update(ch for ch in text if ord(ch) > 126)
    return out


def main() -> None:
    glyphs: dict[int, str] = {}
    with gzip.open(HEX, "rt", encoding="ascii") as f:
        for line in f:
            code, bits = line.strip().split(":")
            glyphs[int(code, 16)] = bits
    base = cp437()
    wanted = gb2312() | {chr(c) for c in range(0xFF01, 0xFF5F)} | {chr(c) for c in range(0x3000, 0x3040)}
    source = used_in_source()
    wanted |= source
    wanted -= base | MAPPED
    missing = sorted(ch for ch in source - base - MAPPED if ord(ch) not in glyphs or ord(ch) > 0xFFFF)
    if missing:
        sys.exit("Unifont has no glyph for: " + " ".join(f"{ch} U+{ord(ch):04X}" for ch in missing))
    chars = sorted(ord(ch) for ch in wanted if ord(ch) in glyphs and ord(ch) <= 0xFFFF)
    header, bitmaps = bytearray(b"HZ16" + struct.pack("<I", len(chars))), bytearray()
    for code in chars:
        bits = glyphs[code]
        width = 2 if len(bits) == 64 else 1
        header += struct.pack("<HB", code, width)
        bitmaps += bytes.fromhex(bits)
    OUT.write_bytes(bytes(header + bitmaps))
    wide = sum(1 for c in chars if len(glyphs[c]) == 64)
    print(f"wrote {OUT}: {len(chars)} characters ({wide} wide), {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
