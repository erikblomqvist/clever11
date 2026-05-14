<script>
	import { _ } from 'svelte-i18n';
	import Toggle from './Toggle.svelte';

	/**
	 * @type {{
	 *   timerEnabled: boolean,
	 *   timerSeconds: number,
	 *   volcanoRumble: boolean,
	 *   winScore: number,
	 * }}
	 */
	let {
		timerEnabled = $bindable(),
		timerSeconds = $bindable(),
		volcanoRumble = $bindable(),
		winScore = $bindable(),
	} = $props();
</script>

<div class="rules-stack">
	<div class="rule-card">
		<div class="rule-card__header">
			<div class="rule-card__text">
				<span class="rule-card__label"
					>{$_('setup.win_score_label')}</span
				>
				<span class="rule-card__desc"
					>{$_('setup.win_score_description')}</span
				>
			</div>
		</div>
		<div class="rule-card__body">
			<label class="seconds-field">
				<input
					class="seconds-field__input"
					type="number"
					min="10"
					max="1000"
					required
					bind:value={winScore}
				/>
				<span class="seconds-field__unit"
					>{$_('setup.win_score_points')}</span
				>
			</label>
		</div>
	</div>

	<div class="rule-card">
		<div class="rule-card__header">
			<div class="rule-card__text">
				<span class="rule-card__label"
					>{$_('setup.turn_timer_label')}</span
				>
				<span class="rule-card__desc"
					>{$_('setup.turn_timer_description')}</span
				>
			</div>
			<Toggle
				bind:checked={timerEnabled}
				ariaLabel={$_('setup.turn_timer_label')}
			/>
		</div>

		{#if timerEnabled}
			<div class="rule-card__body">
				<label class="seconds-field">
					<input
						class="seconds-field__input"
						type="number"
						min="10"
						max="600"
						required
						bind:value={timerSeconds}
					/>
					<span class="seconds-field__unit"
						>{$_('setup.turn_timer_seconds')}</span
					>
				</label>
			</div>
		{/if}
	</div>

	<div class="rule-card">
		<div class="rule-card__header">
			<div class="rule-card__text">
				<span class="rule-card__label"
					>{$_('setup.volcano_rumble_label')}</span
				>
				<span class="rule-card__desc"
					>{$_('setup.volcano_rumble_description')}</span
				>
			</div>
			<Toggle
				bind:checked={volcanoRumble}
				ariaLabel={$_('setup.volcano_rumble_label')}
			/>
		</div>
	</div>
</div>

<style>
	.rules-stack {
		display: grid;
		gap: 1rem;
	}

	.rule-card {
		border: 2px solid var(--palette-purple-start);
		border-radius: 0.625rem;
		background-color: var(--palette-purple-dark);
		overflow: hidden;
	}

	.rule-card__header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.875rem 1rem;
	}

	.rule-card__text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.rule-card__label {
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--white);
	}

	.rule-card__desc {
		font-size: var(--font-size-sm);
		color: hsl(0 0% 100% / 0.7);
		line-height: 1.4;
	}

	/* Seconds input */
	.rule-card__body {
		padding: 0 1rem 0.875rem;
	}

	.seconds-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.seconds-field__input {
		width: 5rem;
		border: 2px solid var(--palette-gray-muted);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--palette-gray-dimmed);
		color: var(--white);
		font-family: var(--font-family-body);
		font-size: var(--font-size-md);
		font-weight: 600;
		text-align: center;
		-moz-appearance: textfield;
	}

	.seconds-field__input::-webkit-inner-spin-button,
	.seconds-field__input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.seconds-field__input:focus {
		outline: none;
		border-color: var(--palette-purple-more);
	}

	.seconds-field__unit {
		font-size: var(--font-size-base);
		color: hsl(0 0% 100% / 0.7);
	}
</style>
