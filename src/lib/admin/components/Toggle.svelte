<script>
	let { checked = false, onchange, label = '', hint = '' } = $props();
</script>

<button class="toggle" onclick={() => onchange?.(!checked)}>
	<span class="toggle__label">{label}</span>
	{#if hint}
		<span class="toggle__hint">{hint}</span>
	{/if}
	<span class="toggle__track" class:toggle__track--on={checked}>
		<span class="toggle__thumb" class:toggle__thumb--on={checked}></span>
	</span>
</button>

<style>
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		height: var(--h-button);
		padding: 0 12px 0 14px;

		font-size: 0.75rem;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;
	}

	.toggle:hover {
		border-color: var(--border-strong);
	}

	.toggle__hint {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	.toggle__track {
		position: relative;
		width: 28px;
		height: 16px;

		background: var(--border-strong);
		border-radius: 100px;

		transition: background 120ms ease;
	}

	.toggle__track--on {
		background: var(--accent);
	}

	.toggle__thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;

		background: var(--fg);
		border-radius: 50%;

		transition: left 140ms ease;
	}

	.toggle__thumb--on {
		left: 14px;

		background: var(--accent-fg);
	}
</style>
