#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only lint .js files after modification
if [[ "$TOOL_NAME" == "replace" || "$TOOL_NAME" == "write_file" ]]; then
    if [[ "$FILE_PATH" == *.js ]]; then
        bun lint --fix "$FILE_PATH" 2>/dev/null || true
    fi
fi

echo '{"decision": "allow"}'
exit 0
