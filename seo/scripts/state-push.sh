#!/usr/bin/env bash
# state-push.sh <run-id> — publish the SEO loop's run state to `seo-state`.
#
# seo-state is an orphan branch holding ONLY run state (ledger, lessons,
# reports, index cache, halt) plus a vercel.json that disables deployments of
# it. It keeps history (no force-push), and the ledger is append-only: this
# refuses to push a ledger whose previous bytes are not a prefix of the new
# one, and re-verifies the hash chain first. Single writer: the report job of
# seo-weekly (the workflow's concurrency group serializes runs).
set -euo pipefail

RUN_ID="${1:?run id required}"
WORK="$(mktemp -d)"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

node seo/scripts/ledger.ts verify-chain

if git fetch --no-tags origin seo-state 2>/dev/null; then
  git worktree add "$WORK" FETCH_HEAD --detach
  git -C "$WORK" checkout -B seo-state
  if [ -f "$WORK/seo/ledger.jsonl" ]; then
    node seo/scripts/ledger.ts verify-chain --previous "$WORK/seo/ledger.jsonl"
  fi
else
  git worktree add --detach "$WORK"
  git -C "$WORK" checkout --orphan seo-state
  git -C "$WORK" rm -rf --quiet . || true
fi

mkdir -p "$WORK/seo/data" "$WORK/seo/reports"
for f in seo/ledger.jsonl seo/lessons.md seo/data/index-status.json seo/data/halt.json; do
  if [ -f "$f" ]; then cp "$f" "$WORK/$f"; fi
done
if [ -d seo/reports ]; then cp seo/reports/*.md "$WORK/seo/reports/" 2>/dev/null || true; fi
printf '%s\n' '{ "git": { "deploymentEnabled": false } }' > "$WORK/vercel.json"
printf '%s\n' "# seo-state" "" "Run state for the TrueCap SEO loop (seo/README.md). Written only by the seo-weekly workflow. Not a site branch; deployments are disabled." > "$WORK/README.md"

git -C "$WORK" add -A
if git -C "$WORK" diff --cached --quiet; then
  echo "Run state unchanged — nothing to push."
  exit 0
fi
git -C "$WORK" commit -q -m "seo-state: run $RUN_ID"
for attempt in 1 2 3; do
  if git -C "$WORK" push origin seo-state; then exit 0; fi
  echo "push rejected (attempt $attempt) — another writer moved seo-state; refusing to merge state automatically."
  sleep 5
done
echo "::error::could not push seo-state; run state for $RUN_ID is in the workflow artifact only."
exit 1
