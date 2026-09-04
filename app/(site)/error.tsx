'use client';

import { useEffect } from 'react';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70svh] place-items-center px-6 py-32 text-center">
      <div className="glass max-w-md px-8 py-14">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-4 text-[clamp(1.8rem,6vw,2.6rem)]">This page didn&rsquo;t load</h1>
        <p className="lede mt-4">
          The catalogue is still there. Try again, and if it keeps happening let us know which page you
          were on.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">
          Try again
        </button>
      </div>
    </div>
  );
}
