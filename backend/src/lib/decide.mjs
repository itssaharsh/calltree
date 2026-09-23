// The guarantee lives here, not in a prompt: a resident is marked OK only on three affirmative
// answers, and anything on the never-OK list or anything unclear goes to a person.
// Pure function. No I/O. Unit tested and run over the labelled eval set.

export const STATUS = Object.freeze({ OK: 'OK', NEEDS: 'NEEDS', URGENT: 'URGENT', UNSURE: 'UNSURE', NO_ANSWER: 'NO_ANSWER' });

export const NEVER_OK = [
  'dizzy', 'dizziness', 'light-headed', 'lightheaded', 'light headed', 'faint', 'fainted', 'fainting',
  'chest', 'breath', 'breathe', 'breathing', 'fell', 'fallen', 'fall down', 'a fall', 'confused', 'confusion',
  'vomit', 'vomiting', 'throwing up', 'nausea', 'nauseous', "can't get up", 'cannot get up', 'unconscious',
  'stroke', 'blurry', 'blurred', '911', 'ambulance', 'help me', 'very weak', 'so weak', 'shaking', 'cramp',
  'cramps', 'passed out', 'collapsed', 'numb', 'headache', 'heart', 'not breathing', 'woozy', 'wobbly',
];
export const NOT_FINE = [
  'not fine', 'not okay', 'not ok', 'not good', 'not well', 'not great', 'not so good', "don't feel",
  'do not feel', 'unwell', 'sick', ' ill', 'terrible', 'awful', 'poorly', 'not feeling', 'feeling bad',
];
export const NO_COOLING = [
  'broken', 'broke', 'not working', "doesn't work", "isn't working", "won't turn on", 'no fan', 'no ac',
  'no a/c', 'no air', 'power is out', 'power went out', "power's out", 'no power', 'no electricity',
  'out of water', 'no water', 'too hot', 'so hot', 'very hot', 'boiling', 'sweltering', 'stuffy', 'stopped working',
];
export const NEEDS_WORDS = [
  'need', 'could someone', 'can someone', 'bring', 'deliver', 'run out', 'ran out', 'medication', 'medicine',
  'prescription', 'ice', 'groceries', 'food', 'help', 'would be nice', 'would help', 'if possible',
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returns the first phrase from `list` found in `text` as a whole word/phrase, else null. */
export function findPhrase(text, list) {
  const t = ` ${String(text || '').toLowerCase().replace(/\s+/g, ' ')} `;
  for (const phrase of list) {
    const p = phrase.trim();
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(p)}(?=$|[^a-z0-9])`, 'i');
    if (re.test(t)) return p;
  }
  return null;
}

/** The sentence of `text` that contains `phrase`, for the evidence quote. */
export function sentenceWith(text, phrase) {
  const parts = String(text || '').split(/(?<=[.!?])\s+/);
  const hit = parts.find((s) => s.toLowerCase().includes(phrase.toLowerCase()));
  return (hit || text || '').trim();
}

const conf = (t) => (typeof t?.confidence === 'number' ? t.confidence : 0);
const isUnclear = (t) =>
  !t || !t.transcript || t.transcript.replace(/[^a-z0-9]/gi, '').length < 2 ||
  t.intent === 'FallbackIntent' || !t.intent || conf(t) < 0.55;

function out(status, rule, turn, phrase) {
  const transcript = turn?.transcript || '';
  return {
    status,
    rule,
    evidenceQuote: phrase ? sentenceWith(transcript, phrase) : transcript,
    evidenceQ: turn?.q ?? null,
    evidencePhrase: phrase || null,
  };
}

/**
 * turns: [{ q: 1|2|3, transcript, intent, confidence, sentiment }]
 * Precedence: URGENT > UNSURE > NEEDS > OK. OK needs three affirmatives.
 */
export function decide(turns = []) {
  const byQ = Object.fromEntries(turns.map((t) => [t.q, t]));
  const q1 = byQ[1], q2 = byQ[2], q3 = byQ[3];

  // 1. Never-OK phrases anywhere in the call.
  for (const t of turns) {
    const hit = findPhrase(t.transcript, NEVER_OK);
    if (hit) return out(STATUS.URGENT, 'never-ok-phrase', t, hit);
  }
  // 2. The resident says they are unwell.
  if (q1 && q1.intent === 'FeelingUnwell' && conf(q1) >= 0.6) return out(STATUS.URGENT, 'intent-unwell', q1);
  const notFine = q1 ? findPhrase(q1.transcript, NOT_FINE) : null;
  if (notFine) return out(STATUS.URGENT, 'not-fine-phrase', q1, notFine);

  // 3. Anything unclear goes to a person. The system is not allowed to guess.
  if (turns.length < 3) return { status: STATUS.UNSURE, rule: 'incomplete-call', evidenceQuote: '', evidenceQ: null, evidencePhrase: null };
  for (const t of [q1, q2, q3]) {
    if (isUnclear(t)) return out(STATUS.UNSURE, 'low-confidence', t);
  }
  if (q1.sentiment === 'NEGATIVE' && q1.intent !== 'FeelingFine') return out(STATUS.UNSURE, 'negative-sentiment', q1);

  // 4. Needs: no cooling or water, or a request.
  const noCooling = findPhrase(q2.transcript, NO_COOLING);
  if ((q2.intent === 'NoCooling' && conf(q2) >= 0.6) || noCooling) return out(STATUS.NEEDS, 'no-cooling', q2, noCooling);
  if (q3.intent === 'NeedsSomething' && conf(q3) >= 0.6) return out(STATUS.NEEDS, 'request', q3);
  const needWord = ['NeedsNothing', 'FeelingFine'].includes(q3.intent) && conf(q3) >= 0.6 ? null : findPhrase(q3.transcript, NEEDS_WORDS);
  if (needWord) return out(STATUS.NEEDS, 'request-phrase', q3, needWord);

  // 5. OK only on three affirmatives.
  const affirmative =
    q1.intent === 'FeelingFine' && conf(q1) >= 0.7 &&
    q2.intent === 'HasCooling' && conf(q2) >= 0.6 &&
    ['NeedsNothing', 'FeelingFine'].includes(q3.intent) && conf(q3) >= 0.6;
  if (affirmative) return out(STATUS.OK, 'three-affirmatives', q1);

  // 6. Otherwise a person calls back.
  const weakest = [q1, q2, q3].sort((a, b) => conf(a) - conf(b))[0];
  return out(STATUS.UNSURE, 'no-affirmative', weakest);
}

/** What happens next for each status. Used by the state machine and the UI copy. */
export function escalationFor(status, attempt = 1) {
  switch (status) {
    case STATUS.URGENT: return { type: 'neighbour', label: 'Neighbour called, staff call-back now' };
    case STATUS.UNSURE: return { type: 'staff', label: 'Staff call-back within the hour' };
    case STATUS.NEEDS: return { type: 'supply', label: 'Cooling kit or water delivery today' };
    case STATUS.NO_ANSWER: return attempt >= 2 ? { type: 'visit', label: 'Home visit queued' } : null;
    default: return null;
  }
}
