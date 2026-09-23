import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
let polly;
const client = () => (polly ||= new PollyClient({}));
const VOICE = process.env.POLLY_VOICE || 'Joanna';
const ENGINE = process.env.POLLY_ENGINE || 'neural';

/** Returns base64 MP3 for `text`, or '' in mock mode so the UI falls back to on-screen text. */
export async function speak(text) {
  if (process.env.MOCK_MODE === '1' || process.env.SKIP_POLLY === '1') return '';
  const r = await client().send(new SynthesizeSpeechCommand({ Text: String(text).slice(0, 2900), VoiceId: VOICE, Engine: ENGINE, OutputFormat: 'mp3', TextType: 'text' }));
  const bytes = await r.AudioStream.transformToByteArray();
  return Buffer.from(bytes).toString('base64');
}
