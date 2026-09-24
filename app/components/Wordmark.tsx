export function Mark({ size = 24, live = false, chalk = false }: { size?: number; live?: boolean; chalk?: boolean }) {
  const ink = chalk ? "#F4F3EE" : "#0B1430";
  const ray = chalk ? "#F4F3EE" : "#1F3BD6";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Calltree mark">
      <circle cx="18" cy="30" r="9" fill={ink} />
      <circle cx="18" cy="30" r="13" fill="none" stroke={ray} strokeOpacity={live ? 1 : 0.35} strokeWidth="2" />
      <path d="M28 20 L40 8 M30 27 L44 20 M23 18 L30 4" stroke={ray} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
export function Wordmark({ live = false }: { live?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${live ? "text-chalk" : "text-ink"}`}>
      <Mark size={26} live={live} chalk={live} />
      <span className="font-display font-extrabold text-[22px] tracking-[-0.03em] leading-none">calltree</span>
    </span>
  );
}
