import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-[100svh] place-items-center px-6 text-center">
      <div className="glass max-w-md px-8 py-14">
        <p className="eyebrow">404</p>
        <h1 className="display mt-4 text-[clamp(2rem,7vw,3rem)]">This reference doesn&rsquo;t exist</h1>
        <p className="lede mt-4">
          The page or item number you followed is not in the catalogue. It may have sold out or been
          taken off the shelves.
        </p>
        <Link href="/catalog" className="btn btn-primary mt-8">
          Back to the catalogue
        </Link>
      </div>
    </div>
  );
}
