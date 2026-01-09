#!/usr/bin/env bash
set -euo pipefail

AI_SERVICE_URL="${AI_SERVICE_URL:-http://localhost:8000}"
API_KEY_HEADER=()

if [[ -n "${AI_SERVICE_API_KEY:-}" ]]; then
  API_KEY_HEADER=(-H "x-api-key: ${AI_SERVICE_API_KEY}")
fi

failures=0

function check() {
  local name="$1"
  shift
  if "$@"; then
    echo "PASS: ${name}"
  else
    echo "FAIL: ${name}"
    failures=$((failures + 1))
  fi
}

function expect_status() {
  local expected="$1"
  shift
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  [[ "$status" == "$expected" ]]
}

function expect_json_field() {
  local jq_filter="$1"
  shift
  local output
  output=$(curl -s "$@")
  echo "$output" | jq -e "$jq_filter" > /dev/null
}

check "health endpoint" \
  expect_status 200 "${AI_SERVICE_URL}/health"

check "chat endpoint" \
  expect_json_field '.response' \
  -H "Content-Type: application/json" \
  "${API_KEY_HEADER[@]}" \
  -d '{"messages":[{"role":"user","content":"Say hello"}]}' \
  "${AI_SERVICE_URL}/chat"

check "analyze endpoint" \
  expect_json_field '.purpose' \
  -H "Content-Type: application/json" \
  "${API_KEY_HEADER[@]}" \
  -d '{"content":"Write-Output \"Hello\"","script_name":"hello.ps1"}' \
  "${AI_SERVICE_URL}/analyze"

if [[ "$failures" -gt 0 ]]; then
  echo "${failures} checks failed."
  exit 1
fi

