#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

if [[ "$FILE_PATH" == *.js || "$FILE_PATH" == *.svelte ]]; then
    bunx eslint --fix "$FILE_PATH" 2>/dev/null
fi

exit 0
