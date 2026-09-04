'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Crop, ImagePlus, Maximize2, Star, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import ImageCropper from './ImageCropper';
import { Spinner, useToast } from './ui';
import { cropStyle, defaultCrop, isUncropped, mediaUrl } from '@/lib/utils';

export type EditableImage = {
  file: string;
  width: number;
  height: number;
  alt: string;
  crop_x: number;
  crop_y: number;
  crop_w: number;
  crop_h: number;
  fit_mode: 'fill' | 'fit';
};

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function blankImage(file: string, width: number, height: number): EditableImage {
  return { file, width, height, alt: '', fit_mode: 'fill', ...defaultCrop(width, height) };
}

export default function ImageManager({
  images,
  onChange,
  max = 12,
  single = false,
}: {
  images: EditableImage[];
  onChange: (next: EditableImage[]) => void;
  max?: number;
  single?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

  const limit = single ? 1 : max;

  async function upload(files: FileList | File[]) {
    const remaining = single ? 1 : limit - images.length;
    const list = Array.from(files).slice(0, Math.max(0, remaining));

    if (!list.length) {
      notify(`You can attach up to ${limit} image${limit === 1 ? '' : 's'}.`, 'error');
      return;
    }

    const body = new FormData();
    for (const file of list) body.append('file', file);

    setBusy(true);
    try {
      const response = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Upload failed.');

      const uploaded: EditableImage[] = data.files.map(
        (entry: { file: string; width: number; height: number }) =>
          blankImage(entry.file, entry.width, entry.height),
      );

      onChange(single ? uploaded.slice(0, 1) : [...images, ...uploaded].slice(0, limit));
      notify(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Upload failed.', 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) void upload(event.dataTransfer.files);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function replaceAt(index: number, image: EditableImage) {
    const next = [...images];
    next[index] = image;
    onChange(next);
  }

  const full = !single && images.length >= limit;

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-7 text-center transition-colors"
        style={{
          borderColor: dragging ? 'var(--a-accent)' : 'var(--a-line)',
          background: dragging ? 'rgba(74,168,255,0.07)' : 'var(--a-bg)',
          opacity: full ? 0.55 : 1,
        }}
      >
        {busy ? <Spinner size={18} /> : <ImagePlus size={18} className="text-[color:var(--a-accent)]" />}

        <span className="mt-2.5 text-[0.85rem] font-medium">
          {busy ? 'Uploading' : full ? `Limit of ${limit} images reached` : 'Drop images here, or click to choose'}
        </span>
        <span className="mt-1 text-[0.74rem] text-[color:var(--a-faint)]">
          JPG, PNG, WebP or GIF, up to 8 MB each{single ? '' : ` (${images.length}/${limit})`}
        </span>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple={!single}
          className="sr-only"
          disabled={busy || full}
          onChange={(event) => event.target.files && void upload(event.target.files)}
        />
      </label>

      {images.length > 0 && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => {
            const original = image.fit_mode === 'fit' && isUncropped(image);

            return (
              <li key={image.file} className="a-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCroppingIndex(index)}
                  className="relative block aspect-[4/5] w-full overflow-hidden bg-black"
                  title="Crop, and choose Fill or Fit"
                >
                  {original ? (
                    <Image src={mediaUrl(image.file)} alt="" fill sizes="320px" className="object-contain" />
                  ) : (
                    <span className="block" style={cropStyle(image)}>
                      <Image src={mediaUrl(image.file)} alt="" fill sizes="480px" className="object-fill" />
                    </span>
                  )}

                  {index === 0 && !single && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-wide text-white">
                      <Star size={9} className="fill-current text-[color:var(--a-accent)]" />
                      Cover
                    </span>
                  )}

                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-1 text-[0.65rem] text-white">
                    {original ? (
                      <>
                        <Maximize2 size={11} />
                        Fit
                      </>
                    ) : (
                      <>
                        <Crop size={11} />
                        {image.fit_mode === 'fill' ? 'Fill' : 'Fit'}
                      </>
                    )}
                  </span>
                </button>

                <div className="flex items-center gap-1 border-t border-[color:var(--a-line-soft)] p-2">
                  {!single && (
                    <>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="a-btn a-btn-quiet !px-1.5 !py-1 disabled:opacity-30"
                        aria-label="Move earlier"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === images.length - 1}
                        className="a-btn a-btn-quiet !px-1.5 !py-1 disabled:opacity-30"
                        aria-label="Move later"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </>
                  )}

                  <input
                    value={image.alt}
                    onChange={(event) => replaceAt(index, { ...image, alt: event.target.value })}
                    placeholder="Alt text"
                    className="a-input !py-1.5 !text-[0.76rem]"
                    aria-label="Image description"
                  />

                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, i) => i !== index))}
                    className="a-btn a-btn-quiet !px-1.5 !py-1 hover:!text-[color:var(--a-danger)]"
                    aria-label="Remove image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ImageCropper
        open={croppingIndex !== null}
        image={croppingIndex !== null ? images[croppingIndex] : null}
        onClose={() => setCroppingIndex(null)}
        onChange={(next) => croppingIndex !== null && replaceAt(croppingIndex, next)}
      />
    </div>
  );
}
