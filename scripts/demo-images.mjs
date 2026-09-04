// Draws placeholder product and collection images so a fresh install has something to show
// before real photography arrives. Everything is generated here, with no binary assets in
// the repository and no network access.
import zlib from 'node:zlib';

/* ------------------------------------------------------------------ PNG writer */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, crc]);
}

/** Encodes an RGB pixel buffer (3 bytes per pixel) as a PNG. */
export function encodePng(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // Each scanline is prefixed with its filter type; 0 means "no filtering".
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ drawing */

const mix = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Half-width profile of a vessel at a given height, 0 at the top and 1 at the bottom.
 * Returns a fraction of the drawing width, or 0 where the silhouette has no body.
 */
const SHAPES = {
  tumbler: (t) => (t < 0.06 ? 0 : 0.3 + 0.05 * t),
  mug: (t) => (t < 0.08 ? 0 : 0.29 + 0.03 * Math.sin(t * Math.PI)),
  jar: (t) => {
    if (t < 0.05) return 0;
    if (t < 0.16) return 0.19; // lid
    return 0.31 + 0.05 * Math.sin((t - 0.16) * Math.PI * 1.1);
  },
  bowl: (t) => (t < 0.34 ? 0 : 0.42 * Math.sqrt(Math.max(0, 1 - ((t - 1) / 0.66) ** 2))),
  box: (t) => (t < 0.12 ? 0 : 0.34),
  vase: (t) => {
    if (t < 0.05) return 0;
    if (t < 0.3) return 0.16 + 0.02 * t;
    return 0.17 + 0.24 * smooth((t - 0.3) / 0.5);
  },
  coaster: (t) => (t < 0.62 || t > 0.86 ? 0 : 0.4),
};

const PALETTES = {
  aqua: { bg: [10, 26, 42], glow: [40, 120, 170], glass: [150, 225, 250] },
  azure: { bg: [12, 22, 46], glow: [50, 90, 180], glass: [160, 195, 255] },
  amber: { bg: [30, 22, 14], glow: [150, 105, 45], glass: [255, 215, 160] },
  smoke: { bg: [18, 20, 24], glow: [90, 100, 115], glass: [205, 215, 230] },
  sea: { bg: [10, 32, 32], glow: [40, 140, 125], glass: [165, 240, 225] },
  rose: { bg: [32, 16, 24], glow: [150, 70, 95], glass: [255, 195, 210] },
};

/**
 * Renders one abstract glass object. Supersampled 2x, so the silhouette edges stay smooth.
 */
export function renderGlass({ width, height, shape = 'tumbler', palette = 'aqua', seed = 1 }) {
  const profile = SHAPES[shape] ?? SHAPES.tumbler;
  const colours = PALETTES[palette] ?? PALETTES.aqua;
  const out = Buffer.alloc(width * height * 3);

  const SS = 2;
  const cx = 0.5;
  const drift = ((seed * 37) % 100) / 100;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = (x + (sx + 0.5) / SS) / width;
          const py = (y + (sy + 0.5) / SS) / height;

          // --- studio background: gradient plus a soft light behind the object ---
          const fall = 1 - py * 0.55;
          const halo = Math.exp(-(((px - cx) ** 2) / 0.055 + ((py - 0.42) ** 2) / 0.09));

          let cr = mix(colours.bg[0] * fall, colours.glow[0], halo * 0.75);
          let cg = mix(colours.bg[1] * fall, colours.glow[1], halo * 0.75);
          let cb = mix(colours.bg[2] * fall, colours.glow[2], halo * 0.75);

          // --- the object ---
          const half = profile(py);
          if (half > 0) {
            const dx = Math.abs(px - cx);
            const edge = half - dx;

            if (edge > 0) {
              // Across the body: bright rim, clear centre, bright rim again.
              const across = dx / half;
              const rim = smooth(Math.min(1, Math.max(0, (across - 0.62) / 0.38)));
              const specular = Math.exp(-(((px - (cx - half * 0.42)) ** 2) / 0.0009));
              const depth = 0.32 + 0.3 * (1 - py) + 0.5 * rim + 0.9 * specular;

              const gr = colours.glass[0] * depth;
              const gg = colours.glass[1] * depth;
              const gb = colours.glass[2] * depth;

              // Anti-alias the silhouette edge over roughly one pixel.
              const cover = Math.min(1, edge * width * 0.9);
              const glassMix = 0.82 * cover;

              cr = mix(cr, gr, glassMix);
              cg = mix(cg, gg, glassMix);
              cb = mix(cb, gb, glassMix);
            }
          }

          // --- contact shadow and a faint floor reflection ---
          const floor = Math.exp(-(((px - cx) ** 2) / 0.02 + ((py - 0.965) ** 2) / 0.0006));
          cr = mix(cr, 8, floor * 0.7);
          cg = mix(cg, 12, floor * 0.7);
          cb = mix(cb, 18, floor * 0.7);

          // --- fine grain so the gradients do not band ---
          const grain = (Math.sin((x * 12.9898 + y * 78.233 + drift * 43.7) * 1.7) * 43758.5453) % 1;
          const n = grain * 3.5;

          r += cr + n;
          g += cg + n;
          b += cb + n;
        }
      }

      const samples = SS * SS;
      const i = (y * width + x) * 3;
      out[i] = Math.max(0, Math.min(255, Math.round(r / samples)));
      out[i + 1] = Math.max(0, Math.min(255, Math.round(g / samples)));
      out[i + 2] = Math.max(0, Math.min(255, Math.round(b / samples)));
    }
  }

  return { buffer: encodePng(width, height, out), width, height };
}
