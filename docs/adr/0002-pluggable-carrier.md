# ADR 0002: The phone line is a pluggable carrier

**Status:** accepted, 23 Sep 2026

**Context.** This AWS account is billed through AISPL (India). Such accounts cannot create Amazon Connect instances, and Chime SDK PSTN refuses phone number search ("not supported countryCode = IN"). AWS End User Messaging is in sandbox and one-way.

**Decision.** Everything after "someone answered" is carrier-independent: the same session, questions, Lex understanding, decision and escalation. Carriers: `simulated` (scripted persona answers through the real NLU, used for the seeded register), `browser` (WebRTC-free: microphone audio to Lex `RecognizeUtterance`, Polly audio back), and `twilio` (TwiML `<Gather input="speech">`, enabled by three environment variables). Connect and Chime adapters are documented as the path on an AWS-billed account.

**Consequences.** Judges can experience a real voice conversation from a link without a phone. Real PSTN calling needs a carrier credential the builder does not have today; the code path exists and is unit-testable via TwiML generation.
