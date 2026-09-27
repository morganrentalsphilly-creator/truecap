#!/usr/bin/env bash
# state-restore.sh — overlay the SEO loop's run state from the `seo-state`
# branch onto the working tree (the paths are gitignored on main).
#
# Restore-only and path-scoped: this never moves HEAD and never brings any
# file across that is not on the explicit list. Every entry on the branch must
# be a regular file (mode 100644): a symlink or submodule there would let a
# writer of that branch redirect a later write outside seo/.
set -euo pipefail

STATE_FILES=(
  seo/ledger.jsonl
  seo/lessons.md
  seo/data/index-status.json
  seo/data/halt.json
)

if ! git fetch --no-tags --depth=1 origin seo-state 2>/dev/null; then
  echo "No seo-state branch yet — first run starts from empty state."
  exit 0
fi

BAD="$(git ls-tree -r FETCH_HEAD | awk '$1 != "100644" { print $1, $4 }')"
if [ -n "$BAD" ]; then
  echo "REFUSING TO RESTORE — seo-state contains non-regular entries:"
  echo "$BAD"
  exit 1
fi
OUTSIDE="$(git ls-tree -r --name-only FETCH_HEAD | grep -Ev '^(seo/(ledger\.jsonl|lessons\.md|reports/[0-9]{4}-W[0-9]{2}\.md|data/(index-status|halt)\.json)|vercel\.json|README\.md)$' || true)"
if [ -n "$OUTSIDE" ]; then
  echo "REFUSING TO RESTORE — seo-state carries unexpected paths:"
  echo "$OUTSIDE"
  exit 1
fi

for f in "${STATE_FILES[@]}"; do
  if git cat-file -e "FETCH_HEAD:$f" 2>/dev/null; then
    mkdir -p "$(dirname "$f")"
    git show "FETCH_HEAD:$f" > "$f"
  fi
done
mkdir -p seo/reports
for f in $(git ls-tree -r --name-only FETCH_HEAD -- seo/reports); do
  git show "FETCH_HEAD:$f" > "$f"
done
echo "Restored run state from seo-state@$(git rev-parse --short FETCH_HEAD)."
