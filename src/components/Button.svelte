<script>
	/**
	 * @type {{
	 *   variant?: 'primary' | 'secondary',
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
		font-weight: 600;
		letter-spacing: 0.06em;

		cursor: pointer;
		transition: background-color 0.15s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--primary {
		background-color: var(--orange-700);
		color: var(--white);
	}

	.btn--primary:hover:not(:disabled) {
		background-color: var(--orange-800);
	}

	.btn--secondary {
		background-color: hsl(0 0% 100% / 0.2);
		color: var(--white);
	}

	.btn--secondary:hover:not(:disabled) {
		background-color: hsl(0 0% 100% / 0.3);
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
