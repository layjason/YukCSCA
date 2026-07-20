#!/usr/bin/env bash
set -euo pipefail

fail=0

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf "%-12s %s\n" "MISSING" "$1"
    fail=1
    return 1
  fi
}

if require_command node; then
  node_version=$(node --version)
  printf "%-12s %s\n" "node" "$node_version"
  [[ $node_version == v24.* ]] || { echo "ERROR        Node 24 is required."; fail=1; }
fi

if require_command pnpm; then
  pnpm_version=$(pnpm --version)
  printf "%-12s %s\n" "pnpm" "$pnpm_version"
  [[ $pnpm_version == 11.14.0 ]] || { echo "ERROR        pnpm 11.14.0 is required."; fail=1; }
fi

if require_command java; then
  java_version=$(java -version 2>&1 | sed -n '1p')
  printf "%-12s %s\n" "java" "$java_version"
  java -version 2>&1 | grep -Eq 'version "21([.\"]|$)' || { echo "ERROR        Java 21 is required."; fail=1; }
fi

if [[ -x services/api/mvnw ]]; then
  maven_version=$(services/api/mvnw --version 2>/dev/null | sed -n '1p')
  printf "%-12s %s\n" "maven" "$maven_version"
  [[ $maven_version == *"3.9.11"* ]] || { echo "ERROR        Maven Wrapper 3.9.11 is required."; fail=1; }
else
  echo "MISSING      services/api/mvnw"
  fail=1
fi

if require_command docker; then
  docker_version=$(docker --version)
  printf "%-12s %s\n" "docker" "$docker_version"
  if compose_version=$(docker compose version --short 2>/dev/null); then
    printf "%-12s %s\n" "compose" "$compose_version"
    compose_core=${compose_version#v}
    compose_core=${compose_core%%-*}
    IFS=. read -r compose_major compose_minor _ <<< "$compose_core"
    if [[ ! ${compose_major:-} =~ ^[0-9]+$ || ! ${compose_minor:-} =~ ^[0-9]+$ ]]; then
      echo "ERROR        Unable to parse the Docker Compose version. Version 2.22 or newer is required."
      fail=1
    elif (( compose_major < 2 || (compose_major == 2 && compose_minor < 22) )); then
      echo "ERROR        Docker Compose 2.22 or newer is required for Compose Watch."
      fail=1
    fi
  else
    echo "ERROR        Docker Compose 2.22 or newer is required for Compose Watch."
    fail=1
  fi
fi

if [[ ! -f pnpm-lock.yaml ]]; then
  echo "MISSING      pnpm-lock.yaml"
  fail=1
fi

[[ -f .env ]] || echo "NOTICE       .env is missing; use --env-file .env.example for safe local smoke tests."

if [[ $fail -ne 0 ]]; then
  exit 1
fi
