#!/usr/bin/env node

// Generates apps/mobile/assets/images/test/calibration.png: a grid + ruler test image at
// 3072x4096 (4096 px long side, the max this app will accept when importing a photo — see
// docs/PRD.md). Used by the camera spike (issue #17) to judge whether an overlay image moves,
// scales or blurs under Skia at the worst-case resolution.
//
// Plain Node + zlib, no dependencies: encodes a minimal 8-bit RGB PNG by hand (IHDR/IDAT/IEND
// with their own CRC32), the same reasoning apps/mobile/app.config.ts uses for not importing
// packages/ui here (this runs outside any bundler). Colours copied from packages/ui/src/primitives.ts.
//
// Run: node apps/mobile/scripts/generate-calibration.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const WIDTH = 3072;
const HEIGHT = 4096;

// Copied from packages/ui/src/primitives.ts (paper, graphite, vermilion, nonPhotoBlue).
const PAPER_BG = hexToRgb("#F4F4EE");
const GRID_FINE = hexToRgb("#AEB0A4"); // paper[400]
const GRID_MAJOR = hexToRgb("#545954"); // paper[600]
const CROSS = hexToRgb("#FF5A1F"); // vermilion[500]
const CORNER = hexToRgb("#1F7FB8"); // nonPhotoBlue[600]
const RULER = hexToRgb("#201F1C"); // graphite[900]

const FINE_STEP = 64;
const MAJOR_STEP = 512;
const CORNER_LEN = 160;
const CORNER_INSET = 48;

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Raw RGB framebuffer, row-major, 3 bytes/px.
const pixels = new Uint8Array(WIDTH * HEIGHT * 3);

function setPixel(x, y, rgb) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  pixels[i] = rgb[0];
  pixels[i + 1] = rgb[1];
  pixels[i + 2] = rgb[2];
}

function fillBackground(rgb) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) setPixel(x, y, rgb);
  }
}

function drawVLine(x, rgb, width = 1) {
  for (let w = 0; w < width; w++) {
    for (let y = 0; y < HEIGHT; y++) setPixel(x + w, y, rgb);
  }
}

function drawHLine(y, rgb, width = 1) {
  for (let w = 0; w < width; w++) {
    for (let x = 0; x < WIDTH; x++) setPixel(x, y + w, rgb);
  }
}

fillBackground(PAPER_BG);

// Fine grid every 64 px, heavier line every 512 px.
for (let x = 0; x <= WIDTH; x += FINE_STEP) {
  drawVLine(x, x % MAJOR_STEP === 0 ? GRID_MAJOR : GRID_FINE, x % MAJOR_STEP === 0 ? 2 : 1);
}
for (let y = 0; y <= HEIGHT; y += FINE_STEP) {
  drawHLine(y, y % MAJOR_STEP === 0 ? GRID_MAJOR : GRID_FINE, y % MAJOR_STEP === 0 ? 2 : 1);
}

// Center cross, 3 px thick, spanning 200 px each side.
const cx = Math.round(WIDTH / 2);
const cy = Math.round(HEIGHT / 2);
for (let d = -200; d <= 200; d++) {
  for (let w = -1; w <= 1; w++) {
    setPixel(cx + d, cy + w, CROSS);
    setPixel(cx + w, cy + d, CROSS);
  }
}

// Corner L marks, inset from each edge, so a crop or rotation shows immediately.
function drawCornerMark(originX, originY, dirX, dirY) {
  for (let i = 0; i < CORNER_LEN; i++) {
    for (let w = -1; w <= 1; w++) {
      setPixel(originX + dirX * i, originY + w, CORNER);
      setPixel(originX + w, originY + dirY * i, CORNER);
    }
  }
}
drawCornerMark(CORNER_INSET, CORNER_INSET, 1, 1);
drawCornerMark(WIDTH - CORNER_INSET, CORNER_INSET, -1, 1);
drawCornerMark(CORNER_INSET, HEIGHT - CORNER_INSET, 1, -1);
drawCornerMark(WIDTH - CORNER_INSET, HEIGHT - CORNER_INSET, -1, -1);

// Ruler ticks along the top and left edges: a short tick every 64 px, a long one every 512 px.
for (let x = 0; x <= WIDTH; x += FINE_STEP) {
  const long = x % MAJOR_STEP === 0;
  for (let y = 0; y < (long ? 24 : 10); y++) setPixel(x, y, RULER);
}
for (let y = 0; y <= HEIGHT; y += FINE_STEP) {
  const long = y % MAJOR_STEP === 0;
  for (let x = 0; x < (long ? 24 : 10); x++) setPixel(x, y, RULER);
}

writeFileSync(outPath(), encodePng(pixels, WIDTH, HEIGHT));
console.log(`Wrote ${outPath()} (${WIDTH}x${HEIGHT})`);

function outPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "assets", "images", "test", "calibration.png");
}

// --- Minimal hand-rolled PNG encoder (8-bit RGB, no interlace) ---

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(rgb, width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // One "none" filter byte (0) per scanline, then its 3*width raw bytes.
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(raw, rowStart + 1);
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
