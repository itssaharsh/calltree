// Keyword NLU twin of the Lex bot. Same output shape. Used offline, in CI and in the browser demo mode.
const has = (t, words) => words.some((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z])`, 'i').test(t));
const UNWELL = ['dizzy', 'dizziness', 'light-headed', 'lightheaded', 'faint', 'fell', 'fall', 'chest', 'breath', 'breathe', 'nause', 'nauseous', 'sick', 'not well', 'not feeling', 'not so good', 'not good', 'headache', 'weak', 'confused', 'throwing up', 'vomit', 'shaking', 'heart', 'woozy', 'unwell', "can't get up", 'passed out', 'terrible', 'ambulance'];
const FINE = ['fine', 'okay', 'ok', 'good', 'well', 'alright', 'great', 'doing', 'resting', 'fantastic', 'not bad'];
const NOCOOL = ['broken', 'broke', 'not working', "isn't working", "doesn't work", 'stopped working', 'no ac', 'no a/c', 'no air', 'no fan', 'power', 'no electricity', 'too hot', 'so hot', 'very hot', 'no water', 'out of water', 'weak', 'stuffy', 'nothing is running'];
const HASCOOL = ['ac', 'a/c', 'air', 'fan', 'cooler', 'conditioning', 'conditioner', 'water', 'cool', 'works', 'working', 'running', 'on', 'yes', 'comfortable', 'blast'];
const NEEDS = ['need', 'could someone', 'can someone', 'bring', 'deliver', 'ice', 'medication', 'medicine', 'prescription', 'groceries', 'food', 'would help', 'would be nice', 'could use', 'ran out', 'run out', 'help', 'please send', 'come by', 'someone come', 'if possible'];
const NOTHING = ['no', 'nothing', "don't need", 'do not need', 'all set', "i'm fine", 'thank you', 'thanks', 'manage', 'everything', 'good'];
const UNCLEAR = ['who is this', 'hello?', 'what?', 'sorry?', 'que', 'entiendo', 'hmm', 'goodbye', 'not answering', 'gave you', "can't hear", 'cannot hear', 'guess', 'i think', 'si', 'gracias'];

export function mockRecognize(text) {
  const raw = String(text || '');
  const t = raw.toLowerCase().trim();
  const letters = t.replace(/[^a-z]/g, '');
  const empty = t.replace(/[^a-z0-9]/g, '').length < 2;
  const short = letters.length <= 4; // "yeah", "mm hmm", "si"
  const NOTHING_STRONG = ["don't need", 'do not need', 'nothing', 'all set', "i'll manage", 'no thank', 'no thanks', 'nope', 'no i', 'no we', 'no nothing', 'no all', 'no,', 'nothing needed', 'i have everything'];
  const NEEDS_STRONG = ['i need', 'could someone', 'can someone', 'bring', 'deliver', 'ice', 'medication', 'medicine', 'prescription', 'groceries', 'food', 'would help', 'would be nice', 'could use', 'ran out', 'run out', 'help', 'please send', 'come by', 'someone come', 'if possible', 'someone should'];
  const HASCOOL_STRONG = ['ac', 'a/c', 'air', 'fan', 'cooler', 'conditioning', 'conditioner', 'cool in', 'cool inside', 'works', 'working', 'running', 'blast', 'comfortable', 'have water', 'plenty of water', 'have plenty', 'everything is', 'it works', 'drank'];
  let intent = 'FallbackIntent', confidence = 0.3, sentiment = 'NEUTRAL';
  if (empty || has(t, UNCLEAR)) { intent = 'FallbackIntent'; confidence = 0.25; }
  else if (has(t, UNWELL)) { intent = 'FeelingUnwell'; confidence = 0.9; sentiment = 'NEGATIVE'; }
  else if (has(t, NOCOOL)) { intent = 'NoCooling'; confidence = 0.88; sentiment = 'NEGATIVE'; }
  else if (has(t, NOTHING_STRONG) || t === 'no' || t === 'no.') { intent = 'NeedsNothing'; confidence = letters.length <= 2 ? 0.66 : 0.85; sentiment = 'NEUTRAL'; }
  else if (has(t, NEEDS_STRONG)) { intent = 'NeedsSomething'; confidence = 0.86; sentiment = 'NEGATIVE'; }
  else if (has(t, HASCOOL_STRONG)) { intent = 'HasCooling'; confidence = 0.85; sentiment = 'POSITIVE'; }
  else if (has(t, FINE)) { intent = 'FeelingFine'; confidence = 0.9; sentiment = 'POSITIVE'; }
  else if (/^(yes|yes it is|yep|yeah it is)[.!]?$/.test(t)) { intent = 'HasCooling'; confidence = 0.62; sentiment = 'POSITIVE'; }
  if (short && intent !== 'FallbackIntent' && !['no', 'yes', 'fine', 'good', 'okay', 'ok', 'nothing', 'nope', 'well'].includes(letters)) confidence = Math.min(confidence, 0.5);
  return { transcript: raw, intent, confidence, sentiment, nlu: 'mock' };
}

