import Link from "next/link";
import { Wordmark } from "./Wordmark";

const links = [
  { href: "/ops/", label: "Ops room" },
  { href: "/answer/", label: "Get called" },
  { href: "/#how", label: "How it works" },
];

export function Shell({ children, live = false, right, full = false }: { children: React.ReactNode; live?: boolean; right?: React.ReactNode; full?: boolean }) {
  return (
    <div className={`relative z-[1] flex min-h-screen flex-col ${full ? "md:h-screen md:overflow-hidden" : ""}`}>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-canvas/85 px-4 backdrop-blur-none md:px-6">
        <Link href="/" className="shrink-0"><Wordmark live={live} /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm px-3 py-1.5 text-[14px] text-ink-muted hover:bg-surface-2 hover:text-ink">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
