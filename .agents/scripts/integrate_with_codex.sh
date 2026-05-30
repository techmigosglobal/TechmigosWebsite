#!/usr/bin/env bash
set -euo pipefail

# Integrate project-local .agents assets with Codex.
# - Symlinks each .agents/skills/<skill>/SKILL.md skill into ~/.codex/skills
# - Optionally links .agents/rules/GEMINI.md into ~/.codex/rules/antigravity.rules

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
SKILLS_SRC="$PROJECT_ROOT/.agents/skills"
SKILLS_DEST="$CODEX_HOME/skills"
RULES_DEST="$CODEX_HOME/rules"
CONFIG_FILE="$CODEX_HOME/config.toml"

mkdir -p "$SKILLS_DEST" "$RULES_DEST"

linked=0
skipped=0

while IFS= read -r -d '' skill_dir; do
  skill_name="$(basename "$skill_dir")"
  target="$SKILLS_DEST/$skill_name"

  if [ -L "$target" ]; then
    current="$(readlink "$target" || true)"
    if [ "$current" = "$skill_dir" ]; then
      skipped=$((skipped + 1))
      continue
    fi
    rm -f "$target"
  elif [ -e "$target" ]; then
    # Preserve existing installed skills instead of overwriting.
    skipped=$((skipped + 1))
    continue
  fi

  ln -s "$skill_dir" "$target"
  linked=$((linked + 1))
done < <(find "$SKILLS_SRC" -mindepth 1 -maxdepth 1 -type d -exec test -f "{}/SKILL.md" \; -print0)

if [ -f "$PROJECT_ROOT/.agents/rules/GEMINI.md" ]; then
  ln -sf "$PROJECT_ROOT/.agents/rules/GEMINI.md" "$RULES_DEST/antigravity.rules"
fi

echo "Codex integration complete."
echo "Project root: $PROJECT_ROOT"
echo "Codex home : $CODEX_HOME"
echo "Skills linked: $linked"
echo "Skills skipped (already present): $skipped"
echo "Rule linked : $RULES_DEST/antigravity.rules"

# Ensure key MCP servers from Antigravity are present.
touch "$CONFIG_FILE"

if ! grep -q '^\[mcp_servers.context7\]' "$CONFIG_FILE"; then
  cat >> "$CONFIG_FILE" <<'EOF'

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
EOF
fi

if ! grep -q '^\[mcp_servers.shadcn\]' "$CONFIG_FILE"; then
  cat >> "$CONFIG_FILE" <<'EOF'

[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]
EOF
fi

if ! grep -q "^\[projects.\"$PROJECT_ROOT\"\]" "$CONFIG_FILE"; then
  cat >> "$CONFIG_FILE" <<EOF

[projects."$PROJECT_ROOT"]
trust_level = "trusted"
EOF
fi

echo
echo "Restart Codex to pick up newly linked skills."
