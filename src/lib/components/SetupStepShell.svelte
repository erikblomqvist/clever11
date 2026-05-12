<script>
	import { _ } from 'svelte-i18n';
	import { ChevronLeft } from 'lucide-svelte';
	import Button from './Button.svelte';

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
		<h1 class="setup-title">{title}</h1>
		<Button
			class="setup-back-btn"
			variant="secondary"
			size="sm"
			icon={ChevronLeft}
			text={$_('setup.back')}
			onclick={onback}
			style="--btn-padding: 0.375rem 0.625rem"
		/>
	</header>

	<div class="setup-content">
		{@render children?.()}
	</div>

	<footer class="setup-footer">
		<Button
			class="setup-btn"
			text={primaryLabel}
			onclick={onprimary}
			disabled={primaryDisabled}
		/>
	</footer>
</div>

<style>
	.setup-step {
		box-sizing: border-box;
		display: grid;
		grid-template-rows: auto 1fr auto;

		margin-inline: auto;
		width: max(50vw, 50rem);
		height: 100svh;
	}

	.setup-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: max(1rem, env(safe-area-inset-top)) 1rem 0.75rem;
		border-bottom: 1px solid hsl(0 0% 100% / 0.2);
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

	.setup-footer :global(.setup-btn) {
		width: 100%;
	}
</style>
