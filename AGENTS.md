# Calltree — agent instructions

Read `IDEA.md`, `DEMO_SCRIPT.md`, `UI-SPEC.md` and `docs/adr/` before changing behaviour.

- The guarantee lives in `backend/src/lib/decide.mjs`. Change it only with a test and an eval run (`npm test --prefix backend`, `node scripts/eval.mjs`).
- Everything must run offline: `MOCK_MODE=1 SIM_PACE=0 node scripts/verify.mjs` is the gate before any commit.
- The frontend is a static export on Amplify Hosting; no server components that need a runtime. Query params, not dynamic routes.
- No purple, no gradients on text, no emoji in the UI, no sparkles. Tokens are in `DESIGN.md`.
- Deploy: `scripts/deploy.sh` (SAM, then eval publish, then Amplify).
