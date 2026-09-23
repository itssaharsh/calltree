// Optional PSTN carrier. Twilio carries the audio; Lex still understands and the code still decides.
// Enabled only when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are set.
export const twilioConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const VOICE = 'Polly.Joanna-Neural';

export function twiml({ say, gatherUrl, hangup = false }) {
  const parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];
  if (gatherUrl) {
    parts.push(`<Gather input="speech" language="en-US" speechModel="phone_call" speechTimeout="auto" actionOnEmptyResult="true" action="${esc(gatherUrl)}" method="POST">`);
    parts.push(`<Say voice="${VOICE}">${esc(say)}</Say>`);
    parts.push('</Gather>');
    parts.push(`<Redirect method="POST">${esc(gatherUrl)}</Redirect>`);
  } else {
    parts.push(`<Say voice="${VOICE}">${esc(say)}</Say>`);
    if (hangup) parts.push('<Hangup/>');
  }
  parts.push('</Response>');
  return parts.join('');
}

export async function startPhoneCall({ to, sessionId, apiBase }) {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
  const base = (apiBase || process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  const body = new URLSearchParams({ To: to, From: from, Url: `${base}/twilio/voice?session=${encodeURIComponent(sessionId)}`, StatusCallback: `${base}/twilio/status?session=${encodeURIComponent(sessionId)}`, StatusCallbackEvent: 'completed', Timeout: '25', MachineDetection: 'Enable' });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, { method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' }, body });
  const data = await r.json();
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${data?.message || 'call failed'}`);
  return { sid: data.sid };
}
