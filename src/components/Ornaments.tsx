// Detalles botánicos inline (sin requests externos): un pequeño ramo de
// hojas para las esquinas y una huella de pata como guiño a Papri.

interface OrnamentProps {
  className?: string;
}

export function LeafSprig({ className }: OrnamentProps) {
  return (
    <svg viewBox="0 0 60 90" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M30 88 C 28 60, 32 30, 30 4" />
        <path d="M30 20 C 20 14, 12 16, 6 10" />
        <path d="M30 40 C 20 34, 12 36, 6 30" />
        <path d="M30 60 C 20 54, 12 56, 6 50" />
      </g>
    </svg>
  );
}

export function PawPrint({ className }: OrnamentProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <ellipse cx="12" cy="16" rx="6" ry="5" />
      <ellipse cx="5" cy="9" rx="2.2" ry="3" />
      <ellipse cx="10" cy="5.5" rx="2.2" ry="3" />
      <ellipse cx="14" cy="5.5" rx="2.2" ry="3" />
      <ellipse cx="19" cy="9" rx="2.2" ry="3" />
    </svg>
  );
}
