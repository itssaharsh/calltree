export interface NLU { transcript: string; intent: string; confidence: number; sentiment: string; nlu: string }
export interface DecisionOut { status: string; rule: string; evidenceQuote: string; evidenceQ: number | null; evidencePhrase: string | null }
export function mockRecognize(text: string): NLU;
export function decide(turns: Array<{ q: number } & Partial<NLU>>): DecisionOut;
export function escalationFor(status: string, attempt?: number): { type: string; label: string } | null;
export const QUESTIONS: { q: number; key: string; text: string }[];
export function greeting(name: string): string;
export function closing(status: string, resident?: { name?: string; backupName?: string; backupRelation?: string }): string;
