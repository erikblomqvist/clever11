<script>
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase.js';
	import { logActivity } from './activityLog.js';
	import {
		QUESTIONS_LIST_SCROLL_RESTORE_PENDING,
		QUESTIONS_LIST_SCROLL_Y_KEY,
	} from '$lib/admin/questionsListScroll.js';
	import { QUESTION_TYPES } from '$lib/data/questionTypes.js';
	import { questionMatchesBreakHintsFilter } from '$lib/softHyphens.js';
	import { Search, X, Upload, Plus } from 'lucide-svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import TypeBadge from './components/TypeBadge.svelte';
	import VoteChips from './components/VoteChips.svelte';
	import SortHeader from './components/SortHeader.svelte';
	import EmptyState from './components/EmptyState.svelte';
	import Toggle from './components/Toggle.svelte';
	import Select from './components/Select.svelte';
	import Dialog from './components/Dialog.svelte';
	import Toast from './components/Toast.svelte';
	import DropdownMenu from './components/DropdownMenu.svelte';

	const QUESTIONS_FILTERS_KEY = 'clever11-admin-questions-filters';
	const SORT_FIELDS = new Set([
		'question_text',
		'question_number',
		'votes',
		'created_at',
	]);

	function readPersistedFilters() {
		if (typeof sessionStorage === 'undefined') return null;
		try {
			const raw = sessionStorage.getItem(QUESTIONS_FILTERS_KEY);
			if (!raw) return null;
			const o = JSON.parse(raw);
			if (!o || typeof o !== 'object') return null;
			const sf =
				typeof o.sortField === 'string' && SORT_FIELDS.has(o.sortField)
					? o.sortField
					: 'question_text';
			return {
				filterDeckId:
					typeof o.filterDeckId === 'string' ? o.filterDeckId : '',
				filterType:
					typeof o.filterType === 'string' ? o.filterType : '',
				filterText:
					typeof o.filterText === 'string' ? o.filterText : '',
				filterBreakHints:
					o.filterBreakHints === 'question' ||
					o.filterBreakHints === 'options' ||
					o.filterBreakHints === 'either'
						? o.filterBreakHints
						: '',
				showArchived: Boolean(o.showArchived),
				sortField: sf,
				sortAsc: typeof o.sortAsc === 'boolean' ? o.sortAsc : true,
			};
		} catch {
			return null;
		}
	}

	function writePersistedFilters(
		/** @type {{ filterDeckId: string, filterType: string, filterText: string, filterBreakHints: string, showArchived: boolean, sortField: string, sortAsc: boolean }} */ snapshot,
	) {
		if (typeof sessionStorage === 'undefined') return;
		try {
			sessionStorage.setItem(
				QUESTIONS_FILTERS_KEY,
				JSON.stringify(snapshot),
			);
		} catch {
			/* quota / private mode */
		}
	}

	const persisted = readPersistedFilters();

	/** @type {{ id: string, question_text: string, options_json: string[]|null, type: string, question_number: number|null, archived_at: string|null, created_at: string, decks: { name: string }|null }[]} */
	let questions = $state([]);
	let loading = $state(true);
	let error = $state('');
	let filterDeckId = $state(persisted?.filterDeckId ?? '');
	let filterType = $state(persisted?.filterType ?? '');
	let filterText = $state(persisted?.filterText ?? '');
	let filterBreakHints = $state(persisted?.filterBreakHints ?? '');
	let showArchived = $state(persisted?.showArchived ?? false);
	let sortField = $state(persisted?.sortField ?? 'question_text');
	let sortAsc = $state(persisted?.sortAsc ?? true);
	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	/** @type {SvelteMap<string, { up: number, down: number }>} */
	let voteCounts = new SvelteMap();
	let confirmTarget = $state(null);
	/** @type {Toast|null} */
	let toastRef = $state(null);

	/** @type {number} */
	let listScrollSaveRaf = 0;

	function persistQuestionsListScrollY() {
		cancelAnimationFrame(listScrollSaveRaf);
		listScrollSaveRaf = requestAnimationFrame(() => {
			const el = document.querySelector('.admin-content');
			if (!el) return;
			try {
				sessionStorage.setItem(
					QUESTIONS_LIST_SCROLL_Y_KEY,
					String(el.scrollTop),
				);
			} catch {
				/* quota / private mode */
			}
		});
	}

	$effect(() => {
		const el = document.querySelector('.admin-content');
		if (!el) return;

		el.addEventListener('scroll', persistQuestionsListScrollY, {
			passive: true,
		});
		return () => {
			el.removeEventListener('scroll', persistQuestionsListScrollY);
			cancelAnimationFrame(listScrollSaveRaf);
		};
	});

	$effect(() => {
		writePersistedFilters({
			filterDeckId,
			filterType,
			filterText,
			filterBreakHints,
			showArchived,
			sortField,
			sortAsc,
		});
	});

	$effect(() => {
		init();
	});

	$effect(() => {
		if (loading) return;

		const pending = sessionStorage.getItem(
			QUESTIONS_LIST_SCROLL_RESTORE_PENDING,
		);
		if (pending !== '1') return;

		const raw = sessionStorage.getItem(QUESTIONS_LIST_SCROLL_Y_KEY);
		const y = raw != null ? Number(raw) : NaN;

		sessionStorage.removeItem(QUESTIONS_LIST_SCROLL_RESTORE_PENDING);
		sessionStorage.removeItem(QUESTIONS_LIST_SCROLL_Y_KEY);

		if (Number.isNaN(y)) return;

		let cancelled = false;

		(async () => {
			await tick();
			if (cancelled) return;
			const el = document.querySelector('.admin-content');
			if (!el) return;

			const deadline = performance.now() + 3000;
			let lastScrollHeight = 0;
			let stableFrames = 0;

			while (!cancelled && performance.now() < deadline) {
				el.scrollTop = y;
				if (Math.abs(el.scrollTop - y) <= 1) return;

				const sh = el.scrollHeight;
				if (sh === lastScrollHeight) {
					stableFrames++;
					if (stableFrames >= 2) return;
				} else {
					stableFrames = 0;
					lastScrollHeight = sh;
				}

				await new Promise((r) => requestAnimationFrame(r));
				if (cancelled) return;
				await tick();
			}
			if (!cancelled) el.scrollTop = y;
		})();

		return () => {
			cancelled = true;
		};
	});

	async function init() {
		const [{ data: deckData }] = await Promise.all([
			supabase.from('decks').select('id, name').order('name'),
		]);
		decks = deckData ?? [];
		await fetchQuestions();
		await loadVoteCounts();
		loading = false;
	}

	async function fetchQuestions() {
		let query = supabase
			.from('questions')
			.select(
				'id, question_text, options_json, type, question_number, archived_at, created_at, decks(name)',
			)
			.order('created_at', { ascending: false });
		if (!showArchived) query = query.is('archived_at', null);
		if (filterDeckId) query = query.eq('deck_id', filterDeckId);
		if (filterType) query = query.eq('type', filterType);
		const { data, error: err } = await query;
		if (err) error = err.message;
		else questions = data ?? [];
	}

	async function loadVoteCounts() {
		const { data: votes } = await supabase
			.from('question_votes')
			.select('question_id, vote');
		voteCounts.clear();
		if (!votes) return;
		for (const v of votes) {
			const entry = voteCounts.get(v.question_id) ?? { up: 0, down: 0 };
			if (v.vote) entry.up++;
			else entry.down++;
			voteCounts.set(v.question_id, entry);
		}
	}

	const filtered = $derived(
		questions.filter((q) => {
			if (filterType && q.type !== filterType) return false;
			if (
				filterText &&
				!q.question_text
					.toLowerCase()
					.includes(filterText.toLowerCase())
			)
				return false;
			if (
				filterBreakHints &&
				!questionMatchesBreakHintsFilter(
					q.question_text,
					q.options_json,
					/** @type {'question'|'options'|'either'} */ (
						filterBreakHints
					),
				)
			)
				return false;
			return true;
		}),
	);

	function netVotes(/** @type {string} */ id) {
		const v = voteCounts.get(id);
		return v ? v.up - v.down : 0;
	}

	function formatCreatedAt(/** @type {string} */ iso) {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '—';
		/** @type {Intl.DateTimeFormatOptions} */
		const opts = { month: 'short', day: 'numeric' };
		if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
		return new Intl.DateTimeFormat('en-US', opts).format(d);
	}

	const sorted = $derived(
		[...filtered].sort((a, b) => {
			const cmp =
				sortField === 'question_number'
					? (a.question_number ?? 0) - (b.question_number ?? 0)
					: sortField === 'votes'
						? netVotes(a.id) - netVotes(b.id)
						: sortField === 'created_at'
							? new Date(a.created_at).getTime() -
								new Date(b.created_at).getTime()
							: a.question_text.localeCompare(
									b.question_text,
									'sv',
								);
			return sortAsc ? cmp : -cmp;
		}),
	);

	async function applyFilter() {
		loading = true;
		await fetchQuestions();
		await loadVoteCounts();
		loading = false;
	}

	function handleSort(/** @type {string} */ key) {
		if (sortField === key) {
			sortAsc = !sortAsc;
		} else {
			sortField = key;
			sortAsc = key === 'question_number' || key === 'question_text';
		}
	}

	function handleDeckChange(/** @type {string|null} */ val) {
		filterDeckId = val ?? '';
		applyFilter();
	}

	function handleTypeChange(/** @type {string|null} */ val) {
		filterType = val ?? '';
		applyFilter();
	}

	function handleArchivedChange(/** @type {boolean} */ val) {
		showArchived = val;
		applyFilter();
	}

	function resetFilters() {
		filterText = '';
		filterDeckId = '';
		filterType = '';
		filterBreakHints = '';
		showArchived = false;
		applyFilter();
	}

	let hasActiveFilters = $derived(
		!!(
			filterText ||
			filterDeckId ||
			filterType ||
			filterBreakHints ||
			showArchived
		),
	);

	const breakHintsOptions = [
		{ value: 'question', label: 'Question text' },
		{ value: 'options', label: 'Options' },
		{ value: 'either', label: 'Either' },
	];

	function askArchive(/** @type {any} */ q) {
		confirmTarget = q;
	}

	async function doArchive() {
		const q = confirmTarget;
		if (!q) return;
		confirmTarget = null;
		const { error: err } = await supabase
			.from('questions')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', q.id);
		if (err) {
			toastRef?.show(err.message);
			return;
		}
		logActivity({
			verb: 'archived',
			entity_type: 'question',
			entity_id: q.id,
			summary: q.question_number ? `Q #${q.question_number}` : 'question',
			deck_name: q.decks?.name ?? null,
		});
		const removed = { ...q };
		questions = questions.filter((x) => x.id !== q.id);
		toastRef?.show(`Archived Q #${q.question_number ?? '?'}.`, {
			onundo: async () => {
				const { error: err2 } = await supabase
					.from('questions')
					.update({ archived_at: null })
					.eq('id', removed.id);
				if (err2) return;
				logActivity({
					verb: 'restored',
					entity_type: 'question',
					entity_id: removed.id,
					summary: removed.question_number
						? `Q #${removed.question_number}`
						: 'question',
					deck_name: removed.decks?.name ?? null,
				});
				questions = [...questions, removed];
			},
		});
	}

	async function restoreQuestion(/** @type {any} */ q) {
		const { error: err } = await supabase
			.from('questions')
			.update({ archived_at: null })
			.eq('id', q.id);
		if (err) {
			toastRef?.show(err.message);
			return;
		}
		logActivity({
			verb: 'restored',
			entity_type: 'question',
			entity_id: q.id,
			summary: q.question_number ? `Q #${q.question_number}` : 'question',
			deck_name: q.decks?.name ?? null,
		});
		const removed = { ...q };
		questions = questions.filter((x) => x.id !== q.id);
		toastRef?.show(`Restored Q #${q.question_number ?? '?'}.`, {
			onundo: async () => {
				const { error: err2 } = await supabase
					.from('questions')
					.update({ archived_at: new Date().toISOString() })
					.eq('id', removed.id);
				if (err2) return;
				logActivity({
					verb: 'archived',
					entity_type: 'question',
					entity_id: removed.id,
					summary: removed.question_number
						? `Q #${removed.question_number}`
						: 'question',
					deck_name: removed.decks?.name ?? null,
				});
				questions = [...questions, removed];
			},
		});
	}

	function menuItems(/** @type {any} */ q) {
		if (q.archived_at) {
			return [
				{ label: 'Restore', onclick: () => restoreQuestion(q) },
				{ separator: true },
				{
					label: 'Edit',
					onclick: () => goto(`/admin/questions/${q.id}`),
				},
			];
		}
		return [
			{
				label: 'Edit',
				onclick: () => goto(`/admin/questions/${q.id}`),
			},
			{ separator: true },
			{
				label: 'Archive',
				onclick: () => askArchive(q),
				danger: true,
			},
		];
	}

	const deckOptions = $derived(
		decks.map((d) => ({ value: d.id, label: d.name })),
	);

	const typeOptions = $derived(
		Object.entries(QUESTION_TYPES).map(([key, config]) => ({
			value: key,
			label: config.label,
		})),
	);
</script>

<div class="qv">
	<!-- Page header -->
	<div class="qv__header">
		<div>
			<h1 class="qv__title">Questions</h1>
			<p class="qv__subtitle">
				All cards across all decks. Click a row to edit.
			</p>
		</div>
		<div class="qv__actions">
			<a class="qv__btn qv__btn--ghost" href="/admin/questions/import">
				<Upload size={14} />
				Import cards
			</a>
			<a class="qv__btn qv__btn--primary" href="/admin/questions/new">
				<Plus size={14} />
				New question
			</a>
		</div>
	</div>

	<!-- Filter bar -->
	<div class="qv__filters">
		<div class="qv__search">
			<Search size={14} />
			<input
				type="text"
				placeholder="Search questions…"
				bind:value={filterText}
			/>
			{#if filterText}
				<button
					class="qv__search-clear"
					onclick={() => (filterText = '')}
				>
					<X size={12} />
				</button>
			{/if}
		</div>
		<Select
			label="Deck"
			value={filterDeckId || null}
			options={deckOptions}
			onchange={handleDeckChange}
			allowClear
		/>
		<Select
			label="Type"
			value={filterType || null}
			options={typeOptions}
			onchange={handleTypeChange}
			allowClear
		/>
		<Select
			label="Break hints"
			value={filterBreakHints || null}
			options={breakHintsOptions}
			onchange={(val) => (filterBreakHints = val ?? '')}
			allowClear
		/>
		<Toggle
			checked={showArchived}
			onchange={handleArchivedChange}
			label="Archived"
			hint={showArchived ? '' : 'hidden'}
		/>
		<div class="qv__filters-spacer"></div>
		{#if hasActiveFilters}
			<button
				class="qv__btn qv__btn--ghost qv__btn--sm"
				onclick={resetFilters}
			>
				Reset
			</button>
		{/if}
		<span class="qv__counter mono">
			<span class="qv__counter-num">{sorted.length}</span>
			<span class="qv__counter-sep">/</span>
			<span>{questions.length}</span>
		</span>
	</div>

	<!-- Content area -->
	{#if loading}
		<div class="qv__status">Loading…</div>
	{:else if error}
		<div class="qv__status qv__status--error">{error}</div>
	{:else if sorted.length === 0}
		<EmptyState
			title="No questions match these filters."
			body="Try clearing a filter, broadening your search, or toggling archived."
		>
			{#snippet icon()}
				<Search size={18} />
			{/snippet}
		</EmptyState>
	{:else}
		<!-- Desktop table -->
		<div class="qv__table">
			<div class="qv__table-head">
				<SortHeader
					label="#"
					sortKey="question_number"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<span class="qv__col-label">Type</span>
				<SortHeader
					label="Question"
					sortKey="question_text"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<span class="qv__col-label">Deck</span>
				<SortHeader
					label="Created at"
					sortKey="created_at"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<SortHeader
					label="Votes"
					sortKey="votes"
					current={sortField}
					dir={sortAsc ? 'asc' : 'desc'}
					onsort={handleSort}
				/>
				<span></span>
			</div>
			{#each sorted as q (q.id)}
				{@const votes = voteCounts.get(q.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="qv__row"
					class:qv__row--archived={q.archived_at}
					onclick={() => goto(`/admin/questions/${q.id}`)}
				>
					<span class="qv__row-num mono">
						{q.question_number ? `#${q.question_number}` : ''}
					</span>
					<TypeBadge type={q.type} />
					<div class="qv__row-text-wrap">
						<span class="qv__row-text">
							{q.question_text}
						</span>
						{#if q.archived_at}
							<span class="qv__row-archived-hint">
								Archived
							</span>
						{/if}
					</div>
					<span class="qv__row-deck">
						{q.decks?.name ?? '—'}
					</span>
					<span class="qv__row-created mono">
						{formatCreatedAt(q.created_at)}
					</span>
					<VoteChips up={votes?.up ?? 0} down={votes?.down ?? 0} />
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="qv__row-actions"
						onclick={(e) => e.stopPropagation()}
					>
						<DropdownMenu items={menuItems(q)} />
					</div>
				</div>
			{/each}
		</div>

		<!-- Mobile cards -->
		<div class="qv__cards">
			{#each sorted as q (q.id)}
				{@const votes = voteCounts.get(q.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="qv__card"
					class:qv__card--archived={q.archived_at}
					onclick={() => goto(`/admin/questions/${q.id}`)}
				>
					<div class="qv__card-top">
						<span class="qv__card-num mono">
							{q.question_number ? `#${q.question_number}` : ''}
						</span>
						<TypeBadge type={q.type} />
						<span class="qv__card-spacer"></span>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div onclick={(e) => e.stopPropagation()}>
							<DropdownMenu items={menuItems(q)} />
						</div>
					</div>
					<div class="qv__card-text">{q.question_text}</div>
					<div class="qv__card-meta">
						<span>{q.decks?.name ?? '—'}</span>
						<span class="qv__card-dot"></span>
						<span class="mono">{formatCreatedAt(q.created_at)}</span
						>
						<span class="qv__card-dot"></span>
						<VoteChips
							up={votes?.up ?? 0}
							down={votes?.down ?? 0}
							compact
						/>
					</div>
					{#if q.archived_at}
						<div class="qv__card-archived">Archived</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog
	open={!!confirmTarget}
	onclose={() => (confirmTarget = null)}
	title={confirmTarget
		? `Archive Q #${confirmTarget.question_number ?? '?'}?`
		: ''}
	description="It will be hidden from gameplay and from the default list. You can restore it later from the Archived view."
	danger
	confirmLabel="Archive"
	onconfirm={doArchive}
>
	{#if confirmTarget}
		<div class="qv__confirm-preview">
			<span class="qv__confirm-num mono">
				#{confirmTarget.question_number ?? '?'}
			</span>
			{confirmTarget.question_text}
		</div>
	{/if}
</Dialog>

<Toast bind:this={toastRef} />

<style>
	/* ─── Page header ──────────────────────────────────────────── */

	.qv__header {
		display: flex;
		margin-bottom: 4px;
		align-items: flex-start;
		justify-content: space-between;
	}

	.qv__title {
		margin: 0;

		font-size: 1.5rem;
		text-wrap: balance;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.qv__subtitle {
		margin: 4px 0 0;

		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.qv__actions {
		display: flex;
		align-items: center;

		gap: 8px;
	}

	/* ─── Buttons ──────────────────────────────────────────────── */

	.qv__btn {
		display: inline-flex;
		align-items: center;
		height: var(--h-button);
		padding: 0 14px;

		font-size: 0.75rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;

		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			border-color 80ms ease;

		gap: 6px;
	}

	.qv__btn--ghost {
		color: var(--fg);
		background: transparent;
		border: 1px solid var(--border);
	}

	.qv__btn--ghost:hover {
		background: var(--surface);
		border-color: var(--border-strong);
	}

	.qv__btn--primary {
		font-weight: 600;

		color: var(--accent-fg);
		background: var(--accent);
	}

	.qv__btn--primary:hover {
		background: var(--accent-hover);
	}

	.qv__btn--sm {
		height: 30px;
		padding: 0 10px;

		font-size: 0.75rem;
	}

	/* ─── Filter bar ───────────────────────────────────────────── */

	.qv__filters {
		display: flex;
		margin: 0 -24px;
		padding: 14px 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);
		background: var(--bg);

		flex-wrap: wrap;
		gap: 8px;
	}

	.qv__search {
		display: flex;
		height: var(--h-button);
		max-width: 360px;
		padding: 0 12px;
		align-items: center;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;

		flex: 1 1 220px;
		gap: 8px;
	}

	.qv__search:focus-within {
		border-color: var(--border-strong);
	}

	.qv__search :global(svg:first-child) {
		color: var(--fg-faint);

		flex-shrink: 0;
	}

	.qv__search input {
		min-width: 0;

		font-size: 0.875rem;

		color: var(--fg);
		background: transparent;
		border: 0;
		outline: none;

		flex: 1;
	}

	.qv__search input::placeholder {
		color: var(--fg-faint);
	}

	.qv__search-clear {
		display: grid;
		width: 18px;
		height: 18px;

		place-items: center;

		color: var(--fg-faint);
		border-radius: 3px;

		flex-shrink: 0;
	}

	.qv__search-clear:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.qv__filters-spacer {
		flex: 1;
	}

	.qv__counter {
		display: inline-flex;
		align-items: center;
		padding: 0 4px;

		font-size: 0.6875rem;

		color: var(--fg-mute);

		gap: 6px;
	}

	.qv__counter-num {
		color: var(--fg);
	}

	.qv__counter-sep {
		color: var(--fg-faint);
	}

	/* ─── Status ───────────────────────────────────────────────── */

	.qv__status {
		padding: 48px 24px;

		font-size: 0.75rem;
		text-align: center;

		color: var(--fg-mute);
	}

	.qv__status--error {
		color: var(--danger);
	}

	/* ─── Desktop table ────────────────────────────────────────── */

	.qv__table {
		margin: 0 -24px;
	}

	.qv__table-head {
		display: grid;
		height: 36px;
		padding: 0 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);
		background: var(--bg-2);

		grid-template-columns: 64px 88px 1fr 140px 100px 124px 80px;
		gap: 16px;
	}

	.qv__col-label {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
	}

	.qv__row {
		display: grid;
		min-height: 52px;
		padding: 0 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);
		cursor: pointer;

		transition: background 80ms ease;

		grid-template-columns: 64px 88px 1fr 140px 100px 124px 80px;
		gap: 16px;
	}

	.qv__row:hover {
		background: var(--surface);
	}

	.qv__row--archived {
		opacity: 0.55;
	}

	.qv__row-num {
		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.qv__row-text-wrap {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 2px;
	}

	.qv__row-text {
		overflow: hidden;

		font-size: 0.875rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.qv__row-archived-hint {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	.qv__row-deck {
		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.qv__row-created {
		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.qv__row-actions {
		display: flex;
		align-items: center;
		justify-self: end;

		gap: 4px;
	}

	/* ─── Mobile cards ─────────────────────────────────────────── */

	.qv__cards {
		display: none;
		margin: 0 -24px;
		padding: 12px 24px;

		flex-direction: column;
		gap: 8px;
	}

	.qv__card {
		padding: 12px;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);
		cursor: pointer;

		transition: border-color 80ms ease;
	}

	.qv__card:hover {
		border-color: var(--border-strong);
	}

	.qv__card--archived {
		opacity: 0.6;
	}

	.qv__card-top {
		display: flex;
		margin-bottom: 8px;
		align-items: center;

		gap: 8px;
	}

	.qv__card-num {
		font-size: 0.6875rem;

		color: var(--fg-mute);
	}

	.qv__card-spacer {
		flex: 1;
	}

	.qv__card-text {
		margin-bottom: 8px;

		font-size: 0.875rem;
		line-height: 1.4;

		color: var(--fg);
	}

	.qv__card-meta {
		display: flex;
		align-items: center;

		font-size: 0.75rem;

		color: var(--fg-mute);

		gap: 10px;
	}

	.qv__card-dot {
		width: 2px;
		height: 2px;

		background: var(--border-strong);
		border-radius: 50%;
	}

	.qv__card-archived {
		margin-top: 8px;

		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	/* ─── Archive confirm ──────────────────────────────────────── */

	.qv__confirm-preview {
		padding: 12px;

		font-size: 0.75rem;

		color: var(--fg);
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);
	}

	.qv__confirm-num {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	/* ─── Responsive ───────────────────────────────────────────── */

	@media (max-width: 768px) {
		.qv__header {
			flex-direction: column;
			gap: 12px;
		}

		.qv__search {
			max-width: 100%;

			flex-basis: 100%;
		}

		.qv__table {
			display: none;
		}

		.qv__cards {
			display: flex;
		}
	}
</style>
