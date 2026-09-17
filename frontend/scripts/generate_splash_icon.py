"""
Draws the Nudge splash mark (an alarm clock in the accent blue) as a transparent PNG.

Standard library only, so it runs anywhere:  python frontend/scripts/generate_splash_icon.py
Colors mirror src/theme/colors.ts (accent #60a5fa, background #0b1120).
"""

import math
import struct
import zlib
from pathlib import Path

SIZE = 1024
SUPERSAMPLE = 3  # per axis; smooths the edges
ACCENT = (0x60, 0xA5, 0xFA)
OUT = Path(__file__).resolve().parent.parent / "assets" / "images" / "splash-icon.png"

CENTER = (512.0, 560.0)
FACE_RADIUS = 300.0
STROKE = 44.0


def distance_to_segment(px, py, ax, ay, bx, by):
    abx, aby = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)))
    return math.hypot(px - (ax + t * abx), py - (ay + t * aby))


def covered(x, y):
    cx, cy = CENTER
    r = math.hypot(x - cx, y - cy)

    # Clock face ring
    if abs(r - FACE_RADIUS) <= STROKE / 2:
        return True

    # Hands: hour hand up, minute hand toward 2 o'clock, both with round caps
    if distance_to_segment(x, y, cx, cy, cx, cy - 170) <= STROKE / 2:
        return True
    angle = math.radians(-30)
    if distance_to_segment(x, y, cx, cy, cx + 200 * math.cos(angle), cy + 200 * math.sin(angle)) <= STROKE / 2:
        return True
    if r <= STROKE * 0.75:
        return True

    # Bells: filled caps above the face, tilted outwards
    for side in (-1, 1):
        bx, by = cx + side * 240, cy - 290
        if math.hypot(x - bx, y - by) <= 95 and (y - by) * 1.0 - side * (x - bx) * 0.55 <= 10:
            return True

    # Legs
    for side in (-1, 1):
        if distance_to_segment(x, y, cx + side * 190, cy + 250, cx + side * 260, cy + 340) <= STROKE / 2:
            return True

    return False


def render():
    step = 1.0 / SUPERSAMPLE
    offsets = [(i + 0.5) * step for i in range(SUPERSAMPLE)]
    samples = SUPERSAMPLE * SUPERSAMPLE
    rows = bytearray()
    for y in range(SIZE):
        rows.append(0)  # PNG filter type: none
        for x in range(SIZE):
            hits = sum(covered(x + ox, y + oy) for oy in offsets for ox in offsets)
            alpha = round(255 * hits / samples)
            rows.extend((*ACCENT, alpha))
    return bytes(rows)


def write_png(path, pixels):
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(pixels, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


if __name__ == "__main__":
    write_png(OUT, render())
    print(f"Wrote {OUT}")
