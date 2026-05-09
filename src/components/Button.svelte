<script>
	/**
	 * @type {{
	 *   variant?: 'primary' | 'secondary' | 'cta',
	 *   size?: 'sm' | 'base' | 'md' | 'lg',
	 *   icon?: import('svelte').Component,
	 *   text?: string,
	 *   [key: string]: any,
	 * }}
	 */
	let { variant = 'primary', size = 'md', icon: Icon, text, class: extraClass, ...rest } = $props();

	const iconOnly = $derived(!!Icon && !text);
</script>

<button
	class="btn btn--{variant} btn--{size} {extraClass ?? ''}"
	class:btn--icon-only={iconOnly}
	type="button"
	{...rest}
>
	{#if Icon}
		<Icon size={iconOnly ? 20 : 18} />
	{/if}
	{#if text}
		{text}
	{/if}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;

		border: none;
		border-radius: 0.5rem;
		padding: var(--btn-padding, 0.875rem 2rem);

		font-family: var(--font-family-display);
		color: var(--palette-white);

		cursor: pointer;
		transition:
			background-color 0s,
			scale var(--transition-default-duration) ease-out;

		&:active {
			scale: 0.98;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.btn--primary {
		background: linear-gradient(
			to right,
			var(--palette-purple-light),
			var(--palette-purple-mid)
		);

		&:disabled {
			background: var(--palette-gray-dimmed);
		}
	}

	.btn--secondary {
		background-color: var(--palette-purple-neutral);
		&:hover:not(:disabled) {
			background-color: lch(from var(--palette-purple-neutral) calc(l + 5) c h);
		}
	}

	.btn--cta {
		background-color: var(--palette-purple-start);

		&:hover:not(:disabled) {
			background-color: lch(from var(--palette-purple-start) calc(l + 5) c h);
		}
	}

	.btn--sm { font-size: var(--font-size-sm); }
	.btn--base { font-size: var(--font-size-base); }
	.btn--md { font-size: var(--font-size-md); }
	.btn--lg { font-size: var(--font-size-lg); }

	.btn--icon-only {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
	}
</style>
