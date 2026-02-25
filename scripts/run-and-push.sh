#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

NODE="/opt/homebrew/bin/node"
GIT="/usr/bin/git"

"$NODE" scripts/scrape.mjs

"$GIT" add public/menu
"$GIT" commit -m "Update menu $(date '+%Y-%m-%d %H:%M')" || echo "No changes to commit"
"$GIT" push
