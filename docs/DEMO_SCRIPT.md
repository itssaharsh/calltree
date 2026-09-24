# Calltree — demo script (3:00 video, and the path a judge clicks alone)

Everything below appears on screen. Nothing that is not on this list gets built first.

| Time | Screen | What happens | What moves |
|---|---|---|---|
| 0:00 | `/` hero | "Europe's 2022 summer killed 61,672 people by heat. Most died alone at home. A city's answer is a spreadsheet and a volunteer phone tree." | The live ops map behind the text is already running a finished drill |
| 0:12 | `/ops` | One sentence: Calltree phones every isolated elderly person on the town's register when a heat alert hits, asks three questions, and sends a human only to those who did not pick up or said something worrying. | KPI strip shows the last drill: 100 reached, 6 escalations, 4 min 12 s |
| 0:25 | `/ops` | Click **Declare heat drill**. | Pins turn from grey to green, amber, red in call order; the call ticker scrolls one row per completed call with the deciding quote |
| 0:45 | `/ops` drawer | Click a red pin: Rosa M., 81. Transcript: "I'm fine, just a bit light-headed." Decision: URGENT because "light-headed" is on the never-OK list. Evidence quote highlighted. Neighbour alert record created at +38 s. | Drawer slides in; the quote is highlighted in the transcript |
| 1:05 | `/ops` drawer | Click a grey-outlined pin: no answer twice, visit queued. Click an amber one: "The AC has been broken since Tuesday" → NEEDS, cooling kit request. | Escalation queue updates |
| 1:20 | `/answer` | **Get called yourself.** Type your first name, press Answer. Calltree speaks (Polly), you talk (Lex understands), three questions, decision on screen. Say "I feel dizzy" on purpose. | Phone-call UI; waveform while listening; your pin appears on the map as red |
| 2:05 | `/ops` | Back on the map: your pin is red with your own quote. The neighbour-alert record is there. | |
| 2:20 | `/report/<drill>` | After-action report: minutes to 100% first attempt, reach rate, escalations, cost per resident, the classifier eval table: 0 URGENT or UNSURE labelled OK on 60 labelled transcripts. | Numbers count up |
| 2:40 | `/` | Where it is headed: power shutoffs, floods, boil-water notices. Same register, same three questions, different trigger. Live link. | |

## The unhappy path, on purpose
1. "I'm fine, just a bit light-headed" must be URGENT, never OK.
2. A noisy or empty answer must be UNSURE and go to a person, never guessed.
3. No answer twice creates a visit, never a silent skip.

## The proof numbers (measured on the seeded drill, shown on `/report`)
- Minutes from alert to 100% first-attempt reached.
- Reach rate and escalation count.
- Classifier eval: confusion matrix on 60 labelled transcripts; the gate is zero URGENT or UNSURE classified as OK.
- Cost per resident per drill (Lex + Polly + Lambda + Step Functions list prices).

## Judge path from a link (async judging)
- No login. `/ops` opens on seeded data with a finished drill already visible.
- **Declare heat drill** works repeatedly; **Reset demo world** restores the seed.
- **Get called yourself** works in Chrome and Edge with a microphone; the page says so and offers typed answers if the mic is denied.
- Every data region has empty, loading and error states.
- The landing page is static HTML so the AI scorer can read the problem, the numbers and the live link without running JavaScript.
