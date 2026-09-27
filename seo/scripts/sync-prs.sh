#!/usr/bin/env bash
# sync-prs.sh — bring the ledger up to date with what actually happened to the
# loop's pull requests since the last run. A change only "goes live" when its
# PR merges; brakes, cooldowns and outcomes all key on that date, never on
# the date the model proposed it (review-mode PRs can sit for weeks).
#   merged PR          → status live, live_at = mergedAt
#   closed, unmerged   → status void (it never shipped; nothing to judge)
#   merged revert PR   → the original loop PR's changes become reverted
# Needs GH_TOKEN with pull-requests:read. Appends status events only.
set -euo pipefail

PENDING="$(node seo/scripts/ledger.ts query --status proposed,live | node -e '
  const rows = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const prs = new Set(rows.filter((r) => Number.isInteger(r.pr)).map((r) => `${r.pr}:${r.status}`));
  process.stdout.write([...prs].join(" "));
')"

for item in $PENDING; do
  PR="${item%%:*}"; STATUS="${item##*:}"
  JSON="$(gh pr view "$PR" --json state,mergedAt,headRefName 2>/dev/null || true)"
  [ -n "$JSON" ] || continue
  STATE="$(jq -r .state <<< "$JSON")"; MERGED_AT="$(jq -r '.mergedAt // empty' <<< "$JSON")"
  if [ "$STATUS" = "proposed" ] && [ "$STATE" = "MERGED" ] && [ -n "$MERGED_AT" ]; then
    node seo/scripts/ledger.ts set-status --ref "pr:$PR" --status live --live-at "$MERGED_AT"
  elif [ "$STATUS" = "proposed" ] && [ "$STATE" = "CLOSED" ]; then
    node seo/scripts/ledger.ts set-status --ref "pr:$PR" --status void
  fi
done

# Merged reverts (seo/revert-<pr>, opened by seo-shepherd).
for PR in $(gh pr list --state merged --limit 50 --json headRefName \
              --jq '.[] | .headRefName | capture("^seo/revert-(?<n>[0-9]+)$") | .n'); do
  LIVE="$(node seo/scripts/ledger.ts query --status live | jq --argjson pr "$PR" '[.[] | select(.pr == $pr)] | length')"
  if [ "$LIVE" != "0" ]; then node seo/scripts/ledger.ts set-status --ref "pr:$PR" --status reverted; fi
done
