#!/usr/bin/env bash
# Full video pipeline against the live site. Logs every stage.
set -u
cd "$(dirname "$0")"
API=https://tdj1t6l3hj.execute-api.us-east-1.amazonaws.com
echo "== reset demo world $(date -u +%T)"; curl -sS -X POST "$API/reset" -H 'content-type: application/json' -d '{"drill":true}'; echo
for i in $(seq 1 40); do sleep 6; R=$(curl -sS "$API/state" | python3 -c "import sys,json; print(json.load(sys.stdin)['drill']['running'])"); [ "$R" = "False" ] && break; done
echo "== reset drill finished ($i polls) $(date -u +%T)"
echo "== record $(date -u +%T)"; python3 ../demokit/run.py storyboard.json 2>&1 | grep -vE "^\s*$" | tail -25
echo "== cards $(date -u +%T)"; python3 ../demokit/cards.py storyboard.json 2>&1 | tail -6
echo "== stills $(date -u +%T)"; python3 ../demokit/compose.py storyboard.json --still 1.5 8 22 40 55 75 95 110 2>&1 | tail -10
echo "== render $(date -u +%T)"; python3 ../demokit/compose.py storyboard.json 2>&1 | grep -vE "^\s+[0-9.]+s /" | tail -25
echo "== qa $(date -u +%T)"; python3 ../demokit/qa.py storyboard.json --asr 2>&1 | tail -40
echo "== done $(date -u +%T)"
