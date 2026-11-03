#!/usr/bin/env bash
# Checks that the build is the one small, self-contained file people download.
# Run it from the repository root after `npm run build`. Used by ci.yml and release.yml.
set -euo pipefail

dist="${1:-dist}"
file="$dist/index.html"

# 1. Exactly one file in the build folder.
count="$(find "$dist" -type f | wc -l | tr -d ' ')"
if [ "$count" -ne 1 ] || [ ! -f "$file" ]; then
  echo "::error::$dist should hold only index.html, but it holds $count file(s)."
  find "$dist" -type f
  exit 1
fi

# 2. Under the 3 MB budget.
size="$(wc -c < "$file" | tr -d ' ')"
if [ "$size" -ge 3000000 ]; then
  echo "::error::index.html is $size bytes. The budget is under 3,000,000."
  exit 1
fi

# 3. No script or stylesheet comes from anywhere but the file itself. Only the data: icon is linked.
external="$(grep -Eo '<(script|link)[^>]*(src|href)="[^"]{0,60}' "$file" | grep -Ev '(src|href)="data:' || true)"
if [ -n "$external" ]; then
  echo "::error::index.html loads something from outside itself:"
  echo "$external"
  exit 1
fi

echo "index.html is one self-contained file of $size bytes."
