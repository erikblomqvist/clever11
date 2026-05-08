#!/bin/bash
# Block `git -C <project_dir>` when it's redundant (already in that dir).
# Forces the model to drop `-C` so existing allowlist patterns match.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Match `git -C <path>` (uppercase -C only; lowercase -c is git config override)
if [[ "$COMMAND" =~ (^|[[:space:]\;&|])git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
    RAW_PATH="${BASH_REMATCH[2]}"
    # Strip surrounding quotes if any
    RAW_PATH="${RAW_PATH%\"}"; RAW_PATH="${RAW_PATH#\"}"
    RAW_PATH="${RAW_PATH%\'}"; RAW_PATH="${RAW_PATH#\'}"

    ABS_PATH=$(cd "$RAW_PATH" 2>/dev/null && pwd -P)
    PROJECT_ABS=$(cd "$CLAUDE_PROJECT_DIR" 2>/dev/null && pwd -P)

    if [ -n "$ABS_PATH" ] && [ "$ABS_PATH" = "$PROJECT_ABS" ]; then
        echo "Blocked: you're already in $PROJECT_ABS — drop the \`-C $RAW_PATH\` and run the git command directly. The redundant -C breaks permission allowlist patterns." >&2
        exit 2
    fi
fi

exit 0
