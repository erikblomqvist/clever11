#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only check run_shell_command
if [[ "$TOOL_NAME" != "run_shell_command" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

if echo "$COMMAND" | grep -q 'git commit'; then
    RESULT=$(bun lint 2>&1)
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        # Escape newlines for JSON
        ESCAPED_RESULT=$(echo "$RESULT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
        echo "{\"decision\":\"deny\",\"reason\":$ESCAPED_RESULT}"
        exit 0
    fi
fi

echo '{"decision": "allow"}'
exit 0
