#!/bin/bash
# Block `git -C <project_dir>` when it's redundant (already in that dir).
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd')

# Only check run_shell_command
if [[ "$TOOL_NAME" != "run_shell_command" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# Match `git -C <path>`
if [[ "$COMMAND" =~ (^|[[:space:]\;&|])git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
    RAW_PATH="${BASH_REMATCH[2]}"
    # Strip surrounding quotes if any
    RAW_PATH="${RAW_PATH%\"}"; RAW_PATH="${RAW_PATH#\"}"
    RAW_PATH="${RAW_PATH%\'}"; RAW_PATH="${RAW_PATH#\'}"

    ABS_PATH=$(cd "$RAW_PATH" 2>/dev/null && pwd -P)
    PROJECT_ABS=$(cd "$PROJECT_DIR" 2>/dev/null && pwd -P)

    if [ -n "$ABS_PATH" ] && [ "$ABS_PATH" = "$PROJECT_ABS" ]; then
        echo "{\"decision\": \"deny\", \"reason\": \"Blocked: you're already in $PROJECT_ABS — drop the \`-C $RAW_PATH\` and run the git command directly.\"}"
        exit 0
    fi
fi

echo '{"decision": "allow"}'
exit 0
