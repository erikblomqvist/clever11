<script>
	import { _ } from 'svelte-i18n';
	import { ChevronLeft } from 'lucide-svelte';

	/**
	 * @type {{
	 *   title: string,
	 *   onback: () => void,
	 *   primaryLabel: string,
	 *   onprimary: () => void,
	 *   primaryDisabled?: boolean,
	 *   children?: import('svelte').Snippet,
	 * }}
	 */
	let {
		title,
		onback,
		primaryLabel,
		onprimary,
		primaryDisabled = false,
		children,
	} = $props();
</script>

<div class="setup-step">
	<header class="setup-header">
		<button class="setup-back" onclick={onback} type="button">
			<ChevronLeft size={18} />
			{$_('setup.back')}
		</button>
		<h1 class="setup-title">{title}</h1>
	</header>

	<div class="setup-content">
		{@render children?.()}
	</div>

	<footer class="setup-footer">
		<button
			class="setup-btn"
			type="button"
			onclick={onprimary}
			disabled={primaryDisabled}
		>
			{primaryLabel}
		</button>
	</footer>
</div>

<style>
	.setup-step {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100svh;
		box-sizing: border-box;
	}

	.setup-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: max(1rem, env(safe-area-inset-top)) 1rem 0.75rem;
		border-bottom: 1px solid hsl(0 0% 100% / 0.2);
	}

	.setup-back {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		border: none;
		border-radius: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: hsl(0 0% 100% / 0.2);
		color: var(--white);
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		font-weight: 500;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.setup-back:hover {
		background-color: hsl(0 0% 100% / 0.3);
	}

	.setup-back :global(svg) {
		flex-shrink: 0;
	}

	.setup-title {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-xl);
		font-weight: 600;
		color: var(--white);
	}

	.setup-content {
		overflow-y: auto;
		overscroll-behavior: none;
		padding: 1.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.setup-footer {
		padding: 0.75rem 1rem max(1rem, env(safe-area-inset-bottom));
		border-top: 1px solid hsl(0 0% 100% / 0.2);
	}

	.setup-btn {
		display: block;
		width: 100%;
		border: none;
		border-radius: 0.5rem;
		padding: 0.875rem 2rem;
		background-color: var(--orange-700);
		color: var(--white);
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.setup-btn:hover {
		background-color: var(--orange-800);
	}

	.setup-btn:disabled {
		background-color: var(--orange-300);
		cursor: not-allowed;
	}
</style>
