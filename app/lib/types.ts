export type Status = "OK" | "NEEDS" | "URGENT" | "UNSURE" | "NO_ANSWER" | "IN_PROGRESS";
export interface Turn { q: number; prompt: string; transcript: string; intent: string; confidence: number; sentiment: string; nlu: string; at: string }
export interface Decision { status: Status; rule: string; evidenceQuote: string; evidenceQ: number | null; evidencePhrase: string | null }
export interface Resident {
  id: string; name: string; age: number | null; lang: string; lat: number; lon: number; address: string; kind: "seed" | "visitor"; consent: boolean;
  phone: string; backupName: string; backupRelation: string; backupPhone: string; livesAlone: boolean | null; conditions: string[];
  persona: { kind: string; answers: (string | null)[]; secondAttempt: string | null } | null;
  last: { outcome: Status; drillId: string; attempt: number; at: string; quote: string; rule?: string; callSK: string; escalation?: { id: string; type: string; label: string } | null } | null;
}
export interface Call { SK: string; callId: string; drillId: string; residentId: string; name: string; attempt: number; carrier: string; startedAt: string; endedAt: string | null; outcome: Status; turns: Turn[]; decision: Decision | null; escalation: { id: string; type: string; label: string } | null; durationMs: number }
export interface Escalation { SK: string; drillId: string; residentId: string; name: string; address: string; type: "neighbour" | "staff" | "supply" | "visit"; label: string; to: { name?: string; relation?: string; phone?: string }; message: string; status: "open" | "resolved"; createdAt: string; resolvedAt: string | null; quote: string; notified: string[] }
export interface Counts { total: number; OK: number; NEEDS: number; URGENT: number; UNSURE: number; NO_ANSWER: number; IN_PROGRESS: number }
export interface Metrics { minutesToFirstAttempt: number | null; minutesTotal: number | null; costUsd: number; costPerResidentUsd: number; projectedPstnMinutes: number; attempts: number; escalations: number }
export interface Drill { id: string; startedAt: string; completedAt: string | null; status: string; trigger: string; mode: string; alertId: string | null; alertEvent: string | null; alertHeadline: string | null; total: number; counts: Counts | null; metrics: Metrics | null; reached?: number; reachRate?: number; running?: boolean }
export interface AlertStatus { zone: string; checkedAt: string; active: { id: string; event: string; headline: string; severity: string; onset: string; ends: string }[]; heat: boolean; heatAlerts?: { event: string; headline: string }[]; error?: string }
export interface StateResponse { residents: Resident[]; drill: Drill | null; calls: Call[]; escalations: Escalation[]; alert: AlertStatus; at: string }
export interface Config { town: string; county: string; center: { lat: number; lon: number }; zone: string; mapKey: string | null; mapStyle: string | null; lex: "live" | "mock"; version: string }
export interface Evaluation { total: number; correct: number; unsafe: number; matrix: Record<string, Record<string, number>>; nlu: string; at: string; byRule?: Record<string, number> }
export interface Report { drill: Drill; counts: Counts; reached: number; reachRate: number; metrics: Metrics; calls: Call[]; escalations: Escalation[]; evaluation: Evaluation | null; town: string; zone: string }
export interface BrowserTurnResponse { retry?: boolean; done?: boolean; q: number; say: string; audio: string; turn?: Turn; decision?: Decision; escalation?: { type: string; label: string; message: string; to: { name?: string } } | null; residentId?: string; drillId?: string }
