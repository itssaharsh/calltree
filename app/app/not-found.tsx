import Link from "next/link";
import { Shell } from "@/components/Shell";
export default function NotFound() {
  return <Shell><div className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-24 text-center"><p className="mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">404</p><h1 className="mt-2 text-[32px] font-extrabold">Nobody on the register at this address.</h1><p className="mt-2 text-[15px] text-ink-muted">The page you asked for does not exist. The ops room does.</p><Link href="/ops/" className="btn btn-primary mt-6">Open the ops room</Link></div></Shell>;
}
