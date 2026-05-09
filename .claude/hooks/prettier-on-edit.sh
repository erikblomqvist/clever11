#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

bunx prettier --write "$FILE_PATH" 2>/dev/null || true

exit 0
