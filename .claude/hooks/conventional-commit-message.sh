#!/bin/bash
INPUT=$(cat)

INPUT_JSON="$INPUT" python3 - <<'PY'
import json
import os
import re
import shlex
import sys
from pathlib import Path

payload = json.loads(os.environ.get("INPUT_JSON", "{}"))
command = payload.get("tool_input", {}).get("command", "")

if "git commit" not in command:
    sys.exit(0)

allowed_types = (
    "build",
    "chore",
    "ci",
    "docs",
    "feat",
    "fix",
    "perf",
    "refactor",
    "revert",
    "style",
    "test",
)

subject_pattern = re.compile(
    rf"^({'|'.join(allowed_types)})(\([a-z0-9][a-z0-9._-]*\))?!?: .+"
)


def block(reason: str) -> None:
    print(json.dumps({"decision": "block", "reason": reason}))
    sys.exit(0)


def first_subject(message: str) -> str:
    for line in message.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


def heredoc_messages(shell_command: str) -> list[str]:
    messages = []
    heredoc_re = re.compile(
        r"(?:^|\s)(?:-m|--message)\s+['\"]?\$\(cat\s+<<['\"]?([A-Za-z0-9_]+)['\"]?\n(.*?)\n\1\n?\)['\"]?",
        re.DOTALL,
    )
    for match in heredoc_re.finditer(shell_command):
        messages.append(match.group(2))
    return messages


def shlex_messages(shell_command: str) -> list[str]:
    try:
        tokens = shlex.split(shell_command, posix=True)
    except ValueError:
        return []

    if "--no-edit" in tokens:
        sys.exit(0)

    messages = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token in ("-m", "--message"):
            if i + 1 < len(tokens):
                messages.append(tokens[i + 1])
                i += 2
                continue
        elif token.startswith("--message="):
            messages.append(token.split("=", 1)[1])
        elif token.startswith("-m") and token != "-m":
            messages.append(token[2:])
        elif token in ("-F", "--file"):
            if i + 1 < len(tokens):
                path = Path(tokens[i + 1])
                if not path.is_absolute():
                    path = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).joinpath(path)
                try:
                    messages.append(path.read_text())
                except OSError:
                    block(
                        "Could not read the commit message file passed to git commit. "
                        "Use `git commit -m` with a Conventional Commit subject."
                    )
                i += 2
                continue
        elif token.startswith("--file="):
            path = Path(token.split("=", 1)[1])
            if not path.is_absolute():
                path = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).joinpath(path)
            try:
                messages.append(path.read_text())
            except OSError:
                block(
                    "Could not read the commit message file passed to git commit. "
                    "Use `git commit -m` with a Conventional Commit subject."
                )
        i += 1
    return messages


messages = heredoc_messages(command) or shlex_messages(command)
subject = first_subject(messages[0]) if messages else ""

if not subject:
    block(
        "Commit commands must include an explicit Conventional Commit message. "
        "Read `docs/agents/commit-messages.md` and use `git commit -m`."
    )

if not subject_pattern.match(subject):
    block(
        "Commit subject must follow Conventional Commits v1.0.0. "
        "Read `docs/agents/commit-messages.md` and use a subject like "
        "`feat(admin): add camera audio capture` or `fix(setup): preserve selected deck themes`. "
        f"Current subject: `{subject}`"
    )
PY
