'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Expand, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { cropStyle, displayRatio, formatItemId, isUncropped, mediaUrl } from '@/lib/utils';
import type { ProductImage } from '@/lib/types';

const EASE = [0.22, 1, 0.36, 1] as const;

// The viewer never grows past this, so a whole picture is always on screen at once.
const VIEWPORT_HEIGHT = 'calc(100svh - 13rem)';

export default function ProductGallery({
  images,
  itemId,
  name,
}: {
  images: ProductImage[];
  itemId: number;
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  const dragging = useRef(false);
  const current = images[active];

  useEffect(() => setMounted(true), []);

  const step = useCallback(
    (delta: number) => {
      setActive((index) => (index + delta + images.length) % images.length);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    },
    [images.length],
  );

  useEffect(() => {
    if (!zoomed) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [zoomed, step]);

  function openFullscreen() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setZoomed(true);
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (scale === 1) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pan(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setOffset((position) => ({ x: position.x + event.movementX, y: position.y + event.movementY }));
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!images.length) {
    return (
      <div className="glass grid aspect-[4/5] place-items-center">
        <span className="item-id item-id-lg">{formatItemId(itemId)}</span>
        <span className="eyebrow">Image coming soon</span>
      </div>
    );
  }

  const original = current.fit_mode === 'fit' && isUncropped(current);
  const ratio = displayRatio(current);

  /**
   * Rendered through a portal on document.body. Anything else would sit inside the page's
   * stacking contexts, and the specification panel would show through it.
   */
  const viewer = (
    <AnimatePresence>
      {zoomed && (
        <motion.div
          className="fixed inset-0 z-[2147483000] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal
          aria-label={`${name} enlarged`}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(3,6,12,0.95)', backdropFilter: 'blur(26px)' }}
            onClick={() => setZoomed(false)}
          />

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-10"
            onPointerDown={startPan}
            onPointerMove={pan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            style={{ cursor: scale > 1 ? 'grab' : 'default', touchAction: 'none' }}
          >
            <motion.div
              className="relative h-full w-full"
              animate={{ scale, x: offset.x, y: offset.y }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onDoubleClick={() => {
                setScale((s) => (s > 1 ? 1 : 2.4));
                setOffset({ x: 0, y: 0 });
              }}
            >
              <Image
                src={mediaUrl(current.file)}
                alt={current.alt || name}
                fill
                sizes="100vw"
                className="object-contain"
                draggable={false}
              />
            </motion.div>
          </div>

          <div className="relative flex flex-wrap items-center justify-center gap-2 pb-6">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(1, Number((s - 0.4).toFixed(2))))}
              className="glass grid h-10 w-10 place-items-center rounded-full"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <span className="glass px-4 py-2 text-[0.74rem] tabular-nums">{Math.round(scale * 100)}%</span>

            <button
              type="button"
              onClick={() => setScale((s) => Math.min(5, Number((s + 0.4).toFixed(2))))}
              className="glass grid h-10 w-10 place-items-center rounded-full"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>

            {images.length > 1 && (
              <div className="ml-4 flex gap-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => {
                      setActive(index);
                      setScale(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: index === active ? 28 : 8,
                      background: index === active ? 'var(--aqua)' : 'rgba(255,255,255,0.25)',
                    }}
                    aria-label={`Image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="glass absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full sm:right-8 sm:top-8"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.div
        className="glass mx-auto overflow-hidden p-3"
        style={{ width: `min(calc(${VIEWPORT_HEIGHT} * ${ratio}), 100%)` }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <button
          type="button"
          onClick={openFullscreen}
          className="group relative block w-full overflow-hidden rounded-[16px] bg-white/[0.03]"
          style={{ aspectRatio: ratio }}
          aria-label="View this image full screen"
        >
          <span className="item-id item-id-lg">{formatItemId(itemId)}</span>

          <AnimatePresence mode="wait">
            <motion.span
              key={current.id}
              className="absolute inset-0 block"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {original ? (
                <Image
                  src={mediaUrl(current.file)}
                  alt={current.alt || name}
                  fill
                  sizes="(max-width: 1024px) 94vw, 52vw"
                  className="object-contain"
                  priority
                />
              ) : (
                <span className="block" style={cropStyle(current)}>
                  <Image
                    src={mediaUrl(current.file)}
                    alt={current.alt || name}
                    fill
                    sizes="(max-width: 1024px) 120vw, 70vw"
                    className="object-fill"
                    priority
                  />
                </span>
              )}
            </motion.span>
          </AnimatePresence>

          <span className="glass absolute bottom-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full transition-transform duration-500 group-hover:scale-110">
            <Expand size={15} />
          </span>
        </button>
      </motion.div>

      {images.length > 1 && (
        <div className="hide-scrollbar mx-auto mt-3 flex justify-center gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              className="glass relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] transition-transform duration-500 hover:-translate-y-1"
              style={{ opacity: index === active ? 1 : 0.5 }}
              aria-label={`View image ${index + 1}`}
              aria-current={index === active}
            >
              {image.fit_mode === 'fit' && isUncropped(image) ? (
                <Image src={mediaUrl(image.file)} alt="" fill sizes="80px" className="object-contain" />
              ) : (
                <span className="block" style={cropStyle(image)}>
                  <Image src={mediaUrl(image.file)} alt="" fill sizes="160px" className="object-fill" />
                </span>
              )}

              {index === active && (
                <motion.span
                  layoutId="thumb-active"
                  className="absolute inset-0 rounded-[14px]"
                  style={{ boxShadow: 'inset 0 0 0 2px rgba(121,230,255,0.85)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {mounted && createPortal(viewer, document.body)}
    </>
  );
}
