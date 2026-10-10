export function BrandMark({ size = 34 }: { readonly size?: number }) {
  return (
    <svg
      className="brand__mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="LUMEN 标识"
    >
      <rect width="64" height="64" rx="14" fill="#0b1a2b" />
      <path
        d="M14 44 L26 30 L36 37 L50 18"
        fill="none"
        stroke="#14c2ac"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="18" r="5.5" fill="#faf7f0" />
    </svg>
  );
}
