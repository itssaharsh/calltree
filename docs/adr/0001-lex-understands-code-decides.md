# ADR 0001: Amazon Lex understands, code decides

**Status:** accepted, 23 Sep 2026

**Context.** Bedrock model invocation is not allowed on this account (quotas at zero, increase denied on an earlier hackathon). Even with a model, a check-in that marks a person "OK" must be explainable and must never guess.

**Decision.** Amazon Lex V2 classifies each of the three answers into six intents with a confidence and a Comprehend sentiment. A pure function (`backend/src/lib/decide.mjs`) turns three classified answers into one of OK, NEEDS, URGENT, UNSURE with precedence URGENT > UNSURE > NEEDS > OK. OK requires three clear affirmatives. A never-OK phrase list overrides everything. Any unclear answer goes to a person.

**Consequences.** The guarantee is testable: 11 unit tests and a 60-call labelled set with a hard gate (zero URGENT or UNSURE classified OK). The same function runs in the Lambda, in CI with a keyword NLU twin, and in the browser demo mode. An LLM can be added later as an adjudicator for UNSURE cases without changing the guarantee.
