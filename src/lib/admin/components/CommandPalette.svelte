<script>
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase.js';
	import AdminIcon from './AdminIcon.svelte';
	import Spinner from './Spinner.svelte';
	import { NAV_ITEMS } from '../nav.js';

	let { open = false, onclose, onSignOut } = $props();

	let dialogEl = $state(null);
	let inputEl = $state(null);
	let query = $state('');
	let activeIndex = $state(0);
	let questions = $state([]);
	let searching = $state(false);
	let searchTimeout = null;

	const ROUTES = NAV_ITEMS.map((item) => ({
		kind: 'route',
		label: item.label,
		icon: item.icon,
		path: item.path,
	}));

	const ACTIONS = [
		{
			kind: 'action',
			label: 'New question',
			icon: 'plus',
			path: '/admin/questions/new',
			hint: 'create',
		},
		{
			kind: 'action',
			label: 'New deck',
			icon: 'plus',
			path: '/admin/decks/new',
			hint: 'create',
		},
		{
			kind: 'action',
			label: 'Import questions',
			icon: 'import',
			path: '/admin/questions/import',
			hint: 'create',
		},
		{ kind: 'action', label: 'Sign out', icon: 'power', hint: 'auth' },
	];

	const filteredRoutes = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return ROUTES;
		return ROUTES.filter(
			(r) =>
				r.label.toLowerCase().includes(q) ||
				r.path.toLowerCase().includes(q),
		);
	});

	const filteredActions = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return ACTIONS;
		return ACTIONS.filter((a) => a.label.toLowerCase().includes(q));
	});

	const flat = $derived([
		...filteredRoutes,
		...filteredActions,
		...questions,
	]);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
			query = '';
			activeIndex = 0;
			questions = [];
			setTimeout(() => inputEl?.focus(), 30);
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	$effect(() => {
		if (activeIndex >= flat.length) activeIndex = 0;
	});

	$effect(() => {
		const q = query.trim();
		if (searchTimeout) clearTimeout(searchTimeout);
		if (!q) {
			questions = [];
			searching = false;
			return;
		}
		searching = true;
		searchTimeout = setTimeout(() => searchQuestions(q), 300);
		return () => {
			if (searchTimeout) clearTimeout(searchTimeout);
		};
	});

	async function searchQuestions(q) {
		const isNumber = /^\d+$/.test(q) || /^#\d+$/.test(q);
		const num = parseInt(q.replace('#', ''), 10);

		let dbQuery = supabase
			.from('questions')
			.select('id, question_text, question_number, decks(name)')
			.is('archived_at', null)
			.limit(10);

		if (isNumber && !isNaN(num)) {
			dbQuery = dbQuery.eq('question_number', num);
		} else {
			dbQuery = dbQuery.ilike('question_text', `%${q}%`);
		}

		const { data } = await dbQuery;
		questions = (data ?? []).map((item) => ({
			kind: 'question',
			id: item.id,
			text: item.question_text,
			number: item.question_number,
			deck: item.decks?.name ?? '',
		}));
		searching = false;
	}

	function pick(item) {
		if (!item) return;
		if (item.kind === 'action' && item.label === 'Sign out') {
			onclose?.();
			onSignOut?.();
			return;
		}
		if (item.path) {
			onclose?.();
			goto(item.path);
			return;
		}
		if (item.kind === 'question') {
			onclose?.();
			goto(`/admin/questions/${item.id}`);
		}
	}

	function handleKeydown(e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(flat.length - 1, activeIndex + 1);
			scrollActiveIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(0, activeIndex - 1);
			scrollActiveIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			pick(flat[activeIndex]);
		}
	}

	function scrollActiveIntoView() {
		requestAnimationFrame(() => {
			dialogEl
				?.querySelector('.cmdk__item--active')
				?.scrollIntoView({ block: 'nearest' });
		});
	}

	function handleBackdropClick(e) {
		if (e.target === dialogEl) onclose?.();
	}

	function groupStartIndex(kind) {
		if (kind === 'route') return 0;
		if (kind === 'action') return filteredRoutes.length;
		return filteredRoutes.length + filteredActions.length;
	}
</script>

<dialog
	bind:this={dialogEl}
	class="cmdk"
	onclose={() => onclose?.()}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
>
	<div class="cmdk__panel">
		<div class="cmdk__search">
			<AdminIcon name="search" size={16} />
			<input
				bind:this={inputEl}
				bind:value={query}
				class="cmdk__input"
				placeholder="Jump to route, action, or question…"
				type="text"
			/>
			{#if searching}
				<Spinner size={14} />
			{:else}
				<kbd class="cmdk__kbd">esc</kbd>
			{/if}
		</div>

		<div class="cmdk__results">
			{#if flat.length === 0 && !searching}
				<div class="cmdk__empty">No matches.</div>
			{:else if flat.length === 0 && searching}
				<div class="cmdk__empty"><Spinner size={16} /></div>
			{:else}
				{#if filteredRoutes.length > 0}
					<div class="cmdk__group">
						<div class="cmdk__group-label">routes</div>
						{#each filteredRoutes as item, i}
							{@const idx = groupStartIndex('route') + i}
							<button
								class="cmdk__item"
								class:cmdk__item--active={idx === activeIndex}
								onmouseenter={() => (activeIndex = idx)}
								onclick={() => pick(item)}
							>
								<div
									class="cmdk__item-icon"
									class:cmdk__item-icon--active={idx ===
										activeIndex}
								>
									<AdminIcon name={item.icon} size={13} />
								</div>
								<span class="cmdk__item-label"
									>{item.label}</span
								>
								<span class="cmdk__item-meta mono"
									>{item.path}</span
								>
							</button>
						{/each}
					</div>
				{/if}

				{#if filteredActions.length > 0}
					<div class="cmdk__group">
						<div class="cmdk__group-label">actions</div>
						{#each filteredActions as item, i}
							{@const idx = groupStartIndex('action') + i}
							<button
								class="cmdk__item"
								class:cmdk__item--active={idx === activeIndex}
								onmouseenter={() => (activeIndex = idx)}
								onclick={() => pick(item)}
							>
								<div
									class="cmdk__item-icon"
									class:cmdk__item-icon--active={idx ===
										activeIndex}
								>
									<AdminIcon name={item.icon} size={13} />
								</div>
								<span class="cmdk__item-label"
									>{item.label}</span
								>
								<span class="cmdk__item-meta mono"
									>{item.hint}</span
								>
							</button>
						{/each}
					</div>
				{/if}

				{#if questions.length > 0}
					<div class="cmdk__group">
						<div class="cmdk__group-label">questions</div>
						{#each questions as item, i}
							{@const idx = groupStartIndex('question') + i}
							<button
								class="cmdk__item"
								class:cmdk__item--active={idx === activeIndex}
								onmouseenter={() => (activeIndex = idx)}
								onclick={() => pick(item)}
							>
								<div
									class="cmdk__item-icon"
									class:cmdk__item-icon--active={idx ===
										activeIndex}
								>
									<span class="cmdk__question-num mono"
										>#{item.number ?? '?'}</span
									>
								</div>
								<span class="cmdk__item-label">{item.text}</span
								>
								{#if item.deck}
									<span class="cmdk__pill">{item.deck}</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<div class="cmdk__footer">
			<span class="cmdk__footer-hint">
				<kbd class="cmdk__kbd">↑</kbd>
				<kbd class="cmdk__kbd">↓</kbd>
				navigate
			</span>
			<span class="cmdk__footer-hint">
				<kbd class="cmdk__kbd">↵</kbd>
				select
			</span>
			<span class="cmdk__footer-spacer"></span>
			<span class="cmdk__footer-count mono">{flat.length} results</span>
		</div>
	</div>
</dialog>

<style>
	.cmdk {
		overflow: visible;
		width: min(770px, calc(100% - 64px));
		margin: 12vh auto auto;
		padding: 0;

		color: var(--fg);
		background: transparent;
		border: 0;

		animation: pop var(--dur-pop) ease;
	}

	.cmdk::backdrop {
		background: lch(3% 2 280 / 0.6);
		backdrop-filter: blur(4px);

		animation: fade-in var(--dur-fade-in) ease;
	}

	.cmdk__panel {
		overflow: hidden;

		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-3);
		box-shadow: var(--shadow-pop);
	}

	.cmdk__search {
		display: flex;
		padding: 14px 16px;
		align-items: center;

		color: var(--fg-mute);
		border-bottom: 1px solid var(--border);

		gap: 10px;
	}

	.cmdk__input {
		width: 0;

		font-size: 14.5px;

		color: var(--fg);
		background: transparent;
		border: 0;
		outline: none;

		flex: 1;
	}

	.cmdk__input::placeholder {
		color: var(--fg-faint);
	}

	.cmdk__results {
		overflow: auto;
		max-height: 360px;
		padding-bottom: 6px;
	}

	.cmdk__empty {
		padding: 40px 16px;

		font-size: 13px;
		text-align: center;

		color: var(--fg-mute);
	}

	.cmdk__group-label {
		padding: 12px 14px 6px;

		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-faint);
	}

	.cmdk__item {
		display: flex;
		width: 100%;
		padding: 8px 14px;
		align-items: center;

		font-size: 13.5px;
		text-align: left;

		color: var(--fg);
		background: transparent;
		border-left: 2px solid transparent;

		gap: 12px;
	}

	.cmdk__item--active {
		background: var(--surface-2);
		border-left-color: var(--accent);
	}

	.cmdk__item-icon {
		display: grid;
		width: 24px;
		height: 24px;

		color: var(--fg-mute);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
		flex: 0 0 24px;
	}

	.cmdk__item-icon--active {
		color: var(--accent);
	}

	.cmdk__item-label {
		overflow: hidden;
		min-width: 0;

		white-space: nowrap;
		text-overflow: ellipsis;

		flex: 1;
	}

	.cmdk__item-meta {
		font-size: 11px;

		color: var(--fg-faint);
	}

	.cmdk__question-num {
		font-size: 10px;
	}

	.cmdk__pill {
		display: inline-flex;
		height: 20px;
		padding: 0 8px;
		align-items: center;

		font-size: 10.5px;

		color: var(--fg-faint);
		background: var(--surface-2);
		border-radius: 999px;
	}

	.cmdk__kbd {
		display: inline-flex;
		min-width: 20px;
		height: 20px;
		padding: 0 5px;
		align-items: center;
		justify-content: center;

		font-family: var(--font-sans);
		font-size: 11px;

		color: var(--fg-faint);
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);
	}

	.cmdk__footer {
		display: flex;
		padding: 10px 14px;
		align-items: center;

		font-size: 11px;

		color: var(--fg-faint);
		background: var(--bg-2);
		border-top: 1px solid var(--border);

		gap: 16px;
	}

	.cmdk__footer-hint {
		display: inline-flex;
		align-items: center;

		gap: 6px;
	}

	.cmdk__footer-spacer {
		flex: 1;
	}
</style>
