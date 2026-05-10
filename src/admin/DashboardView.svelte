<script>
	import { supabase } from '../lib/supabase.js';
	import {
		clearForcedFirstQuestionId,
		getForcedFirstQuestionId,
		setForcedFirstQuestionId,
	} from '../lib/testingOptions.js';

	let forcedQuestionId = $state(getForcedFirstQuestionId() ?? '');
	let forcedQuestionStatus = $state('');
	let savingForcedQuestion = $state(false);

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
		forcedQuestionStatus = `Saved: ${data.question_text}`;
	}

	function clearForcedQuestion() {
		forcedQuestionId = '';
		clearForcedFirstQuestionId();
		forcedQuestionStatus = 'Forced first question cleared.';
	}
</script>

<div class="admin-page">
	<h1 class="admin-page__title">Dashboard</h1>
	<div class="admin-dashboard">
		<a class="admin-dashboard__card" href="/admin/decks">
			<strong>Decks</strong>
			<span>Manage question decks</span>
		</a>
		<a class="admin-dashboard__card" href="/admin/questions">
			<strong>Questions</strong>
			<span>Manage questions</span>
		</a>
		<a class="admin-dashboard__card" href="/admin/users">
			<strong>Users</strong>
			<span>Manage admin access</span>
		</a>
	</div>

	<form class="admin-testing-panel" onsubmit={saveForcedQuestion}>
		<div>
			<h2 class="admin-testing-panel__title">Testing options</h2>
			<p class="admin-hint">
				Force the first question for new games started in this browser.
			</p>
		</div>

		<label class="admin-label">
			Forced first question id
			<input
				class="admin-input"
				type="text"
				placeholder="Paste a question UUID"
				bind:value={forcedQuestionId}
				disabled={savingForcedQuestion}
			/>
		</label>

		<div class="admin-form-actions">
			<button
				class="admin-btn admin-btn--primary"
				type="submit"
				disabled={savingForcedQuestion}
			>
				{savingForcedQuestion ? 'Saving…' : 'Save'}
			</button>
			<button
				class="admin-btn"
				type="button"
				onclick={clearForcedQuestion}
				disabled={savingForcedQuestion}
			>
				Clear
			</button>
		</div>

		{#if forcedQuestionStatus}
			<p class="admin-hint">{forcedQuestionStatus}</p>
		{/if}
	</form>
</div>
