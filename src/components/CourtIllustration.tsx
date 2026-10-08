import { useId } from "react";
import type { CourtType } from "../api/types";

/** Quadra de areia vista de cima: coberta ganha a lona, descoberta ganha o sol. */
export function CourtIllustration({ type, className = "" }: { type: CourtType; className?: string }) {
  const covered = type === "INDOOR";
  const id = `c${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={covered ? "#D7EEEC" : "#FFE7C7"} />
          <stop offset="1" stopColor={covered ? "#BFE3E0" : "#FFD3A1"} />
        </linearGradient>
        <linearGradient id={`${id}-sand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6DFB4" />
          <stop offset="1" stopColor="#EBC98C" />
        </linearGradient>
        <pattern id={`${id}-dots`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.9" fill="#C9A46A" opacity="0.45" />
        </pattern>
      </defs>
      <rect width="320" height="160" fill={`url(#${id}-bg)`} />
      {!covered && (
        <g>
          <circle cx="276" cy="34" r="20" fill="#FF9F43" />
          <circle cx="276" cy="34" r="30" fill="#FF9F43" opacity="0.18" />
        </g>
      )}
      <g transform="translate(160 92) skewX(-14)">
        <rect x="-118" y="-46" width="236" height="96" rx="6" fill={`url(#${id}-sand)`} />
        <rect x="-118" y="-46" width="236" height="96" rx="6" fill={`url(#${id}-dots)`} />
        <rect x="-104" y="-36" width="208" height="76" fill="none" stroke="#fff" strokeWidth="3" />
        <line x1="0" y1="-44" x2="0" y2="48" stroke="#1D1A16" strokeWidth="3" strokeDasharray="2 3" />
        <rect x="-3" y="-50" width="6" height="8" rx="2" fill="#1D1A16" />
        <rect x="-3" y="44" width="6" height="8" rx="2" fill="#1D1A16" />
      </g>
      {covered && (
        <g opacity="0.9">
          <path d="M0 0h320v26c-40 10-80 14-160 14S40 36 0 26z" fill="#13284A" />
          {[40, 100, 160, 220, 280].map((x) => (
            <rect key={x} x={x - 2} y="26" width="4" height="134" fill="#13284A" opacity="0.25" />
          ))}
        </g>
      )}
    </svg>
  );
}
