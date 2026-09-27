#!/usr/bin/env bash
# digest-issue.sh — one "SEO weekly digest" issue, found by LABEL (not by
# listing the newest 100 issues, which silently loses an old issue), its body
# kept as the current-state index, plus ONE comment per run. GitHub notifies
# on comments, not on body edits, so the comment is the weekly notification.
set -euo pipefail

LABEL="seo-digest"
TITLE="SEO weekly digest"
DIGEST="$(ls -1 seo/data/digest-*.md 2>/dev/null | sort | tail -1 || true)"
REPORT="$(ls -1 seo/reports/*.md 2>/dev/null | sort | tail -1 || true)"
if [ -z "$DIGEST" ] || [ -z "$REPORT" ]; then
  echo "No digest/report was written — nothing to post."
  exit 0
fi

gh label create "$LABEL" --color 0E8A16 --description "SEO loop weekly digest" 2>/dev/null || true
NUMBER="$(gh issue list --label "$LABEL" --state all --limit 20 --json number,title \
           --jq "[.[] | select(.title == \"$TITLE\")][0].number // empty")"
if [ -z "$NUMBER" ]; then
  gh issue create --title "$TITLE" --label "$LABEL" --body-file "$REPORT"
  NUMBER="$(gh issue list --label "$LABEL" --state all --limit 20 --json number,title \
             --jq "[.[] | select(.title == \"$TITLE\")][0].number")"
else
  gh issue edit "$NUMBER" --body-file "$REPORT"
  gh issue reopen "$NUMBER" 2>/dev/null || true
fi
gh issue comment "$NUMBER" --body-file "$DIGEST"
echo "Digest posted to #$NUMBER."
