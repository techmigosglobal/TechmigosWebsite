#!/usr/bin/env bash
set -euo pipefail

BLOG_DIR="src/content/blog"
TOTAL=$(ls -1 "$BLOG_DIR"/*.mdx | wc -l | tr -d ' ')

if [[ "$TOTAL" -ne 28 ]]; then
  echo "Expected 28 posts, found $TOTAL"
  exit 1
fi

MISSING_AUTHOR=$(grep -L '^author: "Ravali"' "$BLOG_DIR"/*.mdx || true)
if [[ -n "$MISSING_AUTHOR" ]]; then
  echo "Posts with non-Ravali author:"
  echo "$MISSING_AUTHOR"
  exit 1
fi

MISSING_META=$(for f in "$BLOG_DIR"/*.mdx; do
  grep -q '^category:' "$f" || echo "$f missing category"
  grep -q '^tags:' "$f" || echo "$f missing tags"
  grep -q '^pubDate:' "$f" || echo "$f missing pubDate"
done)
if [[ -n "$MISSING_META" ]]; then
  echo "$MISSING_META"
  exit 1
fi

echo "Blog content verification passed."
