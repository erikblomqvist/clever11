<script>
	let { items = [] } = $props();
	let open = $state(false);

	function toggle(e) {
		e.stopPropagation();
		open = !open;
	}

	function handleAction(item, e) {
		e.stopPropagation();
		item.onclick?.();
		open = false;
	}

	function handleBackdropClick(e) {
		e.stopPropagation();
		open = false;
	}
</script>

<div class="dropdown-menu">
	<button
		class="dropdown-menu__trigger"
		onclick={toggle}
		aria-label="More actions"
		aria-expanded={open}
	>
		<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
			<circle cx="8" cy="3" r="1.4" />
			<circle cx="8" cy="8" r="1.4" />
			<circle cx="8" cy="13" r="1.4" />
		</svg>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="dropdown-menu__backdrop"
			onclick={handleBackdropClick}
		></div>
		<div class="dropdown-menu__panel" role="menu">
			{#each items as item, i (i)}
				{#if item.separator}
					<div class="dropdown-menu__sep" role="separator"></div>
				{:else}
					<button
						class="dropdown-menu__item"
						class:dropdown-menu__item--danger={item.danger}
						role="menuitem"
						onclick={(e) => handleAction(item, e)}
					>
						{item.label}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown-menu {
		position: relative;
	}

	.dropdown-menu__trigger {
		display: grid;
		width: 30px;
		height: 30px;

		place-items: center;

		color: var(--fg-mute);
		border-radius: var(--r-1);

		transition:
			background 80ms ease,
			color 80ms ease;
	}

	.dropdown-menu__trigger:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.dropdown-menu__backdrop {
		position: fixed;
		inset: 0;
		z-index: 29;
	}

	.dropdown-menu__panel {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 30;
		overflow: auto;
		min-width: 160px;
		max-height: 280px;
		padding: 4px;

		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);
		box-shadow: var(--shadow-pop);

		animation: pop 100ms ease;
	}

	.dropdown-menu__item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 8px 10px;

		font-size: 0.75rem;
		text-align: left;

		color: var(--fg);
		border-radius: var(--r-1);

		transition: background 80ms ease;

		gap: 8px;
	}

	.dropdown-menu__item:hover {
		background: var(--surface-2);
	}

	.dropdown-menu__item--danger {
		color: var(--danger);
	}

	.dropdown-menu__item--danger:hover {
		background: var(--danger-soft);
	}

	.dropdown-menu__sep {
		height: 1px;
		margin: 4px 6px;

		background: var(--border);
	}
</style>
