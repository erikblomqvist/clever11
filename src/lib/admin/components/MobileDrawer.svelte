<script>
	import { page } from '$app/state';
	import Logo from './Logo.svelte';
	import AdminIcon from './AdminIcon.svelte';
	import { NAV_ITEMS, getActiveId } from '../nav.js';

	let { user, onSignOut, open = false, onClose } = $props();
	let dialogEl = $state(null);

	const activeId = $derived(getActiveId(page.url.pathname));

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleClick(e) {
		if (e.target === dialogEl) onClose?.();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="drawer"
	onclick={handleClick}
	onclose={onClose}
>
	<div class="drawer__panel">
		<div class="drawer__header">
			<Logo />
			<button class="drawer__close" type="button" onclick={onClose}>
				<AdminIcon name="close" size={18} />
			</button>
		</div>

		<nav class="drawer__nav">
			{#each NAV_ITEMS as item (item.id)}
				{@const active = item.id === activeId}
				<a
					class="drawer__item"
					class:drawer__item--active={active}
					href={item.path}
					onclick={onClose}
				>
					<AdminIcon name={item.icon} size={17} />
					<span class="drawer__item-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="drawer__spacer"></div>

		<div class="drawer__user">
			<div class="drawer__user-info">
				<div class="drawer__user-name">
					{user?.email?.split('@')[0] ?? 'Admin'}
				</div>
				<div class="drawer__user-email">{user?.email ?? ''}</div>
			</div>
			<button class="drawer__signout" type="button" onclick={onSignOut}>
				<AdminIcon name="power" size={14} />
				Sign out
			</button>
		</div>
	</div>
</dialog>

<style>
	.drawer {
		position: fixed;
		top: 0;
		left: 0;
		width: 280px;
		max-width: 280px;
		height: 100dvh;
		max-height: 100dvh;
		margin: 0;
		padding: 0;

		background: var(--bg-2);
		border: none;
		border-right: 1px solid var(--border);

		animation: slide-in-left 160ms ease;
	}

	.drawer::backdrop {
		background: lch(0% 0 0 / 0.5);

		animation: fade-in var(--dur-fade-in) ease;
	}

	.drawer__panel {
		display: flex;
		height: 100%;

		flex-direction: column;
	}

	.drawer__header {
		display: flex;
		padding: 18px 18px 14px;
		align-items: center;

		border-bottom: 1px solid var(--border);

		justify-content: space-between;
	}

	.drawer__close {
		color: var(--fg-mute);
	}

	.drawer__close:hover {
		color: var(--fg);
	}

	.drawer__nav {
		display: flex;
		padding: 14px 10px 0;

		flex-direction: column;
		gap: 1px;
	}

	.drawer__item {
		display: flex;
		position: relative;
		height: 42px;
		padding: 0 12px;
		align-items: center;

		font-size: 14px;
		text-decoration: none;

		color: var(--fg-mute);
		border-radius: var(--r-2);

		gap: 12px;
	}

	.drawer__item--active {
		color: var(--fg);
		background: var(--surface-2);
	}

	.drawer__item--active::before {
		position: absolute;
		top: 10px;
		bottom: 10px;
		left: -10px;
		width: 2px;

		background: var(--accent);

		content: '';
	}

	.drawer__item-label {
		flex: 1;
	}

	.drawer__spacer {
		flex: 1;
	}

	.drawer__user {
		display: flex;
		padding: 14px 16px;
		align-items: center;

		border-top: 1px solid var(--border);

		gap: 10px;
	}

	.drawer__user-info {
		flex: 1;
	}

	.drawer__user-name {
		font-size: 13.5px;

		color: var(--fg);
	}

	.drawer__user-email {
		font-size: 11.5px;

		color: var(--fg-faint);
	}

	.drawer__signout {
		display: inline-flex;
		align-items: center;

		font-size: 12px;

		color: var(--fg-mute);

		gap: 6px;
	}

	.drawer__signout:hover {
		color: var(--fg);
	}

	@keyframes slide-in-left {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
</style>
