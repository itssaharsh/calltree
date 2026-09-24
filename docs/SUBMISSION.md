# Builder Center project post (draft)

**Title:** Calltree: every name on the heat register, reached within the hour

**Tags:** #social-good #startup

**Live app:** https://main.dk4896o2qx1ht.amplifyapp.com · **Ops room:** https://main.dk4896o2qx1ht.amplifyapp.com/ops/ · **Try the call:** https://main.dk4896o2qx1ht.amplifyapp.com/answer/ · **API health:** https://tdj1t6l3hj.execute-api.us-east-1.amazonaws.com/health · **Repo:** https://github.com/itssaharsh/calltree · **Video:** VIDEO_URL

## The problem

Europe's summer of 2022 killed 61,672 people by heat (Nature Medicine, 2023). Most were old and most died alone at home. France has required every mayor to keep a register of vulnerable people and contact them during heat waves since 2004. In the 2025 heat wave, 96% of French municipal social centres ran phone chains, half the people on the registers were hard to reach, and only a third of centres had enough staff (UNCCAS survey). New York put 600 outreach workers and 150 new volunteers on wellness checks in July 2026. 16.2 million Americans over 65 live alone.

The tool a city has today is a spreadsheet and a volunteer phone tree. It takes two days. The people nobody reached are the ones who die.

## What Calltree does

When a heat warning hits, Calltree phones every isolated elderly person on the town's register, asks three questions, and sends a human only to the ones who did not pick up or said something worrying.

- **The trigger is the weather.** EventBridge Scheduler polls the National Weather Service zone every 15 minutes; a new heat warning starts the campaign on its own.
- **Every line rings.** Step Functions fans out eight calls at a time, waits, retries no-answers, never skips a name.
- **Three questions, understood by Amazon Lex.** How are you feeling? Is your cooling working and do you have water? Do you need anything? Polly asks; Lex returns an intent, a confidence and a sentiment for each answer.
- **Code decides, not a prompt.** OK needs three clear affirmatives. "I'm fine, just a bit light-headed" is URGENT because "light-headed" is on a never-OK list. Anything unclear goes to a person. The rules are 120 lines, unit tested, and scored on 60 labelled calls: 60/60 with the live bot, and zero URGENT or UNSURE calls classified OK.
- **A person acts.** Neighbour called for urgent cases, staff call-back for unclear ones, a delivery for anyone without cooling, a home visit after two no-answers. Every escalation sits in a queue until someone marks it resolved.

## What a judge sees in two minutes

1. Open the ops room. The town is a 3D map with one column per resident, and the last drill is already standing. Click **Declare heat drill**: the status surface flips to cobalt, eight lines dial, and columns rise green, amber and red in call order (red is tallest, because that is where a person is needed) while the dispatch log prints the deciding quote for each call. The whole register is reached in about 75 seconds of simulated calling.
2. Click a red pin. "I'm fine, just a bit light-headed." URGENT, neighbour alerted at +38 s, the deciding phrase underlined in the transcript.
3. **Get called yourself.** Type a first name and answer the call in your own voice (Chrome or Edge with a microphone; or type). Say "I feel dizzy" on purpose. Your pin appears on the map, red, with your quote.
4. **View report**: time to reach everyone, reach rate, escalations, cost per resident (about a cent), and the classifier evaluation table.

## How the coding agent shipped it

Claude Code, connected to this AWS account through the AWS MCP server (Agent Toolkit for AWS) with the same credentials as the console. The agent ran the account checks before writing code and hit four closed doors, each of which changed the design:

- `bedrock-runtime:Converse` → "Operation not allowed" on every model. So the understanding layer is Amazon Lex V2 and the decision rules are code, which is also the safer design for a check-in that marks people OK.
- `connect:CreateInstance` → AISPL-billed accounts cannot create Amazon Connect instances. `chime-sdk-voice:SearchAvailablePhoneNumbers` → "not supported countryCode = IN". So the carrier is pluggable: a browser call through Lex and Polly for judges, simulated calls for the seeded register, a Twilio adapter behind three environment variables.
- `location:CreateKey` → AccessDenied. So the basemap uses keyless OpenFreeMap tiles.

The agent then wrote the decision rules and their tests, generated the 100-resident register, built the Lex bot by script, deployed with SAM (three attempts: a YAML quoting bug, then the Location key rollback, then success), ran a live smoke test, ran the 60-call evaluation against the live bot (58/60 first pass; the two misses became a rule fix; 60/60 second pass), and ran a Playwright screenshot loop that caught a broken map worker and a CSS layering bug at phone width. All of it is in DEVLOG.md with timestamps, and the verbatim error messages are in docs/proof/.

## Architecture

Next.js static export on Amplify Hosting → HTTP API + Lambda → Step Functions campaign (Map ×8, wait, retry, finalize) → Lambda dialer → Amazon Lex V2 (6 intents + sentiment) and Amazon Polly → DynamoDB single table → SES to staff. EventBridge Scheduler → alerts Lambda → api.weather.gov. Everything runs offline in CI with a keyword twin of the NLU (`MOCK_MODE=1 node scripts/verify.mjs`).

## Impact and where it is headed

Every city with a heat plan has this list and this phone tree. The mass-notification incumbents send one-way alerts; nobody knows who is actually alright. Calltree is the two-way layer: the same register and the same three questions with a different trigger. Power shutoffs, where California utilities must reach medical-baseline customers and send a technician if they cannot. Floods. Boil-water notices. Wildfire smoke. Heat first, because heat already has a law and a register.

## Limitations, honestly

No real phone calls on this deployment (account restriction, documented; the browser call is the same conversation). English only. Synthetic residents. The never-OK list is a demo instrument, not a clinical one; whatever it misses lands in UNSURE and goes to a person, which is the point.
