// Amazon Lex V2 is the understanding layer: intents plus confidence plus sentiment for every answer.
// MOCK_MODE (or no bot configured) uses a keyword NLU with the same output shape, so the whole
// pipeline runs offline with identical code paths.
import { LexRuntimeV2Client, RecognizeTextCommand, RecognizeUtteranceCommand } from '@aws-sdk/client-lex-runtime-v2';
import { gunzipSync } from 'node:zlib';

const BOT_ID = process.env.LEX_BOT_ID;
const ALIAS_ID = process.env.LEX_BOT_ALIAS_ID;
const LOCALE = process.env.LEX_LOCALE || 'en_US';
export const LEX_LIVE = !!(BOT_ID && ALIAS_ID && BOT_ID !== 'none' && process.env.MOCK_MODE !== '1');
let lex;
const client = () => (lex ||= new LexRuntimeV2Client({}));

import { mockRecognize } from './mocknlu.mjs';
export { mockRecognize };

function fromInterpretations(interps, transcript) {
  const top = Array.isArray(interps) && interps.length ? interps[0] : null;
  const intent = top?.intent?.name || 'FallbackIntent';
  const confidence = typeof top?.nluConfidence?.score === 'number' ? top.nluConfidence.score : (intent === 'FallbackIntent' ? 0 : 0.5);
  const sentiment = top?.sentimentResponse?.sentiment || 'NEUTRAL';
  return { transcript: transcript || '', intent, confidence, sentiment, nlu: 'lex' };
}

export async function recognizeText(text, sessionId = 'calltree') {
  if (!LEX_LIVE) return mockRecognize(text);
  if (!String(text || '').trim()) return { transcript: '', intent: 'FallbackIntent', confidence: 0, sentiment: 'NEUTRAL', nlu: 'lex' };
  const r = await client().send(new RecognizeTextCommand({ botId: BOT_ID, botAliasId: ALIAS_ID, localeId: LOCALE, sessionId: sessionId.slice(0, 100), text: String(text).slice(0, 1000) }));
  return fromInterpretations(r.interpretations, text);
}

const unz = (s) => (s ? JSON.parse(gunzipSync(Buffer.from(s, 'base64')).toString('utf8')) : null);

/** base64 PCM 16 kHz mono little-endian from the browser. Returns the same shape as recognizeText. */
export async function recognizeAudio(pcm16Base64, sessionId = 'calltree') {
  if (!LEX_LIVE) return { ...mockRecognize(''), transcript: '', nlu: 'mock', note: 'audio needs the live bot' };
  const r = await client().send(new RecognizeUtteranceCommand({
    botId: BOT_ID, botAliasId: ALIAS_ID, localeId: LOCALE, sessionId: sessionId.slice(0, 100),
    requestContentType: 'audio/l16; rate=16000; channels=1', responseContentType: 'text/plain; charset=utf-8',
    inputStream: Buffer.from(pcm16Base64, 'base64'),
  }));
  const transcript = unz(r.inputTranscript);
  const interps = unz(r.interpretations);
  return fromInterpretations(interps, typeof transcript === 'string' ? transcript : String(transcript ?? ''));
}
