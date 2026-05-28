<script>
	import { page } from '$app/state';
	import Logo from './Logo.svelte';
	import AdminIcon from './AdminIcon.svelte';
	import { NAV_ITEMS, getActiveId } from '../nav.js';

	let { user, onSignOut } = $props();

	const activeId = $derived(getActiveId(page.url.pathname));
</script>

<aside class="sidebar">
	<div class="sidebar__header">
		<Logo />
	</div>

	<nav class="sidebar__nav">
		{#each NAV_ITEMS as item}
			{@const active = item.id === activeId}
			<a
				class="sidebar__item"
				class:sidebar__item--active={active}
				href={item.path}
			>
				<AdminIcon name={item.icon} size={15} />
				<span class="sidebar__item-label">{item.label}</span>
			</a>
		{/each}
	</nav>

	<div class="sidebar__spacer"></div>

	<div class="sidebar__user">
		<div class="sidebar__user-info">
			<div class="sidebar__user-name">
				{user?.email?.split('@')[0] ?? 'Admin'}
			</div>
			<div class="sidebar__user-email">{user?.email ?? ''}</div>
		</div>
		<button class="sidebar__signout" type="button" onclick={onSignOut}>
			<AdminIcon name="power" size={13} />
			Sign out
		</button>
	</div>
</aside>

<style>
	.sidebar {
		display: flex;
		width: 240px;
		height: 100dvh;
		padding: 18px 0;

		background: var(--bg-2);
		border-right: 1px solid var(--border);

		flex: 0 0 240px;
		flex-direction: column;
	}

	.sidebar__header {
		padding: 0 18px 16px;

		border-bottom: 1px solid var(--border);
	}

	.sidebar__nav {
		display: flex;
		padding: 12px 8px 0;

		flex-direction: column;
		gap: 1px;
	}

	.sidebar__item {
		display: flex;
		position: relative;
		height: 34px;
		padding: 0 10px;
		align-items: center;

		font-size: 13px;
		text-decoration: none;

		color: var(--fg-mute);
		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			color 80ms ease;

		gap: 10px;
	}

	.sidebar__item:hover {
		background: var(--surface);
	}

	.sidebar__item--active {
		color: var(--fg);
		background: var(--surface-2);
	}

	.sidebar__item--active::before {
		position: absolute;
		top: 8px;
		bottom: 8px;
		left: -8px;
		width: 2px;

		background: var(--accent);
		border-radius: 2px;

		content: '';
	}

	.sidebar__item--active:hover {
		background: var(--surface-2);
	}

	.sidebar__item-label {
		flex: 1;
	}

	.sidebar__spacer {
		flex: 1;
	}

	.sidebar__user {
		display: flex;
		padding: 12px 14px;
		align-items: center;

		border-top: 1px solid var(--border);

		gap: 10px;
	}

	.sidebar__user-info {
		min-width: 0;

		flex: 1;
	}

	.sidebar__user-name {
		font-size: 13px;

		color: var(--fg);
	}

	.sidebar__user-email {
		font-size: 11.5px;

		color: var(--fg-faint);
	}

	.sidebar__signout {
		display: inline-flex;
		height: 28px;
		padding: 0 8px;
		align-items: center;

		font-size: 12px;

		color: var(--fg-mute);
		border-radius: var(--r-1);

		transition:
			background 80ms ease,
			color 80ms ease;

		gap: 6px;
	}

	.sidebar__signout:hover {
		color: var(--fg);
		background: var(--surface);
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
	}
</style>
