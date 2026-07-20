#!/usr/bin/env bash
set -euo pipefail

pnpm check:generated
pnpm format:check
pnpm check:web
(
  cd services/api
  ./mvnw --batch-mode verify
)

echo "All repository checks passed."
