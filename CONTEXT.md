# Clever 11

A digital adaptation of a trivia board game where players take turns answering questions from a 10-option wheel, building streaks for points until they bust or pass.

## Language

### Game structure

**Game**:
A complete play session from setup to finish, identified by a 5-character code (A-Z/0-9). Persisted to Supabase for resumability.
_Avoid_: Match, Session

**Round**:
One question card on the wheel. Players take turns revealing blobs until all are answered or all players are eliminated. A game consists of many rounds.
_Avoid_: Turn (a turn is one player's action within a round)

**Turn**:
A single player's opportunity to act within a round — they can reveal a blob or pass. When a **Turn Timer** is enabled, each turn has its own countdown; the timer resets after every reveal.
_Avoid_: Round (which is the full card)

**Turn Timer**:
An optional game-wide setting that limits each **Turn** to a fixed number of seconds (10–600, default 60). Configured during **Setup**; off by default. When enabled, the timer starts when a player becomes active and resets after each **Reveal**. If the timer expires before the player acts, the game automatically **Passes** for them.
_Avoid_: Clock, Countdown, Time limit

**Win Score**:
The point threshold to win the game (fixed at 50). First player to reach it after a round ends wins.
_Avoid_: Target score, Goal

### Players

**Player**:
A participant in the game, with a name, icon, color, seat position, and turn order.
_Avoid_: User (reserved for admin accounts)

**Player Status**:
A per-round marker indicating whether a player can still act: `active` (can answer), `passed` (chose to skip, keeps round score), `out` (answered wrong, round score reset to 0), or `removed` (soft-deleted from the game, permanently skipped). All non-removed players reset to `active` at the start of each round.
_Avoid_: State

**Seat Position**:
A fixed position (0-7) around the screen edge, 45 degree increments clockwise from top. Determines screen rotation when it's that player's turn. Independent of turn order.
_Avoid_: Position (ambiguous)

**Turn Order**:
An integer (0-7) determining the clockwise sequence in which players take turns. Independent of seat position.
_Avoid_: Player order, Seat order

**Starting Player**:
The player who goes first in a round. Rotates clockwise by turn order each round, unless every player passed (all-pass), in which case the same player starts again.
_Avoid_: First player

**Roster Change**:
A modification to the player list during **Round Review**: adding a new player, replacing an existing player's identity (name, icon, color — keeps seat, turn order, and scores), or removing a player (soft-delete, status becomes `removed`). Not available during any other phase.
_Avoid_: Player management

**Replace (Player)**:
Swapping the identity (name, icon, color) of an existing player slot. The new person inherits the seat position, turn order, and all accumulated scores.
_Avoid_: Substitute, Swap

### Wheel and blobs

**Wheel**:
The central UI element showing 10 blobs arranged in a circle, one per answer option. Rotates to face the current player's seat position.
_Avoid_: Card, Board

**Blob**:
One of 10 answer slots on the wheel. Can be covered (unrevealed) or revealed. Each blob maps to one option and one correct answer.
_Avoid_: Slot, Tile, Option (option is the text content, blob is the UI element)

**Reveal**:
The act of uncovering a blob to see its answer. Triggers the answer dialog.
_Avoid_: Flip, Open

### Scoring

**Round Score**:
Points accumulated by a player during the current round. Increments by 1 for each correct answer. Resets to 0 if the player answers incorrectly (goes out). Added to total score when the round ends.
_Avoid_: Streak (though it behaves like one)

**Total Score**:
Cumulative points across all rounds. Only increases at round end (total score += round score). Never decreases.
_Avoid_: Score (ambiguous without qualifier), Points

**Bust**:
When a player answers incorrectly — their round score resets to 0 and their status becomes `out`. The risk-reward tension of the game.
_Avoid_: Fail, Lose

**Pass**:
A player's choice to stop answering for the rest of the round, keeping their current round score. Status becomes `passed`.
_Avoid_: Skip (which could imply skipping one blob)

**All-Pass**:
When every player passes without anyone answering. The starting player does not rotate for the next round — the same player starts again.
_Avoid_: Full pass, Everyone passed

**Skip Round**:
A group action available only when no blobs have been revealed and no player has passed (i.e. no actions taken in the round). Behaves identically to an all-pass — all players are set to `passed`, scores are unchanged, and the starting player does not rotate. Transitions to **Round Review** so the group can see the question and optionally vote on it.
_Avoid_: Skip card, Skip question

### Questions

**Question**:
The trivia prompt displayed for a round, with 10 answer options. Drawn from selected decks; not repeated until the pool is exhausted.
_Avoid_: Card (physical game term, ambiguous in digital context)

**Deck**:
A themed collection of questions (e.g. "Original", "Sports"). One or more decks are selected during setup.
_Avoid_: Category, Pack

**Question Type**:
One of 7 types that determine how answers are structured and how the correct answer is validated in the UI:
- `boolean` — Yes/No (e.g. "Is X a Netflix original?")
- `standard` — Free text (e.g. "Home stadium of which team?")
- `rank` — Number 1-10 (e.g. "Actors by height, 1 = tallest")
- `chooseBetween` — Pick from given options (e.g. "Gold, silver, or bronze?")
- `colors` — HSL color (e.g. "Brand signature color?")
- `numbers` — Numeric value (e.g. "Oscar count?")
- `centuryDecade` — Decade string (e.g. "Aired in which decade?")

_Avoid_: Answer type, Category

**Correct Answer**:
The expected answer for a blob. Structure varies by question type — can be a boolean, string, number, or object with text and background color.
_Avoid_: Solution, Right answer

**Answer Media**:
Optional rich media attached to a blob, shown during round review. Can include a generic URL, Spotify embed, YouTube embed, or option image.
_Avoid_: Attachment, Media

**Question Vote**:
An optional thumbs-up or thumbs-down group vote on question quality, cast during **Round Review**. One vote per round, attached to the `question_id`. Toggle behavior — the group can change or deselect their vote before advancing. Persisted when leaving review. Stored in a `question_votes` table for admin analysis.
_Avoid_: Rating, Like

### Game phases

**Setup**:
The 5-step flow before a game begins: players, seating, deck selection, game rules, starting player. Uses view transitions between steps.
_Avoid_: Configuration, Lobby

**Playing**:
The active game phase where rounds are played. Players reveal blobs and score points.
_Avoid_: In-game, Active

**Round Review**:
The phase between rounds where all blob answers and media are visible. The wheel rotates to face the last player who answered; free rotation is allowed. Any player can proceed to the next round. This is also the only phase where roster changes (add, replace, remove players) are allowed.
_Avoid_: Summary, Results

**Finished**:
The game is over — a player has reached the win score. Shows a podium with final scores.
_Avoid_: Game over, Complete

### Interaction

**Answer Dialog**:
A non-dismissable dialog that appears after revealing a blob. Shows the correct answer and forces the group to press Correct or Wrong before continuing. Trust-based — no server validation.
_Avoid_: Result dialog, Popup

**Undo**:
Reversal of the last blob reveal within a round. Restores player score, status, and round state. Only available if no subsequent action has occurred.
_Avoid_: Revert

**Interaction Lock**:
A brief UI lock during animations (blob reveal, wheel rotation) to prevent accidental taps.
_Avoid_: Animation lock, Debounce

## Relationships

- A **Game** contains 2-8 **Players**, one or more **Rounds**, and references one or more **Decks**
- A **Round** has exactly one **Question** drawn from the selected **Decks**
- A **Question** has exactly 10 **Blobs**, each with one answer option and one **Correct Answer**
- A **Blob** may have **Answer Media** (URL, Spotify, YouTube, or image)
- Each **Round** has a **Starting Player** determined by rotating **Turn Order**, except on **All-Pass**
- A **Player** has both a **Seat Position** (visual) and a **Turn Order** (gameplay), which are independent
- **Round Score** accumulates during a round and is added to **Total Score** when the round ends
- A **Player**'s **Status** transitions: `active` -> `passed` (by choice) or `active` -> `out` (by busting); all reset to `active` at round start. A player can also be `removed` (soft-deleted), which is permanent for the rest of the game
- **Roster changes** (add, replace, remove) can only happen during **Round Review**. A game must always have at least 2 active (non-removed) players
- A **Question Vote** belongs to one **Round** and one **Question**. A question accumulates votes across all games it appears in
- A **Skip Round** triggers the same state transitions as an **All-Pass** and always leads to **Round Review**

## Example dialogue

> **Dev:** "What happens when a player taps a blob?"
> **Domain expert:** "The blob is revealed and the **Answer Dialog** pops up showing the **Correct Answer**. The group decides together if the player got it right. They press Correct or Wrong — the dialog can't be dismissed any other way."

> **Dev:** "What if they get it right?"
> **Domain expert:** "Their **Round Score** goes up by 1 and it's still their turn. They can keep going — reveal another blob or **Pass** to bank their score."

> **Dev:** "And if they get it wrong?"
> **Domain expert:** "They **Bust** — **Round Score** drops to 0, status goes to `out`, and the turn moves to the next active player."

> **Dev:** "When does the round end?"
> **Domain expert:** "Either all 10 blobs are revealed, or every player is `passed` or `out`. Then someone taps 'End round,' everyone's **Round Score** gets added to their **Total Score**, and we check for a winner."

> **Dev:** "What if nobody answers — everyone just passes?"
> **Domain expert:** "That's an **All-Pass**. The round ends normally, but the **Starting Player** doesn't rotate for the next round. Same player starts again — it's like the card didn't count."

> **Dev:** "How does turn rotation work within a round?"
> **Domain expert:** "After a player acts — whether they reveal a blob or pass — the turn goes to the next player in **Turn Order** who is still `active`. We skip `passed` and `out` players."

> **Dev:** "Can you undo a mistake?"
> **Domain expert:** "Yes, there's an **Undo** button, but only for the very last reveal. It restores the player's score, status, and which blob was revealed. Once someone else acts, it's too late."

## Flagged ambiguities

- **"Score"** — Ambiguous without qualifier. Always specify **Round Score** (per-round accumulator, resets on bust) or **Total Score** (lifetime sum across rounds, never decreases). The UI shows both.
- **"Turn" vs "Round"** — A **Turn** is one player's action; a **Round** is the full card with all players. The physical board game uses "card" for what we call a round.
- **Seat Position vs Turn Order** — These are deliberately independent. A player can sit at position 6 but have turn order 0 (goes first). Seat position controls screen rotation; turn order controls who plays when.
- **"Pass" vs "Skip"** — A **Pass** eliminates the player from the rest of the round (keeping their score). There is no "skip one blob" mechanic. **Skip Round** is a distinct group action that skips the entire round before anyone acts, behaving as an all-pass.
- **Trust-based validation** — The game has no server-side answer checking. The **Answer Dialog** shows the correct answer and the group collectively decides Correct or Wrong. This is a deliberate design choice matching the physical board game experience.
- **Question pool exhaustion** — When all questions from selected decks have been used, the pool resets and questions can repeat. The `usedQuestionIds` list is cleared, not appended to.
