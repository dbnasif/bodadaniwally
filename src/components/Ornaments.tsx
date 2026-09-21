// Detalle botánico inline (sin requests externos): una huella de pata
// como guiño a Papri.

interface OrnamentProps {
  className?: string;
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
