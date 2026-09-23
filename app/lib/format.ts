import type { Status } from "./types";
export const STATUS_LABEL: Record<Status | "PENDING", string> = { OK: "OK", NEEDS: "Needs", URGENT: "Urgent", UNSURE: "Unsure", NO_ANSWER: "No answer", IN_PROGRESS: "Calling", PENDING: "Pending" };
export const STATUS_COLOR: Record<Status | "PENDING", string> = { OK: "#4CC38A", NEEDS: "#FFD24A", URGENT: "#FF7A7A", UNSURE: "#F3E6CF", NO_ANSWER: "#6B7280", IN_PROGRESS: "#FFA41B", PENDING: "#3E4766" };
export const RULE_LABEL: Record<string, string> = {
  "never-ok-phrase": "said a never-OK phrase", "intent-unwell": "said they feel unwell", "not-fine-phrase": "said they are not fine",
  "incomplete-call": "call ended early", "low-confidence": "answer unclear, not guessed", "negative-sentiment": "sounded distressed",
  "no-cooling": "no working cooling or water", request: "asked for something", "request-phrase": "asked for something",
  "three-affirmatives": "three clear affirmative answers", "no-affirmative": "no clear affirmative", "no-answer": "did not pick up",
};
export const ESC_LABEL: Record<string, string> = { neighbour: "Neighbour called", staff: "Staff call-back", supply: "Delivery today", visit: "Home visit" };
export function timeHM(iso?: string | null) { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
export function dateShort(iso?: string | null) { if (!iso) return "—"; return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
export function minutes(n: number | null | undefined) { if (n == null) return "—"; if (n < 1) return `${Math.round(n * 60)} s`; const m = Math.floor(n), s = Math.round((n - m) * 60); return `${m} min ${String(s).padStart(2, "0")} s`; }
export function usd(n: number | null | undefined, digits = 3) { return n == null ? "—" : `$${n.toFixed(digits)}`; }
export function pct(n: number | null | undefined) { return n == null ? "—" : `${Math.round(n * 100)}%`; }
export function ago(iso?: string | null) { if (!iso) return ""; const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return `${Math.round(s)} s ago`; if (s < 3600) return `${Math.round(s / 60)} min ago`; return `${Math.round(s / 3600)} h ago`; }
