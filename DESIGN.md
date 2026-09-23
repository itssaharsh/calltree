---
name: Calltree
description: Heat-alert check-in calls for a town's vulnerable-persons register. Night-shift operations room, sodium streetlamp amber on navy, a map that changes colour as calls complete.
colors:
  canvas: "#0E1220"
  surface-1: "#151A2B"
  surface-2: "#1D2336"
  line: "#2B3249"
  ink: "#F3E6CF"
  ink-muted: "#A69E8F"
  accent: "#FFA41B"
  accent-ink: "#1A1000"
  success: "#4CC38A"
  warning: "#FFD24A"
  danger: "#FF7A7A"
  pending: "#6B7280"
typography:
  fontFamily:
    display: "Funnel Display"
    body: "Funnel Sans"
    mono: "Martian Mono"
  fontSize:
    xs: "12px"
    sm: "14px"
    base: "16px"
    lg: "20px"
    xl: "28px"
    display: "clamp(2.5rem, 1.6rem + 4.5vw, 5.5rem)"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  base: "4px"
---

## Overview
Calltree is an operations room at night during a heat emergency. The canvas is navy, the light comes from one amber streetlamp pool behind the hero object (the map), and the only saturated colours are the four call outcomes. Direction: Sodium Night, mutated: radius family 6·10·16, topographic contour texture at 5%, accent used as a surface on the alert banner, neutrals tinted toward amber.

## Colors
- canvas `#0E1220`: page background, always.
- surface-1 `#151A2B`, surface-2 `#1D2336`: cards and drawers; elevation by ladder, never by shadow.
- ink `#F3E6CF` body text; ink-muted `#A69E8F` secondary text (contrast 5.9:1 on canvas).
- accent `#FFA41B` amber: the primary CTA, the active heat-alert banner surface, focus ring, the live series on charts. Never two accents in one view. Accent budget under 5% of pixels, except the alert banner during a drill.
- Outcome colours, used only for outcomes and never for decoration: success `#4CC38A` OK, warning `#FFD24A` NEEDS, danger `#FF7A7A` URGENT, pending `#6B7280` not yet reached; a no-answer pin is pending with a danger outline.

## Typography
- Display: Funnel Display 800, tracking −0.03em, line-height 1.05. Headlines only.
- Body: Funnel Sans 400/600, 16px, line-height 1.55, measure 60ch max.
- Mono: Martian Mono for every number that changes (times, counts, costs) with tabular numerals, and for transcript quotes.
- Sentence case everywhere. Buttons name their result: "Declare heat drill", "Answer the call", "Mark visited".

## Layout
- 4px base. Tight gaps inside groups (4 to 8), generous between groups (32 to 64).
- Ops screen at 1440: header 56, KPI strip 96, map fills the rest with a 380px right rail (ticker, queue). Resident drawer 480 from the right.
- Phone width: header, KPI strip as a horizontal scroll, map 52vh, rail stacked below.

## Elevation & Depth
- Surface ladder only. Drawers get a 1px line-strong border. No glass, no glow except the single amber radial behind the map.

## Shapes
- Radius scale: chips 6, cards and inputs 10, drawers and the call screen 16. Pins are circles with a 2px canvas ring.

## Components
- button-primary: bg accent, fg accent-ink, 600, h40 (h44 touch), radius md. Hover accent-hover, press scale .97.
- button-secondary: surface-1, 1px line, ink.
- status-chip: outcome colour at 14% background, outcome colour text, radius sm, mono 12px uppercase +0.08em.
- alert-banner: accent surface with accent-ink text while a drill runs; surface-1 with ink when idle.
- call-row (ticker): 44px, name, chip, mono quote clipped to one line, mono time.
- transcript-turn: label (Calltree or resident), body text; the deciding quote gets an accent underline.

## Do's and Don'ts
- Do open on a finished drill. Never an empty map.
- Do put every changing number in mono, tabular.
- Don't use purple, gradients on text, glass cards, emoji, or sparkles.
- Don't animate on hover except a 150ms colour change. Pins animate only when their outcome changes.
- Don't show a spinner under 300ms. Calls in progress show the step name: "Ringing", "Question 2 of 3".
