# ADR 0003: Step Functions runs the campaign

**Status:** accepted, 23 Sep 2026

**Context.** A campaign is 100 calls with a retry after a wait and a visit queued after two no-answers. It must survive Lambda timeouts and be inspectable afterwards.

**Decision.** One Standard state machine per drill: `Init` loads the register, an inline `Map` with concurrency 8 runs `FirstAttempt` (Lambda with `waitForTaskToken`, so a carrier that completes asynchronously such as Twilio can finish the task from a webhook), a `Wait` on the configured retry delay, `SecondAttempt`, then `Finalize` computes counts, timings and cost. Escalations are created by the call itself so no outcome depends on a later step.

**Consequences.** The drill's history is the execution history. The same campaign runs inline in mock mode for CI. Retry delay is 20 s in the demo and would be 15 min in production.
