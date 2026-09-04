'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Spinner } from './ui';
import Wordmark from '../Wordmark';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AdminLogin({ setupNeeded }: { setupNeeded: boolean }) {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? 'Sign-in failed.');

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-[100svh] place-items-center overflow-hidden px-5 py-16">
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -left-32 top-10 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(121,230,255,0.22), transparent 65%)' }}
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(91,140,255,0.22), transparent 65%)' }}
      />

      <motion.div
        className="glass sheen relative w-full max-w-md px-7 py-10 sm:px-10"
        initial={{ opacity: 0, y: 34, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: EASE }}
      >
        <div className="flex justify-center">
          <Wordmark />
        </div>

        <p className="eyebrow mt-8 text-center">Catalogue administration</p>
        <h1 className="display mt-3 text-center text-[2.1rem]">Sign in</h1>

        {setupNeeded ? (
          <div
            className="mt-7 rounded-[14px] px-5 py-4 text-[0.83rem] leading-relaxed text-[color:var(--muted)]"
            style={{ background: 'rgba(121,230,255,0.07)', boxShadow: 'inset 0 0 0 1px rgba(121,230,255,0.3)' }}
          >
            <strong className="block text-white">No admin account exists yet.</strong>
            Create one from the project folder, then reload this page:
            <code className="mt-2.5 block rounded-lg bg-black/40 px-3 py-2 font-mono text-[0.78rem] text-[color:var(--aqua)]">
              npm run admin:create
            </code>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <span className="label">Username</span>
              <div className="relative">
                <User
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--faint)]"
                />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="field !pl-10"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <span className="label">Password</span>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--faint)]"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field !pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg px-3.5 py-2.5 text-[0.8rem] text-red-200"
                style={{ background: 'rgba(255,90,90,0.1)', boxShadow: 'inset 0 0 0 1px rgba(255,120,120,0.35)' }}
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : 'Sign in'}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-[0.72rem] leading-relaxed text-[color:var(--faint)]">
          Credentials are managed from the command line with{' '}
          <code className="text-white/70">npm run admin:create</code>.
        </p>
      </motion.div>
    </div>
  );
}
