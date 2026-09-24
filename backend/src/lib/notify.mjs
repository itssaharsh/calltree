// Staff notification. Email through SES when a verified sender is configured; the dashboard queue is
// always the source of truth, so a missing channel never loses an escalation.
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
let ses;
import * as db from './db.mjs';
// Email only for urgent escalations, and never more than the daily cap: the SES sandbox allows 200 a day
// and every escalation is already in the ops-room queue.
export async function notifyStaff(esc) {
  const to = process.env.STAFF_EMAIL, from = process.env.FROM_EMAIL || process.env.STAFF_EMAIL;
  if (!to || !from || process.env.MOCK_MODE === '1') return [];
  if (esc.type !== 'neighbour') return [];
  const day = new Date().toISOString().slice(0, 10);
  const sent = await db.increment('CAPS', day, 'emails');
  if (sent > Number(process.env.MAX_EMAILS_PER_DAY || 40)) return [];
  ses ||= new SESv2Client({});
  const subject = `[Calltree ${esc.type.toUpperCase()}] ${esc.name}: ${esc.label}`;
  const text = `${esc.message}\n\nQuote: "${esc.quote}"\nWhen: ${esc.createdAt}\nDrill: ${esc.drillId}\nOpen the ops room to mark it resolved.`;
  await ses.send(new SendEmailCommand({ FromEmailAddress: from, Destination: { ToAddresses: [to] }, Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } } }));
  return ['email'];
}
