---
name: Calltree
description: A municipal heat register as a civic instrument. Bone paper, cobalt for the one action, the whole status surface flips to cobalt while the drill runs, and the town is a 3D map where each resident is a column whose height is how urgently a person is needed.
colors:
  canvas: "#EFECE5"
  surface-1: "#F8F7F3"
  surface-2: "#E2DED4"
  line: "#CCC6B8"
  ink: "#0B1430"
  ink-muted: "#4A5068"
  accent: "#1F3BD6"
  accent-ink: "#FFFFFF"
  blue: "#1B2FA8"
  chalk: "#F4F3EE"
  success: "#1E7A4C"
  warning: "#8C570A"
  danger: "#C2311F"
  map-ok: "#2BB673"
  map-needs: "#F2B233"
  map-urgent: "#E3402C"
  map-unsure: "#8D95A8"
  map-noanswer: "#3A3F4B"
  map-pending: "#C9C3B5"
typography:
  fontFamily:
    display: "Schibsted Grotesk"
    body: "Instrument Sans"
    mono: "IBM Plex Mono"
  fontSize:
    label: "11px"
    body: "16px"
    h3: "19px"
    h2: "44px"
    h1: "68px"
    numeral: "168px"
rounded:
  sm: "2px"
  md: "8px"
  lg: "14px"
spacing:
  base: "4px"
---

## Overview
Direction: Klein Blueprint, mutated (radius 2·8·14, cobalt as a large surface, chalk blueprint lines only on cobalt). The world is a municipal register: paper, a stamp, a wall clock, a dispatch log, and the town itself. Light so it reads on a projector and looks nothing like a dark AI dashboard.

## Colors
- canvas `#EFECE5` bone paper, always the page. surface-1 `#F8F7F3` panels; white `#FFFFFF` only for the decision card, inputs and the call screen.
- ink `#0B1430` and ink-muted `#4A5068` (7.9:1 on canvas).
- accent cobalt `#1F3BD6`: the one primary action per view, links and citations, focus, the active tab, the reach numeral while a drill runs. Never two accents in one view.
- blue `#1B2FA8` with chalk `#F4F3EE`: the flip. Only the running status panel, the running header, the landing's unhappy-path section and the hero badge. Chalk blueprint lines live only here.
- Outcomes on paper: success `#1E7A4C`, warning `#8C570A`, danger `#C2311F`, unsure ink-muted, no answer graphite `#2B2F3A`.
- Outcomes on the map (saturated so they read in 3D): OK `#2BB673`, NEEDS `#F2B233`, URGENT `#E3402C`, UNSURE `#8D95A8`, NO_ANSWER `#3A3F4B`, PENDING `#C9C3B5`, dialing cobalt.
- Buttons by meaning: Declare heat drill cobalt; Answer the call green; Hang up red; Get called yourself bone secondary; Reset ghost; on cobalt, white chalk pills.
- Escalation bars: neighbour red, staff cobalt, supply amber, visit graphite.

## Typography
- Display Schibsted Grotesk 800, −0.03em; numerals −0.045em, line-height 0.92.
- Body Instrument Sans 400/600, 16px, 1.55, measure ≤64ch.
- Mono IBM Plex Mono for timestamps, ids, labels (11px uppercase +0.12em) and every changing number, tabular.

## Layout
- Ops room: the 3D map is the page. Status and reach panels top-left (360px), dispatch-log rail right (380px), drawer 480px over the rail. Phone: map 56vh then the rail.
- Landing: 5/7 hero with the live orbiting map, a 168px numeral band, timeline beside a call log, the cobalt section, next steps.

## Elevation & Depth
- shadow-1 on panels, shadow-2 on the drawer and the hero map. The map itself carries the depth: pitch 56°, columns, bone buildings.

## Shapes
- 2px chips and labels, 8px buttons, inputs and panels, 14px drawer and hero. Pills only for chips and chalk buttons.

## Components
- button-primary: accent bg, white 600 label, h40. Hover accent-hover, press scale .97.
- button-answer: success bg, white. button-hangup: danger bg, white.
- chip: outcome tint bg + outcome text, mono 11px uppercase, pill.
- stamp: display 800 uppercase in the outcome colour, 34 to 40px.
- panel-blue: blue bg, chalk text, blueprint lines, shadow-2.
- column (map): octagon 10m radius, height 5 (pending) 26 (OK) 40 (unsure) 34 (no answer) 48 (needs) 78 (urgent); +14 when selected; dialing pulses ±10.

## Do's and Don'ts
- Do open on a finished drill with columns already standing.
- Do keep every changing number mono and tabular.
- Don't put chalk lines on paper surfaces. Don't use cobalt for outcomes. No purple, no gradients on text, no glass, no emoji.
- Don't animate on hover except colour. Columns animate only when their outcome changes.
