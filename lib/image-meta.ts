import 'server-only';

export type SniffResult = { ext: 'jpg' | 'png' | 'webp' | 'gif'; mime: string; width: number; height: number };

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

function pngSize(buf: Buffer) {
  // IHDR is always the first chunk: width and height are big-endian uint32 at 16 and 20.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function gifSize(buf: Buffer) {
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function jpegSize(buf: Buffer) {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);

    // SOF0..SOF15, skipping the DHT/JPG/DAC markers that share the range.
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };

    offset += 2 + length;
  }
  return { width: 0, height: 0 };
}

function webpSize(buf: Buffer) {
  const format = buf.toString('ascii', 12, 16);

  if (format === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (format === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === 'VP8X') {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  return { width: 0, height: 0 };
}

/**
 * Identifies an upload from its magic bytes rather than trusting the browser-supplied
 * filename or content-type, and reads its intrinsic size for layout.
 * Returns null for anything that is not a real raster image we accept.
 */
export function sniffImage(buf: Buffer): SniffResult | null {
  if (buf.length < 32) return null;

  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: 'png', mime: 'image/png', ...pngSize(buf) };
  }
  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    return { ext: 'jpg', mime: 'image/jpeg', ...jpegSize(buf) };
  }
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) {
    return { ext: 'gif', mime: 'image/gif', ...gifSize(buf) };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp', ...webpSize(buf) };
  }
  return null;
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Stored filenames are server-generated; this is the gate that keeps path traversal out. */
export const SAFE_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** A 40-megapixel ceiling: enough for any real photograph, small enough to stop a decompression bomb. */
export const MAX_PIXELS = 40_000_000;
