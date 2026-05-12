#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH=""
REMOTE="origin"
COMMIT_MESSAGE=""
TAG_NAME=""
DRY_RUN=0
NO_TAG=0
NO_PUSH=0

usage() {
  cat <<'EOF'
Usage: ./scripts/release-github.sh --branch <name> --message <commit-message> [options]

Options:
  --branch <name>         Target branch to push (required)
  --message <text>        Commit message for release commit (required)
  --remote <name>         Git remote (default: origin)
  --tag <name>            Optional tag name to create and push
  --no-tag                Skip tagging even if --tag provided
  --no-push               Commit only, do not push
  --dry-run               Show planned git commands only
  -h, --help              Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --message)
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    --remote)
      REMOTE="$2"
      shift 2
      ;;
    --tag)
      TAG_NAME="$2"
      shift 2
      ;;
    --no-tag)
      NO_TAG=1
      shift
      ;;
    --no-push)
      NO_PUSH=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BRANCH" || -z "$COMMIT_MESSAGE" ]]; then
  echo "--branch and --message are required." >&2
  usage
  exit 1
fi

if git ls-files --error-unmatch php-backend/api/.env.php >/dev/null 2>&1; then
  echo "Refusing release: php-backend/api/.env.php is tracked. Remove it from git history/index first." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "Current branch is '$CURRENT_BRANCH'. Switch to '$BRANCH' before release." >&2
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "git status"
  echo "git add -A"
  echo "git commit -m \"$COMMIT_MESSAGE\""
  if [[ "$NO_PUSH" -eq 0 ]]; then
    echo "git push $REMOTE $BRANCH"
  fi
  if [[ "$NO_TAG" -eq 0 && -n "$TAG_NAME" ]]; then
    echo "git tag -a $TAG_NAME -m \"Release $TAG_NAME\""
    if [[ "$NO_PUSH" -eq 0 ]]; then
      echo "git push $REMOTE $TAG_NAME"
    fi
  fi
  exit 0
fi

git status
git add -A
if git diff --cached --quiet; then
  echo "No staged changes to commit." >&2
else
  git commit -m "$COMMIT_MESSAGE"
fi

if [[ "$NO_PUSH" -eq 0 ]]; then
  git push "$REMOTE" "$BRANCH"
fi

if [[ "$NO_TAG" -eq 0 && -n "$TAG_NAME" ]]; then
  git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
  if [[ "$NO_PUSH" -eq 0 ]]; then
    git push "$REMOTE" "$TAG_NAME"
  fi
fi

echo "Release workflow completed."
