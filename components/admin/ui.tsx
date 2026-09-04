'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ toasts */

type Toast = { id: number; message: string; tone: 'ok' | 'error' };
type ToastApi = { notify: (message: string, tone?: 'ok' | 'error') => void };

const ToastCtx = createContext<ToastApi>({ notify: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22 }}
              className="a-card pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5"
              style={{ borderColor: toast.tone === 'error' ? '#5a2b33' : '#2a4a63' }}
            >
              <span
                className="mt-0.5 shrink-0"
                style={{ color: toast.tone === 'error' ? 'var(--a-danger)' : 'var(--a-accent)' }}
              >
                {toast.tone === 'error' ? <AlertTriangle size={15} /> : <Check size={15} />}
              </span>
              <p className="text-[0.84rem] leading-snug">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ toggle */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5">
      <span className="min-w-0">
        <span className="block text-[0.88rem] font-medium">{label}</span>
        {hint && (
          <span className="mt-1 block text-[0.77rem] leading-relaxed text-[color:var(--a-muted)]">
            {hint}
          </span>
        )}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50"
        style={{
          background: checked ? 'var(--a-accent)' : 'var(--a-bg)',
          borderColor: checked ? 'var(--a-accent)' : 'var(--a-line)',
        }}
      >
        <motion.span
          className="absolute top-[3px] h-4 w-4 rounded-full"
          style={{ background: checked ? '#04101c' : '#8394a8' }}
          animate={{ left: checked ? 24 : 4 }}
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="fixed inset-0 bg-black/70" onClick={onClose} />

          <motion.div
            className={`a-card relative my-auto w-full ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal
            aria-label={title}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--a-line)] px-5 py-3.5">
              <h2 className="text-[0.95rem] font-semibold">{title}</h2>
              <button type="button" onClick={onClose} className="a-btn a-btn-quiet !px-1.5 !py-1" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ misc */

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/25 border-t-white"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
