export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

/** The reference customers quote, shown as #1, #2 and so on. */
export function formatItemId(itemId: number): string {
  return `#${itemId}`;
}

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };

export function formatPrice(price: number | null | undefined, currency = 'INR'): string | null {
  if (price === null || price === undefined || Number.isNaN(price)) return null;
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  const body = price % 1 === 0 ? price.toLocaleString('en-IN') : price.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  return `${symbol}${body}`;
}

// Keeps a masonry grid from being wrecked by one very tall or very wide photo.
export function clampRatio(width: number, height: number): number {
  if (!width || !height) return 1;
  return Math.min(1.35, Math.max(0.72, width / height));
}

/** Every filled catalogue tile uses this ratio, so a gallery row never looks ragged. */
export const TILE_RATIO = 0.8; // 4:5 portrait

/**
 * No image, whatever ratio it is cropped or shown at, is ever allowed to render outside
 * this range on the public site. Without a bound a very wide or very tall source photo
 * would make its tile balloon or shrink in a grid; a bounded box plus letterboxing (for an
 * uncropped "Original" photo) keeps every gallery row even.
 */
export const MIN_DISPLAY_RATIO = 0.55; // tallest allowed box, roughly 5:9
export const MAX_DISPLAY_RATIO = 1.9; // widest allowed box, roughly 19:10

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type FitRatioKey = 'original' | 'square' | 'portrait' | 'tall' | 'landscape' | 'wide' | 'story';

/**
 * The choices offered when an image is set to Fit. "Original" keeps the photo's own shape
 * (bounded on display, see MIN/MAX_DISPLAY_RATIO); every other option crops to a fixed,
 * predictable shape the way Fill does, just at a different ratio.
 */
export const FIT_RATIOS: { key: FitRatioKey; label: string; ratio: number | null }[] = [
  { key: 'original', label: 'Original', ratio: null },
  { key: 'square', label: 'Square', ratio: 1 },
  { key: 'portrait', label: 'Portrait', ratio: 4 / 5 },
  { key: 'tall', label: 'Tall', ratio: 3 / 4 },
  { key: 'landscape', label: 'Landscape', ratio: 4 / 3 },
  { key: 'wide', label: 'Wide', ratio: 16 / 9 },
  { key: 'story', label: 'Story', ratio: 9 / 16 },
];

type Croppable = {
  width?: number;
  height?: number;
  crop_x?: number;
  crop_y?: number;
  crop_w?: number;
  crop_h?: number;
  fit_mode?: string;
};

/** The largest rectangle of the given ratio that fits inside the image, centred. */
export function defaultCrop(width: number, height: number, ratio = TILE_RATIO) {
  if (!width || !height) return { crop_x: 0, crop_y: 0, crop_w: 1, crop_h: 1 };

  const imageRatio = width / height;

  if (imageRatio > ratio) {
    // Source is wider than the tile: take a full-height slice.
    const w = ratio / imageRatio;
    return { crop_x: (1 - w) / 2, crop_y: 0, crop_w: w, crop_h: 1 };
  }

  const h = imageRatio / ratio;
  return { crop_x: 0, crop_y: (1 - h) / 2, crop_w: 1, crop_h: h };
}

/** True once nothing has been cropped away: the whole photograph is being shown. */
export function isUncropped(image: Croppable): boolean {
  return (Number(image.crop_w) || 1) >= 0.999 && (Number(image.crop_h) || 1) >= 0.999;
}

/**
 * The box ratio a tile should take for this image. Fill and a ratio-locked Fit both crop
 * the source to a known shape, so the box simply matches that crop. An uncropped "Original"
 * Fit keeps the photo's own shape, clamped so an extreme photo cannot blow the grid apart.
 */
export function displayRatio(image: Croppable): number {
  const width = Number(image.width) || 0;
  const height = Number(image.height) || 0;
  if (!width || !height) return TILE_RATIO;

  const cw = clamp(Number(image.crop_w) || 1, 0.02, 1);
  const ch = clamp(Number(image.crop_h) || 1, 0.02, 1);
  const raw = (width * cw) / (height * ch);

  if (image.fit_mode === 'fit' && isUncropped(image)) {
    return clamp(raw, MIN_DISPLAY_RATIO, MAX_DISPLAY_RATIO);
  }
  return raw;
}

/**
 * Geometry that places the source image inside a crop viewport. The wrapper is sized so
 * the chosen rectangle exactly fills it, which keeps the picture undistorted.
 */
export function cropStyle(image: Croppable) {
  const x = Math.min(1, Math.max(0, Number(image.crop_x) || 0));
  const y = Math.min(1, Math.max(0, Number(image.crop_y) || 0));
  const w = Math.min(1, Math.max(0.02, Number(image.crop_w) || 1));
  const h = Math.min(1, Math.max(0.02, Number(image.crop_h) || 1));

  return {
    position: 'absolute' as const,
    width: `${100 / w}%`,
    height: `${100 / h}%`,
    left: `${(-x * 100) / w}%`,
    top: `${(-y * 100) / h}%`,
  };
}

export function mediaUrl(file: string): string {
  return `/api/media/${encodeURIComponent(file)}`;
}
