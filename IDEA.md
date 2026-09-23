# Calltree — hackathon brief (AWS Zero to Shipped, due Oct 2 2026 23:59 PDT)

**One sentence:** We help a city's aging office reach every person on its heat register within the hour, without a two-day volunteer phone tree.

**Retell line:** When a heat warning hits, it phones every isolated elderly person on the town's list, asks three questions, and sends a human only to the ones who didn't pick up or said something worrying.

Category: #social-good (climate resilience + health). Lane: #startup.

## Why it can win
- Mandated pain: French law (art. L121-6-1 CASF, law of 30 June 2004) makes every mayor keep a register of vulnerable people and contact them during heat waves. UNCCAS 2025 survey: 96% of CCAS ran call chains, 50% of users were hard to reach, 27% of registers were incomplete, only 33% had enough staff. https://www.banquedesterritoires.fr/les-ccas-pendant-la-canicule-une-mobilisation-massive-mais-sous-tension
- Observed pain (US): NYC July 2026 added 150 volunteers to a 600-person outreach force for wellness checks; Chicago nonprofit staff phone seniors one by one about AC, water, meds. 16.2M Americans 65+ live alone (ACL 2023).
- Stakes: Europe 2022 heat deaths 61,672 (Nature Medicine); 2023 47,690; Maricopa County 2023 645.
- Default entries: "AI wellness chatbot for seniors", "heat advisory app" (HeatSafe already in the gallery, one-way). Calltree is voice on a phone, triggered by a real alert, with a hard no-guess rule.
- Startup story: mass notification incumbents are one-way (Everbridge taken private for $1.8B, 2024). Two-way per-person confirmation with escalation is the wedge; next hazards: power shutoffs (CPUC requires utilities to reach Medical Baseline customers, technician to the door if unreached), floods, boil-water notices.

## Demo (first 30 s)
Map of a demo town with 100 seeded residents, all grey. Click "Declare heat alert" (or a real NWS alert fires). Pins turn green (fine), amber (needs water/fan), red (dizzy, neighbour called), grey-outlined (no answer twice, visit queued). Judge can type their own US/UK/CA number and get called in ~10 s. Browser "Answer as a resident" for everyone else.
Unhappy path shown: "I'm fine, just a bit light-headed" must go red, not green. Noisy/unclear answer goes to a human. Second no-answer creates a visit.
Proof numbers on a seeded drill: minutes from alert to 100% first-attempt reached; 0 URGENT/UNSURE transcripts labelled OK on a 60-transcript labelled set; cost per resident per drill.

## AWS mapping (problem first, sponsor second)
1. Register: DynamoDB (opt-in consent, backup contact, language). Dashboard on Amplify Hosting (Next.js), SSR landing so the AI scorer can read it.
2. Alert watch: EventBridge Scheduler → Lambda polling api.weather.gov/alerts/active for the zone; manual "drill" button.
3. Calling: Step Functions campaign (Map, concurrency 10, task-token wait, retry after 15 min) → Lambda StartOutboundVoiceContact on Amazon Connect (us-east-1).
4. Asking: Connect contact flow, Polly neural voice, Lex V2 for free-form answers. Stretch: Nova 2 Sonic agentic self-service.
5. No-guess: Lambda + Bedrock Claude Haiku 4.5, strict JSON {status: OK|NEEDS|URGENT|UNSURE, quote}. Code rule: OK requires an affirmative quote; URGENT/UNSURE escalate. Transcripts stored.
6. Escalation: Connect outbound call to backup contact (voice avoids SMS registration) + SES email to staff; visit queue in dashboard.
7. Report: Amazon Location map, after-action report to S3.
Browser path: Connect StartWebRTCContact into the same flow.

## Day-0 checks (Sep 24)
- Bedrock Converse works with valid local creds in us-east-1.
- Create Connect instance, claim a US DID; if "cannot claim" (quota 0), open the quota case immediately.
- One real outbound call to a US/UK number (TextNow app number works from India).
- Amplify Hosting deploy of a hello page.
- Rules tab: India eligible? team size? one prize per category?

## Plan
D1-2 register, map, drill, Step Functions with a call simulator (dashboard moves end to end). D3-4 Connect flow, Lex, classifier, transcripts, real calls, escalation. D5 browser answer path, NWS polling, report. D6 eval set, proof numbers, unhappy paths, cost caps, landing polish. D7 write-up + video. Oct 1 submit. Oct 2 buffer.

## Scope cut
No login, no SMS, no multi-language beyond en/fr prompts, no real register import, no Nova Sonic unless D5 is done, no mobile app.
