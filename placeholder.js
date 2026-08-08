/* Pure-Node PNG placeholder generator (no deps).
   Produces a soft pastel gradient with a paler centre blob, so the
   journal's "photos" have a gentle, clearly-placeholder look. */
const zlib = require('zlib');

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

/* Blend two [r,g,b] tuples with t in [0,1]. */
function blend(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgba(rgb) {
  return `rgba(${rgb.map((x) => Math.round(x)).join(',')},1)`;
}

/* Make an RGBA raster: vertical gradient, then a lighter soft blob in the
   middle, then a subtle vignette — nice and "blank card". */
function raster(width, height, top, bottom, blob = 0.16) {
  const px = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height * 0.46;
  const R = Math.min(width, height) * 0.42;
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    let [r, g, b] = blend(top, bottom, t);
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - cx, y - cy) / R;
      let rr = r, gg = g, bb = b;
      if (d < 1) {
        const s = Math.max(0, 1 - d) * blob;
        rr = r + (255 - r) * s;
        gg = g + (255 - g) * s;
        bb = b + (255 - b) * s;
      }
      const edge = Math.min(1, Math.hypot(x - width / 2, y - height / 2) / (Math.hypot(width / 2, height / 2)));
      const v = 1 - edge * edge * 0.12;
      const i = (y * width + x) * 4;
      px[i] = Math.round(rr * v);
      px[i + 1] = Math.round(gg * v);
      px[i + 2] = Math.round(bb * v);
      px[i + 3] = 255;
    }
  }
  return px;
}

function encodePng(width, height, rgbaBuf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 0; // filter: none
    rgbaBuf.copy(raw, row + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* Public: returns a PNG Buffer for the given pastel palette. */
function placeholder(opts = {}) {
  const width = opts.width || 560;
  const height = opts.height || 420;
  const top = opts.top || [245, 214, 220];
  const bottom = opts.bottom || [216, 231, 238];
  const blob = opts.blob != null ? opts.blob : 0.16;
  return encodePng(width, height, raster(width, height, top, bottom, blob));
}

/* A few curated pastel palettes by name. */
const PALETTES = {
  blush: { top: [248, 224, 229], bottom: [224, 239, 245] },
  cream: { top: [252, 238, 219], bottom: [233, 224, 214] },
  mint: { top: [222, 242, 233], bottom: [207, 228, 234] },
  lilac: { top: [235, 226, 246], bottom: [219, 216, 236] },
  sky: { top: [224, 238, 248], bottom: [208, 222, 240] },
  peach: { top: [252, 231, 214], bottom: [243, 218, 224] },
  rose: { top: [246, 219, 227], bottom: [228, 214, 233] },
  sage: { top: [229, 239, 224], bottom: [214, 228, 216] }
};

module.exports = { placeholder, PALETTES };
