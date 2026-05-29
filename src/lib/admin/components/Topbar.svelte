<script>
	import { page } from '$app/state';
	import AdminIcon from './AdminIcon.svelte';
	import Logo from './Logo.svelte';

	let { onMenuClick, actions } = $props();

	const segments = $derived(page.url.pathname.split('/').filter(Boolean));
</script>

<header class="topbar">
	<button
		class="topbar__menu-btn"
		type="button"
		onclick={onMenuClick}
		aria-label="Open navigation"
	>
		<AdminIcon name="menu" size={16} />
	</button>

	<div class="topbar__mobile-logo">
		<Logo compact />
	</div>

	<nav class="topbar__breadcrumb mono" aria-label="Breadcrumb">
		{#each segments as seg, i (i)}
			{#if i > 0}
				<span class="topbar__sep">/</span>
			{/if}
			<span class:topbar__seg--current={i === segments.length - 1}>
				{seg}
			</span>
		{/each}
	</nav>

	<div class="topbar__spacer"></div>

	{#if actions}
		<div class="topbar__actions">
			{@render actions()}
		</div>
	{/if}
</header>

<style>
	.topbar {
		display: flex;
		position: sticky;
		top: 0;
		z-index: 10;
		height: var(--h-topbar);
		padding: 0 22px;
		align-items: center;

		background: lch(4.4% 1.7 290 / 0.6);
		border-bottom: 1px solid var(--border);
		backdrop-filter: blur(8px);

		gap: 16px;
	}

	.topbar__menu-btn {
		display: none;
		width: 32px;
		height: 32px;

		color: var(--fg-mute);
		border-radius: var(--r-1);

		place-items: center;
	}

	.topbar__menu-btn:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.topbar__mobile-logo {
		display: none;
	}

	.topbar__breadcrumb {
		display: flex;
		align-items: center;

		font-size: 0.75rem;

		color: var(--fg-faint);

		gap: 8px;
	}

	.topbar__sep {
		color: var(--border-strong);
	}

	.topbar__seg--current {
		color: var(--fg);
	}

	.topbar__spacer {
		flex: 1;
	}

	@media (max-width: 768px) {
		.topbar {
			height: var(--h-mobile-header);
			padding: 0 14px;

			gap: 12px;
		}

		.topbar__menu-btn {
			display: grid;
		}

		.topbar__mobile-logo {
			display: flex;
		}

		.topbar__breadcrumb {
			display: none;
		}
	}
</style>
