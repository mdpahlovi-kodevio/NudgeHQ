// scripts/make-icons.js
// Generates the two PWA icons for NudgeHQ:
//   public/icon-192.png  (192×192)
//   public/icon-512.png  (512×512)
//
// Design: navy #3B58A8 full-bleed background, white "NH" wordmark centred.
// No external dependencies — uses only Node's built-in `zlib` and `fs`.
//
// PWA maskable-icon best practice: keep the background full bleed and
// place the foreground inside the inner ~66% safe zone. The launcher
// (Android Adaptive Icons, iOS rounded-square mask, etc.) handles the
// rounding/masking from there.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ── Brand colours ────────────────────────────────────────────────────────────
const NAVY = [0x3b, 0x58, 0xa8, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];
const SAFE_ZONE = 0.66; // foreground fits inside this fraction of the icon

// ── 5×7 bitmap font (only the glyphs we need) ────────────────────────────────
// Each glyph is an array of 7 strings, 5 chars wide. '#' = pixel on.
// N's diagonal runs top-right → bottom-left (col decreases as row increases):
//   row 2 col 4 → row 3 col 3 → row 4 col 2 → row 5 col 1.
// H is two verticals joined by a single horizontal bar at row 3.
const FONT = {
    N: [
        "#...#",
        "#...#",
        "#...#",
        "#..##",
        "#.#.#",
        "##..#",
        "#...#",
    ],
    H: [
        "#...#",
        "#...#",
        "#...#",
        "#####",
        "#...#",
        "#...#",
        "#...#",
    ],
};

// ── PNG writer ───────────────────────────────────────────────────────────────
function u32be(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n >>> 0, 0);
    return b;
}

function chunk(type, data) {
    const len = u32be(data.length);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = u32be(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crc]);
}

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function encodePng(width, height, rgba) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // colour type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    // Prepend a 0 (no-filter) byte to every scanline, then deflate.
    const rowSize = width * 4;
    const raw = Buffer.alloc((rowSize + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (rowSize + 1)] = 0;
        rgba.copy(raw, y * (rowSize + 1) + 1, y * rowSize, y * rowSize + rowSize);
    }
    const idatData = zlib.deflateSync(raw, { level: 9 });

    return Buffer.concat([
        sig,
        chunk("IHDR", ihdr),
        chunk("IDAT", idatData),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

// ── Renderer ─────────────────────────────────────────────────────────────────
function renderIcon(size) {
    const px = Buffer.alloc(size * size * 4);

    // 1. Paint full-bleed navy background.
    for (let i = 0; i < size * size; i++) {
        px[i * 4] = NAVY[0];
        px[i * 4 + 1] = NAVY[1];
        px[i * 4 + 2] = NAVY[2];
        px[i * 4 + 3] = NAVY[3];
    }

    // 2. Lay out the "NH" wordmark inside the safe zone.
    const glyphW = 5;
    const glyphH = 7;
    const gapCols = 1; // gap between the two letters (in font pixels)

    // We want NH to fit within SAFE_ZONE of `size`. Pick the largest
    // integer scale `s` such that:
    //   width  = (2*glyphW + gapCols) * s  <=  size * SAFE_ZONE
    //   height = glyphH * s                 <=  size * SAFE_ZONE
    const maxByW = Math.floor((size * SAFE_ZONE) / (2 * glyphW + gapCols));
    const maxByH = Math.floor((size * SAFE_ZONE) / glyphH);
    const s = Math.max(1, Math.min(maxByW, maxByH));

    const wordW = (2 * glyphW + gapCols) * s;
    const wordH = glyphH * s;
    const offsetX = Math.round((size - wordW) / 2);
    const offsetY = Math.round((size - wordH) / 2);

    const letters = ["N", "H"];
    for (let li = 0; li < letters.length; li++) {
        const g = FONT[letters[li]];
        const letterOffsetX = offsetX + li * (glyphW + gapCols) * s;
        for (let gy = 0; gy < glyphH; gy++) {
            for (let gx = 0; gx < glyphW; gx++) {
                if (g[gy][gx] !== "#") continue;
                // Fill the s×s block for this font pixel.
                for (let dy = 0; dy < s; dy++) {
                    for (let dx = 0; dx < s; dx++) {
                        const x = letterOffsetX + gx * s + dx;
                        const y = offsetY + gy * s + dy;
                        if (x < 0 || x >= size || y < 0 || y >= size) continue;
                        const i = (y * size + x) * 4;
                        px[i] = WHITE[0];
                        px[i + 1] = WHITE[1];
                        px[i + 2] = WHITE[2];
                        px[i + 3] = WHITE[3];
                    }
                }
            }
        }
    }

    return encodePng(size, size, px);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const outDir = path.resolve(__dirname, "..", "public");
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
    const buf = renderIcon(size);
    const out = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(out, buf);
    console.log(`wrote ${out} (${buf.length} bytes, ${size}×${size})`);
}
