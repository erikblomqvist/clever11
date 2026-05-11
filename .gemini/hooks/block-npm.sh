#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only check run_shell_command
if [[ "$TOOL_NAME" != "run_shell_command" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# Check if the command uses npm or npx
if echo "$COMMAND" | grep -qE '(^|&&|\|\||;)\s*(npm|npx)\s'; then
    echo '{"decision": "deny", "reason": "Blocked: Use bun/bunx, not npm/npx."}'
    exit 0
fi

echo '{"decision": "allow"}'
exit 0
