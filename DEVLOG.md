# Development log

How Calltree was built, in order, with what the coding agent did and what it got wrong. Times are UTC, 23 September 2026. The agent is Claude Code (Fable 5.1) connected to the AWS account through the AWS MCP server (Agent Toolkit for AWS), signed in with the same IAM credentials as the console.

| Time | What happened | Who |
|---|---|---|
| 19:20 | Idea generation from the hackathon brief: eight candidates, kill filters, rubric scorecard. Winner: heat-alert check-in calls for a municipal vulnerable-persons register. Cold judge retell test passed. | agent |
| 19:35 | AWS MCP server: `sts:GetCallerIdentity`, `bedrock:ListFoundationModels` in four regions, `connect:ListInstances`, `polly:DescribeVoices`, `sesv2:GetAccount`, `amplify:ListApps`. Found a fresh account (IAM user created 18 Sep). | agent via MCP |
| 19:40 | `bedrock-runtime:Converse` returns `ValidationException: Operation not allowed` for every model. Bedrock quotas are held at zero on this account. Decision: Amazon Lex V2 is the understanding layer; the decision rules are code. | agent via MCP |
| 19:52 | `connect:CreateInstance` fails: "an AWS account that was provided by AISPL … cannot create Amazon Connect instances". `chime-sdk-voice:SearchAvailablePhoneNumbers` fails: "not supported countryCode = IN". Decision: pluggable carrier, browser call first, Twilio adapter behind env vars. | agent via MCP |
| 19:55 | `sesv2:CreateEmailIdentity` for the staff address (verification email sent). NWS point lookup: Maryvale, Phoenix is forecast zone AZZ544. | agent |
| 20:05 | Decision rules written with 11 unit tests; 100-resident synthetic register generated deterministically; 60-call labelled eval set written. | agent |
| 20:12 | Offline verify (MOCK_MODE) passes: reset, drill, escalations, unhappy path, eval gate. First run showed the keyword NLU twin reading "I don't need anything" as a request; fixed by checking negations first. | agent |
| 20:18 | Lex V2 bot built by script (6 intents, 180 utterances, sentiment on). First run crashed on `DescribeBotVersion` right after `CreateBotVersion` (eventual consistency); added a tolerant wait. | agent |
| 20:20 | First `sam deploy` failed: YAML flow mapping with `{proxy+}`. Quoted the paths. Second deploy rolled back: `AWS::Location::APIKey` AccessDenied on this account. Removed the key; the map falls back to OpenFreeMap tiles. | agent |
| 20:31 | Frontend: Next 16 static export, MapLibre, Motion, NumberFlow. Type errors on MapLibre v6 default import fixed with named imports. | agent |

| 20:46 | Third `sam deploy` succeeded. Live smoke test: reset, drill of 100 residents completed in 1 min 16 s, browser call through the live Lex bot classified "I'm fine, just a bit light-headed" as URGENT with a neighbour escalation. | agent |
| 20:53 | Live Lex evaluation over the 60 labelled calls: 58/60 on the first run. The two misses were "I'm okay, thank you" answers that Lex files under NeedsNothing; the rule now accepts a fine-word under that intent on question one. Second run 60/60, zero unsafe, published to the API. | agent |
| 20:58 | Screenshot QA at 390/1024/1440: MapLibre's web worker failed to load from the bundle (blank map), and component CSS outside `@layer` beat Tailwind's `hidden` utility (horizontal scroll on phones). Worker served from `public/`, classes moved into `@layer components`. | agent |

| 21:05 | Frontend live on Amplify Hosting (manual zip deploy of the static export). The ops-room map was blank: MapLibre's stylesheet forces `position: relative` on its container and beat the `absolute` utility, collapsing the region to 0 px. Fixed with an inline-sized wrapper; fixed-height shell on desktop. Repo pushed to GitHub. | agent |
| 21:15 | Demo video kit (Chromium lockstep capture, Kokoro TTS, OpenCV edit, Whisper QA) set up; storyboard written from DEMO_SCRIPT.md. | agent |

| 24 Sep 02:40 | Builder feedback: the UI was a generic dark dashboard, not the derived design the UI skill asks for, and the idea skill had been anchored on a previous voice win. Skill patched (modality check, kill filter K7, Voxmorph reframed as shape not modality). | builder + agent |
| 24 Sep 03:20 | Design pass on every screen: full-bleed map stage with status and reach panels, dialing-line indicator, dispatch-log rail with the deciding phrase underlined, pins that ring on change and blink while dialing, decision stamps, an oversized numeral band and call-log excerpts on the landing, a handset-style call screen, brand mark, OG image and icons. Screenshot QA at three widths caught one hydration mismatch (a build-time clock), fixed. | agent |

Each MCP tool call is visible in CloudTrail for account 277025716889 with user agent `aws-mcp`. Screenshots of the agent's session are in `docs/proof/`.
