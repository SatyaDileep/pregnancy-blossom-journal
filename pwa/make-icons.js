/* Generates the PWA app icons: blush pastel gradient + a soft white heart.
   Pure Node (zlib only) — no dependencies.
   Usage: node make-icons.js   (writes icons/icon-180.png, icon-192.png, icon-512.png) */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

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

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function blend(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/* Classic heart implicit curve: (u^2 + v^2 - 1)^3 - u^2 v^3 <= 0 */
function inHeart(u, v) {
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}

function makeIcon(size, top, bottom) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size * 0.54;
  const R = size * 0.40;
  const WHITE = [255, 250, 244];
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const base = blend(top, bottom, t);
    for (let x = 0; x < size; x++) {
      let [r, g, b] = base;
      // heart, soft-edged: blend toward white by proximity inside the curve
      const u = (x - cx) / R;
      const v = -(y - cy) / R;
      if (inHeart(u, v)) {
        const d = Math.abs(u * u + v * v - 1);
        const soft = Math.max(0, Math.min(1, 1 - d * 2.2));
        const k = 0.55 + 0.45 * soft;
        [r, g, b] = blend([r, g, b], WHITE, k);
      }
      // gentle vignette
      const edge = Math.hypot(x - cx, y - cy) / (size / 2);
      const vg = 1 - edge * edge * 0.10;
      const i = (y * size + x) * 4;
      px[i] = Math.round(r * vg);
      px[i + 1] = Math.round(g * vg);
      px[i + 2] = Math.round(b * vg);
      px[i + 3] = 255;
    }
  }
  return encodePng(size, size, px);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BLUSH = { top: [248, 224, 229], bottom: [224, 239, 245] };
const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

const icons = [
  { file: 'icon-180.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 }
];
for (const { file, size } of icons) {
  fs.writeFileSync(path.join(outDir, file), makeIcon(size, BLUSH.top, BLUSH.bottom));
  console.log('wrote', file);
}
