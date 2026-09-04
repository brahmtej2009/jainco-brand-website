'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Check, Crop, Maximize2, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  FIT_RATIOS,
  MAX_DISPLAY_RATIO,
  MIN_DISPLAY_RATIO,
  TILE_RATIO,
  defaultCrop,
  isUncropped,
  mediaUrl,
} from '@/lib/utils';
import type { EditableImage } from './ImageManager';

const MIN_CROP = 0.12;

/** The ratio currently governing the crop square: Fill is always the tile shape. */
function activeRatioFor(image: EditableImage): number | null {
  if (image.fit_mode === 'fill') return TILE_RATIO;
  if (isUncropped(image)) return null; // Original: no crop at all
  if (!image.width || !image.height) return null;
  return (image.width * image.crop_w) / (image.height * image.crop_h);
}

/**
 * Crop and sizing, in one panel. Fill always crops to the catalogue's standard tile shape.
 * Fit offers a choice: lock the crop to a preset shape (still a real crop, just a different
 * one), or keep the photograph's own shape as "Original", bounded on display so an
 * extreme photo can never balloon or shrink its tile in a grid.
 */
export default function ImageCropper({
  image,
  open,
  onClose,
  onChange,
}: {
  image: EditableImage | null;
  open: boolean;
  onClose: () => void;
  onChange: (next: EditableImage) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; crop: EditableImage } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Only computed while open, but hooks must run every render regardless.
  const naturalRatio = image?.width && image.height ? image.width / image.height : 1;
  const activeRatio = useMemo(() => (image ? activeRatioFor(image) : null), [image]);

  if (!mounted || !open || !image) return null;

  const fill = image.fit_mode === 'fill';
  const original = activeRatio === null;

  // Height of the crop, as a fraction of the image, for a given width fraction.
  const heightFor = (widthFraction: number, ratio: number) => (widthFraction * naturalRatio) / ratio;

  function commit(next: Partial<EditableImage>) {
    onChange({ ...(image as EditableImage), ...next });
  }

  function chooseFill() {
    commit({ fit_mode: 'fill', ...defaultCrop(image!.width, image!.height, TILE_RATIO) });
  }

  function chooseFitRatio(ratio: number | null) {
    if (ratio === null) {
      // Original: show the whole photograph, nothing cropped away.
      commit({ fit_mode: 'fit', crop_x: 0, crop_y: 0, crop_w: 1, crop_h: 1 });
      return;
    }
    commit({ fit_mode: 'fit', ...defaultCrop(image!.width, image!.height, ratio) });
  }

  function beginMove(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    drag.current = { mode: 'move', startX: event.clientX, startY: event.clientY, crop: { ...(image as EditableImage) } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function beginResize(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    drag.current = { mode: 'resize', startX: event.clientX, startY: event.clientY, crop: { ...(image as EditableImage) } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLElement>) {
    const state = drag.current;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!state || !stage || activeRatio === null) return;

    const dx = (event.clientX - state.startX) / stage.width;
    const dy = (event.clientY - state.startY) / stage.height;

    if (state.mode === 'move') {
      commit({
        crop_x: clamp(state.crop.crop_x + dx, 0, 1 - state.crop.crop_w),
        crop_y: clamp(state.crop.crop_y + dy, 0, 1 - state.crop.crop_h),
      });
      return;
    }

    // Resizing from the bottom-right corner, with the ratio held.
    const maxHeightAsWidth = ((1 - state.crop.crop_y) * activeRatio) / naturalRatio;
    const maxWidth = Math.min(1 - state.crop.crop_x, maxHeightAsWidth);
    const width = clamp(state.crop.crop_w + dx, MIN_CROP, Math.max(MIN_CROP, maxWidth));

    commit({ crop_w: width, crop_h: heightFor(width, activeRatio) });
  }

  function end(event: PointerEvent<HTMLElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const stageBoxRatio = original ? clamp(naturalRatio, MIN_DISPLAY_RATIO, MAX_DISPLAY_RATIO) : activeRatio ?? TILE_RATIO;

  const panel = (
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/*
        Solid backgrounds throughout, with hard hex fallbacks alongside the CSS variables:
        this dialog is portaled onto document.body, outside the admin theme's own wrapper,
        so it cannot depend on a variable that wrapper happens to define.
      */}
      <div
        className="relative flex max-h-[94svh] w-full max-w-6xl flex-col overflow-hidden rounded-[10px] border lg:flex-row"
        style={{ background: 'var(--a-surface, #121a25)', borderColor: 'var(--a-line, #26313f)' }}
        role="dialog"
        aria-modal
        aria-label="Crop and size image"
      >
        {/* ---------------- the picture, at full size on the left ---------------- */}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
          {original ? (
            <div
              className="relative w-full"
              style={{ aspectRatio: stageBoxRatio, maxHeight: '78svh', maxWidth: `calc(78svh * ${stageBoxRatio})` }}
            >
              <Image src={mediaUrl(image.file)} alt="" fill sizes="900px" className="object-contain" />
            </div>
          ) : (
            <div
              ref={stageRef}
              className="relative select-none"
              style={{
                aspectRatio: naturalRatio,
                width: `min(calc(78svh * ${naturalRatio}), 100%)`,
                maxHeight: '78svh',
              }}
            >
              <Image
                src={mediaUrl(image.file)}
                alt=""
                fill
                sizes="900px"
                draggable={false}
                className="object-fill opacity-45"
              />

              {/* The part that will actually be shown, at full brightness. */}
              <div
                className="absolute overflow-hidden"
                style={{
                  left: `${image.crop_x * 100}%`,
                  top: `${image.crop_y * 100}%`,
                  width: `${image.crop_w * 100}%`,
                  height: `${image.crop_h * 100}%`,
                  cursor: 'grab',
                  boxShadow: '0 0 0 2px #4aa8ff, 0 0 0 9999px rgba(0,0,0,0.5)',
                  touchAction: 'none',
                }}
                onPointerDown={beginMove}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              >
                <div
                  className="absolute"
                  style={{
                    left: `${(-image.crop_x / image.crop_w) * 100}%`,
                    top: `${(-image.crop_y / image.crop_h) * 100}%`,
                    width: `${100 / image.crop_w}%`,
                    height: `${100 / image.crop_h}%`,
                  }}
                >
                  <Image
                    src={mediaUrl(image.file)}
                    alt=""
                    fill
                    sizes="900px"
                    draggable={false}
                    className="object-fill"
                  />
                </div>

                {/* Rule-of-thirds guides */}
                <span className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/25" />
                <span className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/25" />
                <span className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/25" />
                <span className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/25" />
              </div>

              {/* Corner grip, sitting on the crop's bottom-right */}
              <button
                type="button"
                aria-label="Resize the crop"
                className="absolute z-10 h-6 w-6 rounded-sm border-2 border-white bg-[#4aa8ff]"
                style={{
                  left: `calc(${(image.crop_x + image.crop_w) * 100}% - 12px)`,
                  top: `calc(${(image.crop_y + image.crop_h) * 100}% - 12px)`,
                  cursor: 'nwse-resize',
                  touchAction: 'none',
                }}
                onPointerDown={beginResize}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              />
            </div>
          )}
        </div>

        {/* ---------------- controls: same solid surface, explicitly ---------------- */}
        <div
          className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-t p-5 lg:w-80 lg:border-l lg:border-t-0"
          style={{
            background: 'var(--a-surface, #121a25)',
            borderColor: 'var(--a-line, #26313f)',
            color: 'var(--a-text, #e8eef6)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[0.95rem] font-semibold">Crop &amp; size</h2>
              <p className="mt-1 text-[0.78rem]" style={{ color: 'var(--a-muted, #9aa9bb)' }}>
                {original
                  ? 'Showing the whole photograph. Its display size is kept within a bounded range so it never looks oversized or tiny in the gallery.'
                  : 'Drag the bright square to choose what shows. Drag its corner to resize; the shape stays locked.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="a-btn a-btn-quiet !px-1.5 !py-1"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* ---- Fill / Fit: the only place this choice lives ---- */}
          <div>
            <span className="a-label">Sizing</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={chooseFill}
                className="a-btn flex-1"
                style={
                  fill
                    ? { background: 'var(--a-accent, #4aa8ff)', borderColor: 'var(--a-accent, #4aa8ff)', color: '#04101c', fontWeight: 600 }
                    : undefined
                }
                aria-pressed={fill}
              >
                <Crop size={14} />
                Fill
              </button>
              <button
                type="button"
                onClick={() => fill && chooseFitRatio(null)}
                className="a-btn flex-1"
                style={
                  !fill
                    ? { background: 'var(--a-accent, #4aa8ff)', borderColor: 'var(--a-accent, #4aa8ff)', color: '#04101c', fontWeight: 600 }
                    : undefined
                }
                aria-pressed={!fill}
              >
                <Maximize2 size={14} />
                Fit
              </button>
            </div>
            <p className="mt-2 text-[0.72rem]" style={{ color: 'var(--a-faint, #6c7b8d)' }}>
              Fill crops the picture into the gallery tile. Fit keeps the picture&rsquo;s own shape, to a
              ratio you choose below.
            </p>
          </div>

          {/* ---- Fit: pick the shape to crop to (or keep the original) ---- */}
          {!fill && (
            <div>
              <span className="a-label">Shape</span>
              <div className="grid grid-cols-2 gap-1.5">
                {FIT_RATIOS.map((preset) => {
                  const isActive =
                    preset.ratio === null
                      ? original
                      : !original && activeRatio !== null && Math.abs(activeRatio - preset.ratio) < 0.01;

                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => chooseFitRatio(preset.ratio)}
                      className="a-btn justify-start !px-3"
                      style={
                        isActive
                          ? { background: 'var(--a-accent, #4aa8ff)', borderColor: 'var(--a-accent, #4aa8ff)', color: '#04101c', fontWeight: 600 }
                          : undefined
                      }
                      aria-pressed={isActive}
                    >
                      {isActive && <Check size={13} />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- current shape, read back ---- */}
          <dl className="grid grid-cols-2 gap-2 text-[0.76rem]">
            <div className="a-card px-3 py-2">
              <dt style={{ color: 'var(--a-faint, #6c7b8d)' }}>Showing</dt>
              <dd className="mt-0.5 font-medium">
                {original ? '100% of the photo' : `${Math.round(image.crop_w * 100)}% wide`}
              </dd>
            </div>
            <div className="a-card px-3 py-2">
              <dt style={{ color: 'var(--a-faint, #6c7b8d)' }}>Shape</dt>
              <dd className="mt-0.5 font-medium">
                {original
                  ? `Original (bounded ${MIN_DISPLAY_RATIO} to ${MAX_DISPLAY_RATIO})`
                  : ratioLabel(activeRatio)}
              </dd>
            </div>
          </dl>

          {!fill && !original && (
            <button type="button" onClick={() => chooseFitRatio(activeRatio)} className="a-btn">
              <RotateCcw size={14} />
              Centre the crop
            </button>
          )}
          {fill && (
            <button type="button" onClick={chooseFill} className="a-btn">
              <RotateCcw size={14} />
              Centre the crop
            </button>
          )}

          <button type="button" onClick={onClose} className="a-btn a-btn-primary mt-auto">
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ratioLabel(ratio: number | null): string {
  if (ratio === null) return 'Original';
  const match = FIT_RATIOS.find((preset) => preset.ratio !== null && Math.abs(preset.ratio - ratio) < 0.01);
  if (match) return `${match.label} (${ratio.toFixed(2)}:1)`;
  return `Custom (${ratio.toFixed(2)}:1)`;
}
