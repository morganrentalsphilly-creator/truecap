#!/usr/bin/env bash
# revert-issues.sh — turn this run's brake decisions into `seo-regression`
# issues. brakes.ts only decides; it never touches git or GitHub. An open
# seo-regression issue halts content work (seo-weekly gate), and seo-shepherd
# opens the revert PR from the machine-readable marker in its body. One issue
# per PR; an existing open issue for the same PR is left alone.
set -euo pipefail

BRAKES="$(ls -1 seo/data/brakes-*.json 2>/dev/null | sort | tail -1 || true)"
[ -n "$BRAKES" ] || { echo "no brakes file — nothing to file"; exit 0; }

gh label create seo-regression --color D93F0B --description "SEO loop regression (halts the loop)" 2>/dev/null || true
OPEN_PRS="$(gh issue list --label seo-regression --state open --limit 50 --json body \
             --jq '[.[].body | capture("<!-- seo-regression (?<j>\\{[^}]*\\}) -->").j | fromjson | .pr] | map(tostring) | join(" ")')"

node -e '
  const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  for (const req of r.revertRequests ?? []) process.stdout.write(JSON.stringify(req) + "\n");
' "$BRAKES" | while IFS= read -r REQ; do
  PR="$(jq -r .pr <<< "$REQ")"
  [[ "$PR" =~ ^[0-9]+$ ]] || continue
  if [[ " $OPEN_PRS " == *" $PR "* ]]; then echo "regression issue for #$PR already open"; continue; fi
  BODY="$(mktemp)"
  {
    echo "The weekly brakes flagged a live SEO-loop change for revert. The loop is halted until this issue is closed; seo-shepherd will open the revert PR."
    echo ""
    echo "<!-- seo-regression {\"pr\":$PR} -->"
    echo ""
    jq -r '"- checks: " + (.checks | join(", ")), "- pages: " + (.paths | join(", "))' <<< "$REQ"
  } > "$BODY"
  gh issue create --title "SEO regression: revert loop PR $PR" --label seo-regression --body-file "$BODY"
done
