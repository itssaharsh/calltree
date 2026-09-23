#!/usr/bin/env bash
# Copies the pure engine modules and the seed into the Next app so demo mode runs the same rules.
set -euo pipefail
R="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$R/app/lib/engine"
cp "$R/backend/src/lib/decide.mjs" "$R/backend/src/lib/mocknlu.mjs" "$R/backend/src/lib/prompts.mjs" "$R/app/lib/engine/"
cp "$R/seed/residents.json" "$R/app/lib/seed.json"
cp "$R/seed/residents.json" "$R/backend/src/data/residents.json"
cp "$R/seed/eval.json" "$R/backend/src/data/eval.json"
echo "synced engine + seed"
