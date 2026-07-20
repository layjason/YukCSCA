#!/usr/bin/env bash
set -euo pipefail

openapi=contracts/generated/openapi.yaml
frontend=apps/web/src/shared/api/generated/openapi.ts

for artifact in "$openapi" "$frontend"; do
  [[ -f $artifact ]] || { echo "Missing generated artifact: $artifact"; exit 1; }
done

before_openapi=$(git hash-object "$openapi")
before_frontend=$(git hash-object "$frontend")

pnpm generate

after_openapi=$(git hash-object "$openapi")
after_frontend=$(git hash-object "$frontend")

if [[ $before_openapi != "$after_openapi" || $before_frontend != "$after_frontend" ]]; then
  echo "Generated API artifacts were stale. Commit the output of 'pnpm generate'."
  exit 1
fi

git diff --exit-code -- "$openapi" "$frontend"
echo "Generated API artifacts are reproducible and unchanged."
