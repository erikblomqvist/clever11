# Soft-hyphen pipeline for `questions.options_json`

Long Swedish compound words on the wheel's answer blobs would overflow the
narrow slot. CSS `hyphens: auto` doesn't help — the browser's hyphenation
dictionary doesn't know Swedish compound boundaries. So we inject soft
hyphens (`U+00AD`) into the option strings at compound and syllable
boundaries, and `.answer-text` in `QuestionWheel.svelte` is set to
`hyphens: manual` so the browser honours our explicit breakpoints (and
only those). They're invisible until the browser actually needs them to
wrap.

## Files

| File            | Tracked | Role                                                                                  |
| --------------- | ------- | ------------------------------------------------------------------------------------- |
| `words.csv`     | no      | Discovery export from the DB. Regenerable; gitignored.                                |
| `proposals.csv` | yes     | Human-reviewed `long_word, hyphenated, confidence, note`. The irreplaceable artifact. |
| `apply.sql`     | yes     | Idempotent UPDATE that inserts soft hyphens, sourced from `proposals.csv`.            |

## Workflow

1. **Discover.** Run the query in the Supabase SQL editor:

    ```sql
    WITH long_words AS (
      SELECT
        m[1] AS long_word,
        t.elem #>> '{}' AS option_text
      FROM public.questions q
      CROSS JOIN LATERAL
        jsonb_array_elements(q.options_json) WITH ORDINALITY AS t(elem, idx)
      CROSS JOIN LATERAL
        regexp_matches(t.elem #>> '{}', '[[:alpha:]]+', 'g') AS m
      WHERE q.archived_at IS NULL
        AND jsonb_typeof(t.elem) = 'string'
        AND char_length(m[1]) >= 13  -- keep in sync with SOFT_HYPHEN_THRESHOLD_OPTION in src/lib/softHyphens.js
    )
    SELECT long_word, count(*) AS occurrences,
           (array_agg(DISTINCT option_text))[1] AS sample_option
    FROM long_words
    GROUP BY long_word
    ORDER BY long_word;
    ```

    `[[:alpha:]]` is locale-aware (UTF-8 Postgres) — matches `å ä ö` and any
    letter, breaks on digits/spaces/hyphens/existing soft hyphens. **This is
    why the pipeline is idempotent**: words already containing `U+00AD`
    don't appear in the discovery output.

    Export as CSV → `words.csv`.

2. **Propose hyphenations.** Diff the new `words.csv` against the existing
   `proposals.csv`. Only new words need decisions. Prefer compound-boundary
   breaks over syllable breaks; insert multiple breaks where natural so the
   browser has flexibility. Use `confidence` ∈ `{high, medium, low}` and a
   `note` for anything you might want to revisit.

3. **Update `apply.sql`.** Append new `(long_word, hyphenated)` rows to the
   `VALUES` block. Order doesn't matter — the script sorts by length
   descending at execution time so inflected forms (e.g. `huvudpersonens`)
   are processed before their base (`huvudpersonen`).

4. **Run.** Paste `apply.sql` into the Supabase SQL editor and run.

## Supabase + Postgres gotchas

These cost real time the first time around — read before the next run:

- **The Supabase SQL editor auto-commits each run.** Wrapping the UPDATE in
  `BEGIN; … ROLLBACK;` does not give you a preview window. `apply.sql` runs
  as a single auto-committed batch. If you want a preview, use psql or a
  desktop client.

- **`UPDATE … FROM source` collapses multiple matching source rows to one
  update per target row.** Postgres picks one arbitrarily and silently
  drops the rest. If a single question has multiple slots needing edits,
  you must either (a) aggregate edits per question into one row and rebuild
  the entire `options_json` array in the SET clause, or (b) loop. `apply.sql`
  does (a) via `jsonb_object_agg` of edits + `jsonb_agg` reconstruction.

- **The Supabase Table Editor strips `U+00AD` when rendering JSON.** Don't
  trust visual inspection. To verify a slot, query directly:

    ```sql
    SELECT position(chr(173) IN (elem #>> '{}')) > 0 AS has_soft_hyphen
    FROM public.questions q,
         jsonb_array_elements(q.options_json) AS t(elem)
    WHERE q.id = '…';
    ```

## When this scope grows

Today the pipeline only touches `options_json`. If `question_text` or string
entries in `correct_answers_json` ever start overflowing, the discovery
query and the rebuild logic generalise straightforwardly — add another
LATERAL or another column to the rebuild — but the word list (and review
work) is shared, so keep one `proposals.csv` and route all columns through
it.
