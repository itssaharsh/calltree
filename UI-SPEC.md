---
name: Calltree
design: ./DESIGN.md
direction: "Sodium Night, mutated: radius 6·10·16, topographic contours at 5%, accent as the alert-banner surface, neutrals tinted to amber"
personality: fluid
dials: { variance: 3, motion: 3, density: 8 }
stack: { next: 16, react: 19, tailwind: 4, motion: 13, map: "maplibre-gl + Amazon Location Monochrome style", export: static }
archetype: dashboard-monitoring
viewports: [390x844, 1024x768, 1440x900]
signature: "Pins change colour in call order while the ticker prints each deciding quote"
demo: { seed: ./seed/residents.json, flag: "?demo=1", state_param: "?state=", reset: "Reset demo world button", guest: true }
deviations:
  - "No login and no auth anywhere: judges click alone from a link."
  - "Report is /report?drill=<id> (query param) because the site is a static export."
---
## 0. Idea brief
- User and moment: an aging-services coordinator at a city desk on the afternoon a heat warning is issued; a judge at a laptop.
- Core loop verb: reach (call, ask, decide, escalate).
- Hero object: the town map with one pin per registered resident.
- World inventory: register ledger, wall clock, dispatch radio, sodium streetlamp, a hand fan.
- Moving data: pins changing colour; the ticker; the KPI counters.
- Wow moment: the judge talks to Calltree in the browser, says "I feel dizzy", and their own pin turns red on the map with their quote.
- Artifact: the after-action report with proof numbers.
- Judging: async, AI-scored first; landing must be readable as static HTML.

## 1. Demo script
See DEMO_SCRIPT.md.

## 2. Screen inventory
| id | route | purpose | entered from | primary action | states |
|---|---|---|---|---|---|
| S1 | / | landing: problem, numbers, live map crop, links | link | Open the ops room | static |
| S2 | /ops | ops room: map, KPIs, ticker, queue, drawer | S1 | Declare heat drill | loading, running, idle, error, empty-queue |
| S3 | /answer | browser call: talk to Calltree | S2 "Get called yourself" | Answer the call | idle, ringing, speaking, listening, thinking, done, mic-denied, error |
| S4 | /report?drill= | after-action report with proof numbers | S2 | Download JSON | loading, ready, not-found |
| S5 | /kit | every component in every state | direct | — | — |

## 3. Flow map
S1 --Open ops--> S2(idle, last drill visible) --Declare--> S2(running) --complete--> S2(idle)
S2 --Get called--> S3 --done--> S2 (drawer open on the visitor's pin)
S2 --View report--> S4

## 4. Screens
### S2 /ops (1440)
- Header 56: wordmark left; alert banner center (idle: "No active heat alert for AZZ544 · last checked 14:02"; drill: amber surface "HEAT DRILL RUNNING · 38 of 100 reached"); right: "Declare heat drill" primary, "Reset demo world" ghost.
- KPI strip 96: Reached / OK / Needs / Urgent / Unsure / No answer / Minutes to all (mono, NumberFlow).
- Main: map (flex) with pins; right rail 380: tabs "Calls" (ticker rows 44px) and "Queue" (open escalations with Mark resolved).
- Drawer 480 from right on pin or row click: name, age, address, conditions, backup contact; transcript turns; decision card (status chip, rule in words, evidence quote highlighted); escalation record; "Call again (browser)".
- Phone: header, KPI strip horizontal scroll, map 52vh, rail below as tabs.
- First 10 seconds: seeded finished drill visible; the banner says when it ran.

### S3 /answer
- Centred call card 480: avatar ring (amber pulse when speaking, green when listening), "Calltree" label, timer (mono), transcript list (last 4 turns + live partial), big Answer button → becomes "Hold to talk" then "Hang up". Typed answer input appears if the mic is denied.
- After the third answer: decision card slides in; "See your pin on the map" link.

## 5. Components (abridged; every one has idle, hover, press, focus-visible, disabled with reason, loading, error, empty)
- C-01 Pin: 12px circle, outcome colour fill, 2px canvas ring; pending grey; no-answer grey with danger ring; selected: 16px + accent ring. Motion: scale 1→1.35→1 on outcome change, 240ms.
- C-02 StatusChip: outcome colour at 14% bg, mono 12px uppercase.
- C-03 KpiTile: label ink-muted 12px, value mono 28px tabular NumberFlow.
- C-04 TickerRow: 44px, name 600, chip, quote mono clipped, time mono; enters with 8px rise, 30ms stagger, popLayout.
- C-05 DrillButton: primary; loading "Declaring…" width locked; disabled while a drill runs with tooltip "A drill is already running".
- C-06 Drawer: 480, surface-1, line-strong border, spring 0.35 bounce 0; focus trapped; Esc closes; returns focus to the pin.
- C-07 TranscriptTurn: speaker label mono 12px, text 16px; evidence sentence gets a 2px accent underline and the rule beside it.
- C-08 CallCard (S3): states per screen inventory; waveform is a 5-bar level meter from the mic analyser.
- C-09 EscalationRow: type glyph + label + resident + time + "Mark resolved" secondary.
- C-10 AlertBanner: see S2 header.
- C-11 EmptyState: contour glyph + one sentence + one action.
- C-12 Toast: ink bg, canvas text, bottom-right, 4s.

## 6. Choreography
| id | trigger | from → to | what moves | pattern | timing |
|---|---|---|---|---|---|
| T-01 | drill declared | banner idle → running | banner surface flips to accent; KPI values start counting | crossfade | 200ms |
| T-02 | call completed (poll) | pin pending → outcome | pin pulses, ticker row enters | draw-on + list add | 240ms, 30ms stagger |
| T-03 | pin or row click | map → drawer | drawer slides from right; selected pin grows | drawer | spring .35/0 |
| T-04 | third answer (S3) | listening → done | decision card rises; status chip pops | morph | 280ms |
| T-05 | report open | numbers 0 → values | NumberFlow | number | 600ms |

## 7. State machines
- Drill: idle → running (POST /drills) → polling every 2s → complete when drill.completedAt → idle.
- Call (S3): idle → ringing (700ms) → speaking (audio playing) → listening (mic, up to 8s, auto-stop on 1.2s silence) → thinking (POST turn) → speaking … → done | mic-denied (typed input) | error (retry).

## 8. Copy deck
- Buttons: Declare heat drill · Reset demo world · Get called yourself · Answer the call · Hold to talk · Hang up · Mark resolved · View report · Open the ops room.
- Empty queue: "No open escalations. Everyone reached said they were fine." action: none.
- Loading map: skeleton of the map region with "Loading register…".
- Error state: "Couldn't reach the API. Retry" with the retry button; keeps last data.
- Mic denied: "Microphone blocked. Type your answer instead."

## 9. Brand
- Mark: a pin (circle) with three short rays to the upper right, the call fanning out. 48 grid, 2 primitives, ink on canvas, amber ring when live.
- Wordmark: "calltree" lowercase Funnel Display 800, the "t" cross-stroke extended as a ray.
- Favicon SVG with prefers-color-scheme; OG image shows the map crop with pins.

## 10. Don'ts
- No spinner where a step name can be shown ("Ringing", "Question 2 of 3").
- Never colour anything but outcomes in outcome colours.
- No transcript in a chat bubble style; it is a call log.

## 11. Acceptance
- ?state=loading|error|empty renders on /ops and /report; /answer?state=mic-denied|done renders.
- No horizontal scroll at 390; focus rings visible; reduced motion drops movement.
- Anti-slop grep for indigo/violet/backdrop-blur/sparkles returns nothing.
