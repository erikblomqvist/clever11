#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only format if it was a file modification tool
if [[ "$TOOL_NAME" == "replace" || "$TOOL_NAME" == "write_file" ]]; then
    bunx prettier --write "$FILE_PATH" 2>/dev/null || true
fi

echo '{"decision": "allow"}'
exit 0
