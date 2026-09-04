/**
 * Global SVG filter definitions. Kept in one hidden <svg> so any element can
 * reference them by id. The refraction filter is what makes the panes read as
 * real glass rather than a blurred rectangle.
 */
export default function GlassDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute" style={{ position: 'absolute' }}>
      <defs>
        {/* Warps whatever sits behind it, the way a thick pane bends a background. */}
        <filter id="glass-refract" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.4" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Heavier warp for the hero's floating shards. */}
        <filter id="glass-refract-strong" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="3" seed="19" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="34" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Splits highlights into faint colour fringes, like a bevelled edge. */}
        <filter id="chromatic" x="-8%" y="-8%" width="116%" height="116%">
          <feOffset in="SourceGraphic" dx="-1.2" dy="0" result="r" />
          <feOffset in="SourceGraphic" dx="1.2" dy="0" result="b" />
          <feColorMatrix
            in="r"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"
            result="rC"
          />
          <feColorMatrix
            in="b"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
            result="bC"
          />
          <feBlend in="rC" in2="bC" mode="screen" result="fringe" />
          <feBlend in="SourceGraphic" in2="fringe" mode="screen" />
        </filter>

        <linearGradient id="edge-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#79e6ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5b8cff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}
