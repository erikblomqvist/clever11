---
name: triage
description: Refine a single `needs-triage` GitHub issue into a fully-spec'd PRD or chore body, then swap the label to a terminal triage state. Use when the user invokes /triage or wants to triage a `needs-triage` issue.
---

# Triage

Refine a single `needs-triage` GitHub issue and transition it to a terminal state (`ready-for-agent`, `ready-for-human`, or `wontfix`). Composes `grill-with-docs` and writes the result back in place on the existing issue.

Issue-tracker conventions: `docs/agents/issue-tracker.md`. Triage label vocabulary: `docs/agents/triage-labels.md`.

## Invocation

- `/triage <N>` — triage issue #N.
- `/triage` — list the 5 latest open `needs-triage` issues (`gh issue list --label needs-triage --state open --limit 5 --json number,title`) and prompt the user to pick one.

## Preconditions

Fetch the issue: `gh issue view <N> --json number,title,body,labels,state,comments`.

If the issue is closed, or lacks the `needs-triage` label, warn the user and ask whether to proceed (re-triage / reopen). If they decline, abort.

## Step 1 — Mode

Ask the user once, up-front:

> "Code change for an agent (PRD, `ready-for-agent`) or a HITL chore (checklist, `ready-for-human`)?"

This decides the body template and shapes the grill.

## Step 2 — Grill

Conduct a grill following the methodology in `.claude/skills/grill-with-docs/SKILL.md`. Treat the existing issue body as the plan being grilled. Reconcile against `CONTEXT.md` and `docs/adr/` as that skill specifies.

At any point during the grill, if the user signals "wontfix" (dupe, bad idea, conflicts with an ADR), jump to the **Wontfix exit** below — don't force the grill to completion.

## Step 3a — Draft PRD body (agent mode)

Use the PRD template from `.claude/skills/to-prd/SKILL.md` verbatim. Do **not** create a new issue — you will update #N in place.

## Step 3b — Draft chore body (human mode)

Use this template:

```markdown
## What to build

<one paragraph>

## Acceptance criteria

- [ ] ...
- [ ] ...

## Blocked by

<deps or "None">
```

## Step 4 — Append original capture

At the bottom of the new body:

```markdown
<details>
<summary>Original capture</summary>

<verbatim original body>

</details>
```

## Step 5 — Title

Derive a clean title from the new body's `## Problem Statement` (PRD) or `## What to build` (chore). Strip any `Untriaged:` prefix. Fix obvious typos and truncations.

## Step 6 — Preview and confirm

Show the user the proposed new title, the full proposed new body, and the terminal label. Wait for confirmation. Apply any edits, re-preview, confirm again.

## Step 7 — Atomic write

Write the body to a tempfile (to avoid shell-escaping markdown), then:

```bash
gh issue edit <N> --title "<new title>" --body-file <tmpfile> \
  --remove-label needs-triage --add-label <terminal-label>
```

## Wontfix exit

1. Draft a 1–3 sentence comment summarising why (dupe, bad idea, conflicting ADR, etc).
2. Preview the comment and confirm.
3. Run:

```bash
gh issue edit <N> --remove-label needs-triage --add-label wontfix
gh issue close <N> --reason "not planned" --comment "<reasoning>"
```

Do not rewrite title or body — the issue is closed.

## Out of scope

- **Splitting one issue into many.** Exit via wontfix with comment "split", run `/to-issues` separately.
- **Implementation.** Done in a separate skill invocation (`/prototype`, `/tdd`) once the issue is `ready-for-agent`.
