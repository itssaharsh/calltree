export function Mark({ size = 24, live = false }: { size?: number; live?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Calltree mark">
      <circle cx="18" cy="30" r="9" fill="currentColor" />
      <circle cx="18" cy="30" r="13" fill="none" stroke={live ? "#FFA41B" : "currentColor"} strokeOpacity={live ? 1 : 0.35} strokeWidth="2" />
      <path d="M28 20 L40 8 M30 27 L44 20 M23 18 L30 4" stroke="#FFA41B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
export function Wordmark({ live = false }: { live?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <Mark size={26} live={live} />
      <span className="font-display font-extrabold text-[22px] tracking-[-0.03em] leading-none">calltree</span>
    </span>
  );
}
