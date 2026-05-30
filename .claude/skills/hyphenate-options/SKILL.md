---
name: hyphenate-options
description: Insert soft hyphens (U+00AD) into long Swedish words in questions.options_json so the wheel's answer blobs wrap instead of overflowing. Use when the user mentions new questions overflowing the wheel, says "rerun hyphenation", asks to hyphenate options, or imports a new deck of Swedish questions.
---

# Hyphenate `questions.options_json`

The wheel's `.answer-text` slot in `src/lib/components/QuestionWheel.svelte`
is narrow (≈12 characters at the widest font size for a 10-option wheel).
Long Swedish compound words overflow it. CSS `hyphens: auto` doesn't help
because the browser's hyphenation dictionary doesn't know Swedish compound
boundaries. The fix is to inject soft hyphens (U+00AD) at compound and
syllable boundaries — invisible until the browser uses them to wrap.

The full workflow, files, and gotchas live in
[`scripts/hyphenation/README.md`](../../../scripts/hyphenation/README.md).
**Read that file first** when this skill is invoked — it is the source of
truth for the discovery query, the `apply.sql` pattern, and the Supabase
gotchas. This SKILL.md is the trigger + decision record, not a duplicate.

## When to invoke

- The user reports new long Swedish words overflowing the wheel.
- A new question deck was imported and the user wants to rehyphenate.
- The user says "rerun the hyphenation pipeline" or names any of the
  artifact files (`words.csv`, `proposals.csv`, `apply.sql`).

## Locked-in decisions (don't relitigate)

| Decision        | Choice                                                          | Why                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope           | `questions.options_json` only                                   | That's what `.answer-text` renders. `question_text` has more room and hasn't been a problem.                                                                            |
| Word definition | Maximal run of `[[:alpha:]]`                                    | Locale-aware (covers `å ä ö`). Breaks on digits, spaces, hyphens, and existing U+00AD → makes the pipeline idempotent.                                                  |
| Threshold       | `SOFT_HYPHEN_THRESHOLD_OPTION` (13) in `src/lib/softHyphens.js` | Empirically the point at which a single word stops fitting two-line clamp on a 10-option wheel. Question text uses `SOFT_HYPHEN_THRESHOLD_QUESTION_TEXT` (11) in admin. |
| Archive filter  | `WHERE archived_at IS NULL`                                     | Don't waste review effort on dead questions.                                                                                                                            |
| Hyphen density  | Compound boundaries + syllable breaks (multiple per long word)  | Soft hyphens are invisible until used; more breakpoints = more wrap flexibility, no visual cost.                                                                        |
| Confidence axis | `{high, medium, low}` in `proposals.csv`                        | `medium` for non-compound syllable judgement calls (Latin/Greek roots, foreign proper nouns). `low` for words I can't confidently break — flag for the user.            |

If the user wants to change any of these (e.g. lower the threshold to 11,
or extend scope to `question_text`), update the decision table here and the
discovery query in `scripts/hyphenation/README.md` at the same time.

## How a typical run goes

1. Ask the user to run the discovery query from
   `scripts/hyphenation/README.md` and save the export to
   `scripts/hyphenation/words.csv`.
2. Diff against the existing `proposals.csv`. **Only propose hyphenations
   for new words.** Existing rows are already-reviewed human decisions —
   don't rewrite them.
3. For new words, write proposals into `proposals.csv` (one row per word,
   length-sorted append is fine). Default to compound boundary breaks +
   syllable subdivision for long morphemes. Flag uncertainty in the `note`.
4. Append new `(long_word, hyphenated)` rows to the `VALUES` block in
   `apply.sql`. Order in the file doesn't matter — the query sorts at
   runtime.
5. User runs `apply.sql` in the Supabase SQL editor. The final `SELECT`
   reports the total count of slots now containing U+00AD.
6. Verify a known-affected question with the direct-SQL check in
   `README.md` (the Table Editor strips U+00AD on display — never trust
   visual inspection).

## Hard-won landmines

These are explicitly called out in the README, but worth restating here so
the skill carries the warning into any future invocation:

- **Don't trust `BEGIN;` in the Supabase SQL editor.** It auto-commits each
  run. The `apply.sql` is written without transaction wrapping for that
  reason. If a user asks for a preview, point them at psql, not the web
  editor.
- **Never write `UPDATE … FROM source` where `source` has multiple rows per
  target row.** Postgres silently picks one and drops the rest. Aggregate
  per-target first and rebuild the JSONB array in the SET clause (see the
  `per_question` / `jsonb_agg` pattern in `apply.sql`).
- **The Supabase Table Editor strips U+00AD from rendered JSON.** Visual
  inspection will make you think the UPDATE failed when it succeeded.
  Always verify with `position(chr(173) IN …)` SQL.

## What this skill does not own

- Schema changes — those go in `supabase/migrations/`.
- Hyphenating `question_text` or `correct_answers_json` — same word list
  would apply, but the rebuild needs an extension. Not done yet.
- The `QuestionWheel.svelte` CSS that consumes the soft hyphens —
  specifically `.answer-text { hyphens: manual; }` (honours our explicit
  U+00AD breakpoints and nothing else) and the existing
  `overflow-wrap: break-word` on `.question p`. Soft hyphens are the input
  to that CSS; if those properties change, this skill's output may stop
  having the intended effect.
