import { demoGet, demoPost } from "./demo";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export function isDemo(): boolean {
  if (typeof window === "undefined") return !API_URL;
  const p = new URLSearchParams(window.location.search);
  if (p.get("demo") === "1") return true;
  if (p.get("demo") === "0") return false;
  return !API_URL;
}
export function forcedState(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("state");
}
async function errMsg(r: Response) {
  try { const j = await r.json(); return j.error || j.message || `HTTP ${r.status}`; } catch { return `HTTP ${r.status}`; }
}
export async function getJSON<T>(path: string): Promise<T> {
  if (isDemo()) return demoGet(path) as Promise<T>;
  const r = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(await errMsg(r));
  return r.json();
}
export async function postJSON<T>(path: string, body: unknown = {}): Promise<T> {
  if (isDemo()) return demoPost(path, body) as Promise<T>;
  const r = await fetch(`${API_URL}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await errMsg(r));
  return r.json();
}
