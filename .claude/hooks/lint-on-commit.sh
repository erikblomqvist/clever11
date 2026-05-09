#!/bin/bash
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$CMD" | grep -q 'git commit'; then
    RESULT=$(bun lint 2>&1)
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo "{\"decision\":\"block\",\"reason\":\"Lint errors must be fixed before committing:\\n$RESULT\"}"
        exit 0
    fi
fi

exit 0
