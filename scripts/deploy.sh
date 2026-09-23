#!/usr/bin/env bash
# Full deploy: backend (SAM) -> seed + eval publish -> frontend build -> Amplify Hosting.
#   scripts/deploy.sh            # everything
#   scripts/deploy.sh frontend   # only rebuild + redeploy the app against the deployed API
set -euo pipefail
R="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${AWS_PROFILE:-firstcommit}"; REGION=us-east-1; STACK=calltree
LEX_BOT_ID="${LEX_BOT_ID:-YKQSJGHM86}"; LEX_BOT_ALIAS_ID="${LEX_BOT_ALIAS_ID:-5VJDICNL18}"
STAFF_EMAIL="${STAFF_EMAIL:-saharsh7002@gmail.com}"
VERSION="$(git -C "$R" rev-parse --short HEAD 2>/dev/null || echo dev)"
step="${1:-all}"

api_url() { aws cloudformation describe-stacks --stack-name $STACK --profile $PROFILE --region $REGION --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text; }

if [ "$step" = "all" ]; then
  "$R/scripts/sync_app_data.sh"
  (cd "$R/backend" && npm test && MOCK_MODE=1 SIM_PACE=0 node ../scripts/verify.mjs)
  (cd "$R/backend" && sam build --profile $PROFILE && sam deploy --profile $PROFILE --parameter-overrides StaffEmail=$STAFF_EMAIL AppVersion=$VERSION LexBotId=$LEX_BOT_ID LexBotAliasId=$LEX_BOT_ALIAS_ID ${TWILIO_ACCOUNT_SID:+TwilioAccountSid=$TWILIO_ACCOUNT_SID TwilioAuthToken=$TWILIO_AUTH_TOKEN TwilioFrom=$TWILIO_FROM})
fi
API="$(api_url)"; echo "API: $API"
if [ "$step" = "all" ]; then
  curl -sS -X POST "$API/reset" -H 'content-type: application/json' -d '{"drill":true}'; echo
  (cd "$R/backend" && AWS_PROFILE=$PROFILE AWS_REGION=$REGION LEX_BOT_ID=$LEX_BOT_ID LEX_BOT_ALIAS_ID=$LEX_BOT_ALIAS_ID node ../scripts/eval.mjs --publish "$API" | tail -4)
fi
ORIGIN="$(python3 "$R/scripts/amplify_deploy.py" --origin --profile $PROFILE --region $REGION)"
(cd "$R/app" && rm -rf out && NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL="$API" NEXT_PUBLIC_SITE_URL="$ORIGIN" npm run build)
python3 "$R/scripts/amplify_deploy.py" --api-url "$API" --profile $PROFILE --region $REGION
