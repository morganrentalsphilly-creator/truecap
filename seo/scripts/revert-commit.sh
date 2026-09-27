#!/usr/bin/env bash
# revert-commit.sh <commit> — revert one merged loop PR's commit on the
# current branch, for seo-shepherd.
#
# A squash or rebase merge lands as an ordinary one-parent commit. A PR the
# founder merged with "Create a merge commit" (review mode, and the repository
# allows it) lands as a two-parent merge, and `git revert` refuses a merge
# without -m ("is a merge but no -m option was given"), which the shepherd
# used to report as a conflict. -m 1 keeps main's side (the first parent) and
# undoes what the PR brought in.
#
# Exit 0 with the revert committed; exit 1 with the tree clean (the revert is
# aborted) when it does not apply.
set -euo pipefail

COMMIT="${1:?usage: revert-commit.sh <commit>}"
# rev-list prints the commit itself, then each of its parents.
WORDS="$(git rev-list --parents -n 1 "$COMMIT" | wc -w | tr -d ' ')"
if [ "$WORDS" -gt 2 ]; then
  ARGS=(--no-edit -m 1 "$COMMIT")
else
  ARGS=(--no-edit "$COMMIT")
fi
if ! git revert "${ARGS[@]}"; then
  git revert --abort 2>/dev/null || true
  exit 1
fi
