## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on this repo (erikblomqvist/clever11). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.

### Commit messages

When asked to create, amend, squash, or draft a commit, use the local Conventional Commits guidance in `docs/agents/commit-messages.md`.

## Testing

Run `bun run test` after any logic change and before committing. Fix all failures before pushing.
