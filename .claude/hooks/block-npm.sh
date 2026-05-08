#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Check if the command uses npm or npx (as a command, not just mentioned in a string)
if echo "$COMMAND" | grep -qE '(^|&&|\|\||;)\s*(npm|npx)\s'; then
    echo "Blocked: Use bun/bunx, not npm/npx." >&2
    exit 2
fi

exit 0