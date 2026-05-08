#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only lint .js files
if [[ "$FILE_PATH" == *.js ]]; then
    bun lint --fix "$FILE_PATH" 2>/dev/null
fi

exit 0
