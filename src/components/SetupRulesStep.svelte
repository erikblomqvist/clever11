<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{
	 *   timerEnabled: boolean,
	 *   timerSeconds: number,
	 * }}
	 */
	let {
		timerEnabled = $bindable(),
		timerSeconds = $bindable(),
	} = $props();
</script>

<div class="rule-card">
	<div class="rule-card__header">
		<div class="rule-card__text">
			<span class="rule-card__label">{$_('setup.turn_timer_label')}</span>
			<span class="rule-card__desc">{$_('setup.turn_timer_description')}</span>
		</div>
		<button
			class="toggle"
			class:toggle--on={timerEnabled}
			type="button"
			role="switch"
			aria-checked={timerEnabled}
			onclick={() => (timerEnabled = !timerEnabled)}
		>
			<span class="toggle__thumb"></span>
		</button>
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
				<span class="seconds-field__unit">{$_('setup.turn_timer_seconds', { values: { n: timerSeconds } })}</span>
			</label>
		</div>
	{/if}
</div>

<style>
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

	/* Toggle switch */
	.toggle {
		position: relative;
		flex-shrink: 0;
		width: 3rem;
		height: 1.75rem;
		border: none;
		border-radius: 999px;
		background: var(--palette-gray-muted);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.toggle--on {
		background-color: var(--palette-purple-start);
	}

	.toggle__thumb {
		position: absolute;
		top: 4px;
		left: 4px;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--palette-white);
		transition: transform 0.2s;
	}

	.toggle--on .toggle__thumb {
		transform: translateX(1.25rem);
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
