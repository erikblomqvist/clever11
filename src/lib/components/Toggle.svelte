<script>
	/** @type {{ checked: boolean, ariaLabel?: string }} */
	let { checked = $bindable(), ariaLabel = '' } = $props();
</script>

<label class="toggle">
	<input
		type="checkbox"
		class="toggle__input"
		bind:checked
		aria-label={ariaLabel}
	/>
	<span class="toggle__slider"></span>
</label>

<style>
	.toggle {
		position: relative;
		display: inline-block;
		width: 3rem;
		height: 1.75rem;
		flex-shrink: 0;
		cursor: pointer;
	}

	.toggle__input {
		/* Hide default checkbox but keep it accessible */
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.toggle__slider {
		position: absolute;
		inset: 0;
		background-color: var(--palette-gray-muted);
		border-radius: 999px;
		transition: background-color 0.2s;
	}

	.toggle__slider::before {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		width: 1.25rem;
		height: 1.25rem;
		background-color: var(--palette-white);
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.toggle__input:checked + .toggle__slider {
		background-color: var(--palette-purple-start);
	}

	.toggle__input:checked + .toggle__slider::before {
		transform: translateX(1.25rem);
	}

	/* Focus state for accessibility */
	.toggle__input:focus-visible + .toggle__slider {
		outline: 2px solid var(--palette-purple-more);
		outline-offset: 2px;
	}
</style>
