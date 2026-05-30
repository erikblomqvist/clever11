# Commit Messages: Conventional Commits

Use this guide when the user asks you to create, amend, squash, or draft a commit message. Do not fetch the external Conventional Commits spec for routine commits; this repo keeps the needed v1.0.0 guidance here.

Claude CLI also enforces commit subjects with `.claude/hooks/conventional-commit-message.sh` before `git commit` runs.

## Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

- **`feat`**: a user-visible feature or new capability.
- **`fix`**: a bug fix.
- **`docs`**: documentation-only changes.
- **`test`**: tests only, or test infrastructure.
- **`refactor`**: behavior-preserving restructuring.
- **`perf`**: performance improvement.
- **`style`**: formatting or code style only.
- **`build`**: dependencies, build tooling, packaging.
- **`ci`**: CI or release automation.
- **`chore`**: maintenance that does not fit the above.

## Rules

- Use the actual staged diff as the source of truth.
- Prefer a narrow scope when it clarifies ownership, for example `feat(admin): ...` or `fix(setup): ...`.
- Write the description in the imperative mood, lower-case after the type unless a proper noun requires otherwise.
- Keep the subject concise and avoid trailing punctuation.
- Add a body only when the commit needs motivation, trade-offs, or migration notes.
- Mark breaking changes with `!` before the colon, a `BREAKING CHANGE:` footer, or both.
- If one commit would need unrelated types or scopes, split it when practical.

## Examples

```text
feat(admin): add camera audio capture
fix(setup): preserve selected deck themes
docs: document deck setup flow
refactor(import): simplify question validation
feat(api)!: require authenticated deck writes

BREAKING CHANGE: deck writes now require a valid user session.
```
