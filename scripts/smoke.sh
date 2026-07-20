#!/usr/bin/env bash
set -euo pipefail

API_URL=${API_URL:-http://localhost:8080}
WEB_URL=${WEB_URL:-http://localhost:5173}

curl --fail --silent --show-error "$API_URL/actuator/health/readiness" | grep -q '"status":"UP"'
curl --fail --silent --show-error "$WEB_URL" | grep -q '<title>YukCSCA</title>'
curl --fail --silent --show-error "$WEB_URL/actuator/health/readiness" | grep -q '"status":"UP"'

headers=$(curl --fail --silent --show-error --head "$WEB_URL")
grep -qi '^X-Content-Type-Options: nosniff' <<< "$headers"
grep -qi '^Referrer-Policy: strict-origin-when-cross-origin' <<< "$headers"
grep -qi '^Content-Security-Policy:' <<< "$headers"

echo "Smoke checks passed for $API_URL and $WEB_URL."
