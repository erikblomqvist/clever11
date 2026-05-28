<script>
	import { supabase } from '$lib/supabase.js';
	import AdminIcon from './components/AdminIcon.svelte';
	import {
		clearForcedFirstQuestionId,
		getForcedFirstQuestionId,
		setForcedFirstQuestionId,
	} from '$lib/game';

	let deckCount = $state(null);
	let questionCount = $state(null);
	let loading = $state(true);

	const ACTIVITY = [
		{
			verb: 'Edited',
			target: 'Q #214',
			deck: 'Allmänbildning',
			time: '2 min ago',
			icon: 'edit',
			kind: 'edit',
		},
		{
			verb: 'Imported',
			target: '8 questions',
			deck: 'Filmcitat',
			time: '14 min ago',
			icon: 'import',
			kind: 'import',
		},
		{
			verb: 'Archived',
			target: 'Q #88',
			deck: 'Sport',
			time: '47 min ago',
			icon: 'archive',
			kind: 'archive',
		},
		{
			verb: 'Created',
			target: 'Deck "90-talet"',
			deck: null,
			time: '2 hr ago',
			icon: 'plus',
			kind: 'plus',
		},
		{
			verb: 'Edited',
			target: 'Q #102',
			deck: 'Historia',
			time: 'Yesterday',
			icon: 'edit',
			kind: 'edit',
		},
	];

	let forcedQuestionId = $state(getForcedFirstQuestionId() ?? '');
	let forcedQuestionStatus = $state('');
	let savingForcedQuestion = $state(false);
	let forcedActive = $state(!!getForcedFirstQuestionId());

	$effect(() => {
		loadCounts();
	});

	async function loadCounts() {
		loading = true;
		const [decksResult, questionsResult] = await Promise.all([
			supabase.from('decks').select('id', { count: 'exact', head: true }),
			supabase
				.from('questions')
				.select('id', { count: 'exact', head: true }),
		]);
		deckCount = decksResult.count ?? 0;
		questionCount = questionsResult.count ?? 0;
		loading = false;
	}

	async function saveForcedQuestion(/** @type {SubmitEvent} */ event) {
		event.preventDefault();
		const questionId = forcedQuestionId.trim();
		if (!questionId) {
			clearForcedQuestion();
			return;
		}

		savingForcedQuestion = true;
		forcedQuestionStatus = '';
		const { data, error } = await supabase
			.from('questions')
			.select('id, question_text')
			.eq('id', questionId)
			.maybeSingle();
		savingForcedQuestion = false;

		if (error) {
			forcedQuestionStatus = error.message;
			return;
		}
		if (!data) {
			forcedQuestionStatus = 'No question found with that id.';
			return;
		}

		forcedQuestionId = data.id;
		setForcedFirstQuestionId(data.id);
		forcedActive = true;
		forcedQuestionStatus = `Saved: ${data.question_text}`;
	}

	function clearForcedQuestion() {
		forcedQuestionId = '';
		clearForcedFirstQuestionId();
		forcedActive = false;
		forcedQuestionStatus = 'Forced first question cleared.';
	}
</script>

<div class="dash">
	<div class="dash__header">
		<h1 class="dash__title">Dashboard</h1>
	</div>

	<div class="dash__cards">
		<a class="entry-card entry-card--lime" href="/admin/decks">
			<div class="entry-card__corner entry-card__corner--lime"></div>
			<div class="entry-card__top">
				<div class="entry-card__icon entry-card__icon--lime">
					<AdminIcon name="deck" size={18} />
				</div>
				<AdminIcon name="arrow" size={16} />
			</div>
			<div class="entry-card__count">
				<span class="mono">{loading ? '–' : deckCount}</span>
			</div>
			<div class="entry-card__label">
				<div class="entry-card__name">Decks</div>
				<div class="entry-card__hint">
					Themed collections of questions
				</div>
			</div>
		</a>

		<a class="entry-card entry-card--coral" href="/admin/questions">
			<div class="entry-card__corner entry-card__corner--coral"></div>
			<div class="entry-card__top">
				<div class="entry-card__icon entry-card__icon--coral">
					<AdminIcon name="question" size={18} />
				</div>
				<AdminIcon name="arrow" size={16} />
			</div>
			<div class="entry-card__count">
				<span class="mono">{loading ? '–' : questionCount}</span>
			</div>
			<div class="entry-card__label">
				<div class="entry-card__name">Questions</div>
				<div class="entry-card__hint">
					{#if !loading && questionCount != null}
						{questionCount} published
					{:else}
						Manage questions
					{/if}
				</div>
			</div>
		</a>
	</div>

	<div class="dash__bottom">
		<div class="activity-card">
			<div class="activity-card__header">
				<div>
					<div class="activity-card__title">Recent activity</div>
					<div class="activity-card__subtitle">Last 24 hours</div>
				</div>
			</div>
			<div class="activity-feed">
				{#each ACTIVITY as item, i}
					<div class="activity-row">
						<div
							class="activity-row__icon"
							class:activity-row__icon--import={item.kind ===
								'import'}
							class:activity-row__icon--plus={item.kind ===
								'plus'}
						>
							<AdminIcon name={item.icon} size={13} />
						</div>
						<div class="activity-row__body">
							<div class="activity-row__text">
								<span class="activity-row__verb"
									>{item.verb}</span
								>
								{item.target}
							</div>
							<div class="activity-row__meta">
								<span>{item.time}</span>
								{#if item.deck}
									<span class="activity-row__dot"></span>
									<span>{item.deck}</span>
								{/if}
							</div>
						</div>
						<div class="activity-row__caret">
							<AdminIcon name="caret" size={14} />
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="dash__side">
			<a class="users-tile" href="/admin/users">
				<div class="users-tile__icon">
					<AdminIcon name="users" size={15} />
				</div>
				<div class="users-tile__body">
					<div class="users-tile__name">Users &amp; access</div>
					<div class="users-tile__hint">Manage admin access</div>
				</div>
				<div class="users-tile__caret">
					<AdminIcon name="caret" size={14} />
				</div>
			</a>

			<form class="dev-panel" onsubmit={saveForcedQuestion}>
				<div class="dev-panel__header">
					<AdminIcon name="bolt" size={13} />
					<span class="dev-panel__title">Force first question</span>
					<span class="dev-panel__badge">Dev tool</span>
				</div>
				<div class="dev-panel__desc">
					Pin a specific question as the first card on the next game.
					Stored locally.
				</div>
				<input
					class="dev-panel__input"
					type="text"
					placeholder="question id"
					bind:value={forcedQuestionId}
					disabled={savingForcedQuestion}
				/>
				<div class="dev-panel__actions">
					<button
						class="dev-panel__btn dev-panel__btn--apply"
						type="submit"
						disabled={savingForcedQuestion}
					>
						{savingForcedQuestion ? 'Saving…' : 'Apply'}
					</button>
					<button
						class="dev-panel__btn dev-panel__btn--clear"
						type="button"
						onclick={clearForcedQuestion}
						disabled={savingForcedQuestion}
					>
						Clear
					</button>
					{#if forcedActive && forcedQuestionId}
						<span class="dev-panel__pill">
							<span class="dev-panel__pill-dot"></span>
							active · #{forcedQuestionId.slice(0, 8)}
						</span>
					{/if}
				</div>
				{#if forcedQuestionStatus}
					<div class="dev-panel__status">{forcedQuestionStatus}</div>
				{/if}
			</form>
		</div>
	</div>

	<div class="dash__mobile-activity">
		<div class="dash__section-label upper">Recent activity</div>
		<div class="activity-card activity-card--mobile">
			<div class="activity-feed">
				{#each ACTIVITY.slice(0, 5) as item}
					<div class="activity-row activity-row--compact">
						<div
							class="activity-row__icon activity-row__icon--sm"
							class:activity-row__icon--import={item.kind ===
								'import'}
							class:activity-row__icon--plus={item.kind ===
								'plus'}
						>
							<AdminIcon name={item.icon} size={11} />
						</div>
						<div
							class="activity-row__text activity-row__text--compact"
						>
							<span class="activity-row__verb">{item.verb}</span>
							{item.target}
						</div>
						<span class="activity-row__time">{item.time}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="dash__mobile-dev">
		<div class="dash__section-label upper">Dev tools</div>
		<form class="dev-panel" onsubmit={saveForcedQuestion}>
			<div class="dev-panel__header">
				<AdminIcon name="bolt" size={13} />
				<span class="dev-panel__title">Force first question</span>
			</div>
			<div class="dev-panel__desc">
				Pin a question to start the next game.
			</div>
			<input
				class="dev-panel__input"
				type="text"
				placeholder="question id"
				bind:value={forcedQuestionId}
				disabled={savingForcedQuestion}
			/>
			<div class="dev-panel__actions dev-panel__actions--mobile">
				<button
					class="dev-panel__btn dev-panel__btn--apply dev-panel__btn--fill"
					type="submit"
					disabled={savingForcedQuestion}
				>
					{savingForcedQuestion ? 'Saving…' : 'Apply'}
				</button>
				<button
					class="dev-panel__btn dev-panel__btn--clear dev-panel__btn--fill"
					type="button"
					onclick={clearForcedQuestion}
					disabled={savingForcedQuestion}
				>
					Clear
				</button>
			</div>
			{#if forcedQuestionStatus}
				<div class="dev-panel__status">{forcedQuestionStatus}</div>
			{/if}
		</form>
	</div>
</div>

<style>
	/* ─── Dashboard layout ──────────────────────────────────────────────── */

	.dash {
		max-width: 960px;
	}

	.dash__header {
		margin-bottom: 24px;
	}

	.dash__title {
		margin: 0;

		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	/* ─── Entry cards grid ──────────────────────────────────────────────── */

	.dash__cards {
		display: grid;
		margin-bottom: 20px;

		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}

	.entry-card {
		display: flex;
		position: relative;
		overflow: hidden;
		min-height: 168px;
		padding: 20px 22px;

		text-decoration: none;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);

		transition: border-color 80ms ease;

		flex-direction: column;
		gap: 16px;
	}

	.entry-card:hover {
		border-color: var(--border-strong);
	}

	.entry-card__corner {
		position: absolute;
		top: 0;
		right: 0;
		width: 160px;
		height: 160px;

		pointer-events: none;
	}

	.entry-card__corner--lime {
		background: radial-gradient(
			circle at 100% 0%,
			var(--accent-soft),
			transparent 60%
		);
	}

	.entry-card__corner--coral {
		background: radial-gradient(
			circle at 100% 0%,
			var(--accent-2-soft),
			transparent 60%
		);
	}

	.entry-card__top {
		display: flex;
		position: relative;
		align-items: center;

		justify-content: space-between;
	}

	.entry-card__top :global(svg:last-child) {
		color: var(--fg-faint);
	}

	.entry-card__icon {
		display: grid;
		width: 36px;
		height: 36px;

		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		place-items: center;
	}

	.entry-card__icon--lime {
		color: var(--accent);
		background: var(--accent-soft);
		border-color: var(--border-accent);
	}

	.entry-card__icon--coral {
		color: var(--accent-2);
		background: var(--accent-2-soft);
		border-color: var(--border-accent-2);
	}

	.entry-card__count {
		position: relative;

		font-size: 40px;
		font-weight: 500;
		letter-spacing: -0.04em;
		line-height: 1;
	}

	.entry-card__label {
		position: relative;
	}

	.entry-card__name {
		margin-bottom: 3px;

		font-size: 15px;
		font-weight: 500;
	}

	.entry-card__hint {
		font-size: 13px;

		color: var(--fg-mute);
	}

	/* ─── Bottom grid: activity + side ───────────────────────────────────── */

	.dash__bottom {
		display: grid;

		grid-template-columns: 1.6fr 1fr;
		gap: 14px;
	}

	/* ─── Activity card ─────────────────────────────────────────────────── */

	.activity-card {
		overflow: hidden;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);
	}

	.activity-card__header {
		display: flex;
		padding: 16px 18px;
		align-items: center;

		border-bottom: 1px solid var(--border);
	}

	.activity-card__title {
		font-size: 14.5px;
		font-weight: 500;
	}

	.activity-card__subtitle {
		margin-top: 2px;

		font-size: 12px;

		color: var(--fg-faint);
	}

	/* ─── Activity feed rows ────────────────────────────────────────────── */

	.activity-feed {
		display: flex;

		flex-direction: column;
	}

	.activity-row {
		display: grid;
		padding: 12px 16px;
		align-items: center;

		font-size: 13px;

		border-top: 1px solid var(--border);

		grid-template-columns: 34px 1fr auto;
		gap: 12px;
	}

	.activity-row:first-child {
		border-top: none;
	}

	.activity-row__icon {
		display: grid;
		width: 28px;
		height: 28px;

		color: var(--fg-mute);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.activity-row__icon--import {
		color: var(--accent-2);
		background: var(--accent-2-soft);
	}

	.activity-row__icon--plus {
		color: var(--accent);
		background: var(--accent-soft);
	}

	.activity-row__body {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 2px;
	}

	.activity-row__text {
		overflow: hidden;
		min-width: 0;

		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.activity-row__verb {
		color: var(--fg-mute);
	}

	.activity-row__meta {
		display: flex;
		align-items: center;

		font-size: 11.5px;

		color: var(--fg-faint);

		gap: 8px;
	}

	.activity-row__dot {
		display: inline-block;
		width: 2px;
		height: 2px;

		background: var(--border-strong);
		border-radius: 50%;
	}

	.activity-row__caret {
		color: var(--fg-faint);
	}

	/* Compact mobile rows */

	.activity-row--compact {
		padding: 10px 12px;

		font-size: 12.5px;

		grid-template-columns: 24px 1fr auto;
		gap: 10px;
	}

	.activity-row__icon--sm {
		width: 24px;
		height: 24px;
	}

	.activity-row__text--compact {
		overflow: hidden;
		min-width: 0;

		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.activity-row__time {
		font-size: 11px;

		color: var(--fg-faint);
	}

	/* ─── Side column ───────────────────────────────────────────────────── */

	.dash__side {
		display: flex;

		flex-direction: column;
		gap: 14px;
	}

	/* ─── Users tile ────────────────────────────────────────────────────── */

	.users-tile {
		display: flex;
		padding: 14px 16px;
		align-items: center;

		text-decoration: none;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);

		transition: border-color 80ms ease;

		gap: 12px;
	}

	.users-tile:hover {
		border-color: var(--border-strong);
	}

	.users-tile__icon {
		display: grid;
		width: 32px;
		height: 32px;

		color: var(--fg-mute);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.users-tile__body {
		min-width: 0;

		flex: 1;
	}

	.users-tile__name {
		font-size: 13.5px;
		font-weight: 500;
	}

	.users-tile__hint {
		margin-top: 2px;

		font-size: 12px;

		color: var(--fg-mute);
	}

	.users-tile__caret {
		color: var(--fg-faint);
	}

	/* ─── Dev panel (force first question) ──────────────────────────────── */

	.dev-panel {
		padding: 14px 16px;

		background: transparent;
		border: 1px dashed var(--border-strong);
		border-radius: var(--r-3);
	}

	.dev-panel__header {
		display: flex;
		margin-bottom: 4px;
		align-items: center;

		color: var(--fg-faint);

		gap: 8px;
	}

	.dev-panel__title {
		font-size: 13px;
		font-weight: 500;

		color: var(--fg);
	}

	.dev-panel__badge {
		margin-left: auto;

		font-size: 10.5px;

		color: var(--fg-faint);
	}

	.dev-panel__desc {
		margin-bottom: 12px;

		font-size: 12px;

		color: var(--fg-mute);
	}

	.dev-panel__input {
		display: block;
		width: 100%;
		height: 38px;
		margin-bottom: 10px;
		padding: 0 10px;

		font-size: 13px;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);
	}

	.dev-panel__input::placeholder {
		color: var(--fg-faint);
	}

	.dev-panel__actions {
		display: flex;
		align-items: center;

		gap: 8px;
	}

	.dev-panel__btn {
		height: 30px;
		padding: 0 12px;

		font-size: 12px;

		border-radius: var(--r-2);
		cursor: pointer;

		transition:
			background 80ms ease,
			border-color 80ms ease;
	}

	.dev-panel__btn--apply {
		color: var(--fg);
		background: var(--surface-2);
		border: 1px solid var(--border);
	}

	.dev-panel__btn--apply:hover {
		background: var(--surface-hover);
	}

	.dev-panel__btn--clear {
		color: var(--fg-mute);
		background: transparent;
		border: 1px solid transparent;
	}

	.dev-panel__btn--clear:hover {
		color: var(--fg);
		background: var(--surface);
	}

	.dev-panel__btn--fill {
		flex: 1;

		height: 34px;
	}

	.dev-panel__btn:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.dev-panel__pill {
		display: inline-flex;
		margin-left: auto;
		padding: 3px 8px;
		align-items: center;

		font-size: 11px;

		color: var(--accent-2);
		background: var(--accent-2-soft);
		border: 1px solid var(--border-accent-2);
		border-radius: 99px;

		gap: 6px;
	}

	.dev-panel__pill-dot {
		display: inline-block;
		width: 5px;
		height: 5px;

		background: var(--accent-2);
		border-radius: 50%;
	}

	.dev-panel__status {
		margin-top: 8px;

		font-size: 12px;

		color: var(--fg-mute);
	}

	.dev-panel__actions--mobile {
		display: flex;

		gap: 6px;
	}

	/* ─── Mobile sections (hidden on desktop) ───────────────────────────── */

	.dash__mobile-activity,
	.dash__mobile-dev {
		display: none;
	}

	.dash__section-label {
		margin-bottom: 10px;

		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.06em;

		color: var(--fg-faint);
	}

	.activity-card--mobile {
		border-radius: var(--r-3);
	}

	/* ─── Responsive ────────────────────────────────────────────────────── */

	@media (max-width: 768px) {
		.dash__title {
			font-size: 22px;
		}

		.dash__cards {
			grid-template-columns: 1fr;
		}

		.entry-card {
			min-height: 0;
			padding: 14px;

			flex-direction: row;
			align-items: center;
			gap: 14px;
		}

		.entry-card__corner {
			display: none;
		}

		.entry-card__top {
			flex-shrink: 0;
		}

		.entry-card__top :global(svg:last-child) {
			display: none;
		}

		.entry-card__icon {
			width: 40px;
			height: 40px;
		}

		.entry-card__count {
			font-size: 22px;
			text-align: right;

			order: 3;
		}

		.entry-card__label {
			min-width: 0;

			flex: 1;
		}

		.entry-card__name {
			font-size: 14px;
		}

		.entry-card__hint {
			font-size: 12px;
		}

		.dash__bottom {
			display: none;
		}

		.dash__mobile-activity {
			display: block;
			margin-top: 24px;
		}

		.dash__mobile-dev {
			display: block;
			margin-top: 22px;
		}
	}
</style>
