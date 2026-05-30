<script>
	import 'prism-code-editor/layout.css';
	import 'prism-code-editor/themes/github-dark.css';
	// Required by the indentGuides() extension below — without it the guide
	// divs render as in-flow static blocks and balloon the editor's scrollHeight.
	import 'prism-code-editor/guides.css';

	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import { supabase } from '$lib/supabase.js';
	import { logActivity } from './activityLog.js';
	import { DECK_ICONS, getDeckIconNode } from '$lib/deckIcons.js';
	import {
		validateImageFile,
		uploadDeckImage,
		deleteDeckImage,
	} from '$lib/storage.js';
	import {
		Search,
		Zap,
		ChevronLeft,
		Plus,
		Sparkles,
		Circle,
		Heart,
		Square,
		Triangle,
		Star,
		Hexagon,
	} from 'lucide-svelte';
	import LabelledField from './components/LabelledField.svelte';
	import ImageSlot from './components/ImageSlot.svelte';
	import Dialog from './components/Dialog.svelte';

	/** @type {{ id: string|null }} */
	let { id } = $props();

	const isEdit = $derived(id !== null);

	// Snippet inserted at the cursor. The selector is scoped to this deck's id
	// once saved; new decks fall back to the generic attribute selector.
	const snippets = $derived.by(() => {
		const target = id ? `[data-deck-id="${id}"]` : '[data-deck-id]';
		const head = `.deck-card--selected${target} {\n  `;
		return [
			{ label: 'Selected card', code: `${head}\n}`, caret: head.length },
		];
	});

	let name = $state('');
	let description = $state('');
	let icon = $state(/** @type {string|null} */ (null));
	let iconQuery = $state('');
	let currentImageUrl = $state(/** @type {string|null} */ (null));
	/** @type {File|null} */
	let imageFile = $state(null);
	let imagePreview = $state(/** @type {string|null} */ (null));
	let css = $state('');
	let cardCount = $state(0);
	let createdAt = $state(/** @type {string|null} */ (null));
	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');
	let tab = $state(/** @type {'look'|'css'} */ ('look'));
	let confirmDiscardOpen = $state(false);

	/** @type {{ name: string, description: string, icon: string|null, css: string, image: string|null }|null} */
	let baseline = $state(null);

	/** @type {HTMLDivElement|null} */
	let cssEditorEl = $state(null);
	/** @type {import('prism-code-editor').PrismEditor|null} */
	let cssEditor = $state(null);

	/** @type {typeof import('prism-code-editor').createEditor|null} */
	let _createEditor = null;
	/** @type {ReturnType<typeof import('prism-code-editor/guides').indentGuides>|null} */
	let _guides = null;
	/** @type {typeof import('prism-code-editor/utils').insertText|null} */
	let _insertText = null;

	async function ensureEditorModules() {
		if (_createEditor) return;
		const [{ createEditor }, { indentGuides }, { insertText }] =
			await Promise.all([
				import('prism-code-editor'),
				import('prism-code-editor/guides'),
				import('prism-code-editor/utils'),
			]);
		// Two separate modules: `languages/css` only registers indentation /
		// comment behavior, while `prism/languages/css` registers the Prism
		// grammar that actually tokenizes the code for syntax highlighting.
		await Promise.all([
			import('prism-code-editor/languages/css'),
			import('prism-code-editor/prism/languages/css'),
		]);
		_createEditor = createEditor;
		_guides = indentGuides();
		_insertText = insertText;
	}

	const dirty = $derived.by(() => {
		if (!baseline || loading) return false;
		return (
			name !== baseline.name ||
			description !== baseline.description ||
			icon !== baseline.icon ||
			css !== baseline.css ||
			imageFile !== null ||
			currentImageUrl !== baseline.image
		);
	});

	const previewImage = $derived(imagePreview ?? currentImageUrl ?? null);
	const previewIconNode = $derived(getDeckIconNode(icon));
	const cssLineCount = $derived(Math.max(1, css.split('\n').length));

	const filteredDeckIcons = $derived.by(() => {
		const tokens = iconQuery
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter(Boolean);
		if (tokens.length === 0) return DECK_ICONS;
		return DECK_ICONS.filter((item) =>
			tokens.every((token) => item.searchText.includes(token)),
		);
	});

	// ─── AI icon-suggestion fallback ───────────────────────────────
	// When the substring filter finds nothing, ask the model for the
	// closest Lucide icons (Raycast-style). Guaranteed-valid results are
	// returned by the endpoint; we just render them as normal picks.

	const LOADER_SHAPES = [Circle, Heart, Square, Triangle, Star, Hexagon];

	/** @type {'idle'|'loading'|'done'|'empty'|'error'} */
	let aiStatus = $state('idle');
	let aiSuggestions = $state(
		/** @type {{ id: string, label: string }[]} */ ([]),
	);
	let aiQuery = $state('');
	let loaderIndex = $state(0);
	/** @type {SvelteMap<string, { id: string, label: string }[]>} */
	const suggestionCache = new SvelteMap();
	/** @type {AbortController|null} */
	let aiController = null;
	/** @type {ReturnType<typeof setTimeout>|undefined} */
	let aiTimer;

	function resetAi() {
		aiController?.abort();
		aiController = null;
		aiStatus = 'idle';
		aiSuggestions = [];
		aiQuery = '';
	}

	/** @param {string} query */
	async function fetchSuggestions(query) {
		const cacheKey = query.toLowerCase();
		const cached = suggestionCache.get(cacheKey);
		if (cached) {
			aiController?.abort();
			aiController = null;
			aiQuery = query;
			aiSuggestions = cached;
			aiStatus = cached.length ? 'done' : 'empty';
			return;
		}

		aiController?.abort();
		const controller = new AbortController();
		aiController = controller;
		aiQuery = query;
		aiStatus = 'loading';

		try {
			const headers = new Headers({ 'Content-Type': 'application/json' });
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;
			if (token) headers.set('Authorization', `Bearer ${token}`);

			const response = await fetch(`${base}/api/suggest-icons`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ query }),
				signal: controller.signal,
			});
			const data = await response.json();
			if (!response.ok)
				throw new Error(data?.error ?? 'Failed to suggest icons.');
			if (controller.signal.aborted) return;

			const icons = Array.isArray(data.icons) ? data.icons : [];
			suggestionCache.set(cacheKey, icons);
			aiSuggestions = icons;
			aiStatus = icons.length ? 'done' : 'empty';
		} catch (/** @type {any} */ err) {
			if (controller.signal.aborted || err?.name === 'AbortError') return;
			aiSuggestions = [];
			aiStatus = 'error';
		}
	}

	// Debounced trigger: fire only on a genuine zero-match query (≥2 chars),
	// 350ms after typing settles. Re-runs are guarded so it won't re-fire for
	// a query already loading or resolved.
	$effect(() => {
		const query = iconQuery.trim();
		const noMatches = filteredDeckIcons.length === 0;
		clearTimeout(aiTimer);

		if (!noMatches || query.length < 2) {
			untrack(() => {
				if (aiStatus !== 'idle') resetAi();
			});
			return;
		}

		const settled = untrack(() => aiQuery === query && aiStatus !== 'idle');
		if (settled) return;

		aiTimer = setTimeout(() => fetchSuggestions(query), 350);
		return () => clearTimeout(aiTimer);
	});

	// Cycle the loader shapes while a suggestion call is in flight.
	$effect(() => {
		if (aiStatus !== 'loading') return;
		const interval = setInterval(() => {
			loaderIndex = (loaderIndex + 1) % LOADER_SHAPES.length;
		}, 420);
		return () => clearInterval(interval);
	});

	onMount(() => {
		if (isEdit && id) {
			loadDeck(id);
		} else {
			baseline = snapshot();
		}
	});

	// Scroll the selected icon into view when the icon changes.
	$effect(() => {
		if (!icon || loading) return;
		const active = document.querySelector('.dform__icon-btn--active');
		if (active) active.scrollIntoView({ block: 'nearest' });
	});

	// Mount the prism editor whenever the Custom CSS tab renders its host.
	$effect(() => {
		if (!cssEditorEl) return;
		const host = cssEditorEl;
		let editor =
			/** @type {import('prism-code-editor').PrismEditor|null} */ (null);
		let destroyed = false;
		ensureEditorModules().then(() => {
			if (destroyed || !_createEditor) return;
			editor = _createEditor(
				host,
				{
					language: 'css',
					value: css,
					lineNumbers: true,
					wordWrap: false,
					onUpdate: (/** @type {string} */ v) => (css = v),
				},
				_guides,
			);
			cssEditor = editor;
		});
		return () => {
			destroyed = true;
			editor?.remove();
			cssEditor = null;
		};
	});

	function snapshot() {
		return {
			name,
			description,
			icon,
			css,
			image: currentImageUrl,
		};
	}

	async function loadDeck(/** @type {string} */ deckId) {
		loading = true;
		const [deckRes, countRes] = await Promise.all([
			supabase.from('decks').select('*').eq('id', deckId).single(),
			supabase
				.from('questions')
				.select('id', { count: 'exact', head: true })
				.eq('deck_id', deckId)
				.is('archived_at', null),
		]);
		if (deckRes.error) {
			error = 'Failed to load deck.';
			loading = false;
			return;
		}
		const data = deckRes.data;
		name = data.name;
		description = data.description ?? '';
		icon = data.icon ?? null;
		currentImageUrl = data.image_url ?? null;
		css = data.css ?? '';
		createdAt = data.created_at ?? null;
		cardCount = countRes.count ?? 0;
		loading = false;
		baseline = snapshot();
	}

	function relativeTime(/** @type {string|null} */ iso) {
		if (!iso) return '-';
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return '—';
		const diff = Date.now() - then;
		const day = 86_400_000;
		if (diff < day) return 'today';
		const days = Math.floor(diff / day);
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) {
			const w = Math.floor(days / 7);
			return w === 1 ? '1 week ago' : `${w} weeks ago`;
		}
		if (days < 365) {
			const m = Math.floor(days / 30);
			return m === 1 ? '1 month ago' : `${m} months ago`;
		}
		const y = Math.floor(days / 365);
		return y === 1 ? '1 year ago' : `${y} years ago`;
	}

	function handleFileChange(/** @type {Event} */ e) {
		const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
		if (!file) return;
		const validation = validateImageFile(file);
		if (!validation.valid) {
			error = validation.error ?? 'Invalid file.';
			return;
		}
		error = '';
		imageFile = file;
		const reader = new FileReader();
		reader.onloadend = () => {
			imagePreview = /** @type {string} */ (reader.result);
		};
		reader.readAsDataURL(file);
	}

	async function handleRemoveImage() {
		if (currentImageUrl) {
			await deleteDeckImage(currentImageUrl).catch(console.warn);
			currentImageUrl = null;
		}
		imageFile = null;
		imagePreview = null;
	}

	function applySnippet(
		/** @type {{ code: string, caret: number }} */ snippet,
	) {
		if (cssEditor && _insertText) {
			// Insert at the caret and drop the cursor on the blank line.
			const [start] = cssEditor.getSelection();
			_insertText(
				cssEditor,
				snippet.code,
				undefined,
				undefined,
				start + snippet.caret,
			);
			cssEditor.focus();
		} else {
			// Editor not mounted yet — append as a fallback.
			css = (css ? css + '\n\n' : '') + snippet.code;
		}
	}

	function handleBack() {
		if (dirty) {
			confirmDiscardOpen = true;
		} else {
			goto('/admin/decks');
		}
	}

	function confirmDiscard() {
		confirmDiscardOpen = false;
		goto('/admin/decks');
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Name is required.';
			return;
		}
		error = '';
		saving = true;

		try {
			let imageUrl = currentImageUrl;

			if (isEdit && id) {
				if (imageFile) {
					if (currentImageUrl)
						await deleteDeckImage(currentImageUrl).catch(
							console.warn,
						);
					imageUrl = await uploadDeckImage(id, imageFile);
				}
				const { error: err } = await supabase
					.from('decks')
					.update({
						name: name.trim(),
						description: description.trim() || null,
						icon: icon || null,
						image_url: imageUrl,
						css: css.trim() || null,
					})
					.eq('id', id);
				if (err) throw err;
				logActivity({
					verb: 'edited',
					entity_type: 'deck',
					entity_id: id,
					summary: `deck "${name.trim()}"`,
					deck_name: null,
				});
			} else {
				const { data: deck, error: insertErr } = await supabase
					.from('decks')
					.insert({
						name: name.trim(),
						description: description.trim() || null,
						icon: icon || null,
						css: css.trim() || null,
					})
					.select('id')
					.single();
				if (insertErr) throw insertErr;
				if (imageFile && deck) {
					imageUrl = await uploadDeckImage(deck.id, imageFile);
					await supabase
						.from('decks')
						.update({ image_url: imageUrl })
						.eq('id', deck.id);
				}
				logActivity({
					verb: 'created',
					entity_type: 'deck',
					entity_id: deck?.id ?? null,
					summary: `deck "${name.trim()}"`,
					deck_name: null,
				});
			}
			baseline = snapshot();
			goto('/admin/decks');
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save deck.';
			saving = false;
		}
	}
</script>

<div class="dform">
	<!-- ─── Header ───────────────────────────────────────────────── -->
	<header class="dform__header">
		<button
			class="dform__back"
			type="button"
			onclick={handleBack}
			disabled={saving}
		>
			<ChevronLeft size={14} />
			<span>Back</span>
		</button>
		<div class="dform__title-area">
			<span class="dform__title-text">
				{name || (isEdit ? 'Untitled' : 'New deck')}
			</span>
			<span class="dform__breadcrumb dform__breadcrumb--inline mono">
				/admin/decks/{id ?? 'new'}
			</span>
		</div>
		<span class="dform__spacer"></span>
		{#if dirty}
			<span class="dform__dirty">
				<span class="dform__dirty-dot"></span>
				Unsaved
			</span>
		{/if}
		{#if error}
			<span class="dform__error">{error}</span>
		{/if}
		<button
			class="dform__btn dform__btn--ghost"
			type="button"
			onclick={handleBack}
			disabled={!dirty || saving}
		>
			Discard
		</button>
		<button
			class="dform__btn dform__btn--primary"
			type="button"
			onclick={() => handleSubmit()}
			disabled={saving}
		>
			<Zap size={13} />
			{saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
		</button>
	</header>

	{#if loading}
		<div class="dform__loading">Loading…</div>
	{:else}
		<div class="dform__body">
			<span class="dform__breadcrumb dform__breadcrumb--body mono">
				/admin/decks/{id ?? '<id>'}
			</span>
			<!-- Left: form -->
			<div class="dform__main">
				<div class="dform__fields">
					<LabelledField label="Name">
						<input
							class="dform__input"
							type="text"
							bind:value={name}
							placeholder="e.g. 90-talet"
							disabled={saving}
						/>
					</LabelledField>
					<LabelledField label="Description" optional>
						<input
							class="dform__input"
							type="text"
							bind:value={description}
							placeholder="One-line summary"
							disabled={saving}
						/>
					</LabelledField>
				</div>

				<!-- Tabs -->
				<div class="dform__tabs">
					<button
						class="dform__tab"
						class:dform__tab--active={tab === 'look'}
						type="button"
						onclick={() => (tab = 'look')}
					>
						Look
						<span class="dform__tab-hint mono">Icon · Image</span>
					</button>
					<button
						class="dform__tab"
						class:dform__tab--active={tab === 'css'}
						type="button"
						onclick={() => (tab = 'css')}
					>
						Custom CSS
						<span class="dform__tab-hint mono">
							{css ? 'Active' : 'None'}
						</span>
					</button>
				</div>

				{#if tab === 'look'}
					<div class="dform__look">
						<LabelledField label="Icon" hint="Lucide library">
							<div class="dform__icon-picker">
								<div class="dform__icon-search">
									<Search size={12} />
									<input
										type="search"
										bind:value={iconQuery}
										placeholder="Search 1,000+ icons…"
										disabled={saving}
									/>
									{#if icon}
										<button
											class="dform__icon-clear"
											type="button"
											onclick={() => (icon = null)}
											disabled={saving}
										>
											Clear
										</button>
									{:else}
										<span class="dform__icon-count mono">
											{filteredDeckIcons.length}
										</span>
									{/if}
								</div>
								<div class="dform__icon-grid">
									{#each filteredDeckIcons as item (item.id)}
										<button
											class="dform__icon-btn"
											class:dform__icon-btn--active={icon ===
												item.id}
											type="button"
											onclick={() =>
												(icon =
													icon === item.id
														? null
														: item.id)}
											title={item.label}
											aria-pressed={icon === item.id}
											disabled={saving}
										>
											<LucideIcon
												name={item.id}
												iconNode={item.iconNode}
												size={18}
												aria-hidden="true"
											/>
										</button>
									{/each}
									{#if filteredDeckIcons.length === 0}
										<div class="dform__ai">
											{#if aiStatus === 'loading'}
												{@const Shape =
													LOADER_SHAPES[loaderIndex]}
												<div class="dform__ai-loader">
													{#key loaderIndex}
														<span
															class="dform__ai-shape"
														>
															<Shape size={20} />
														</span>
													{/key}
													<span>
														Finding icons for "{aiQuery}"…
													</span>
												</div>
											{:else if aiStatus === 'done'}
												<div class="dform__ai-head">
													<Sparkles size={11} />
													<span>Suggested by AI</span>
												</div>
												<div class="dform__ai-grid">
													{#each aiSuggestions as item (item.id)}
														<button
															class="dform__icon-btn"
															class:dform__icon-btn--active={icon ===
																item.id}
															type="button"
															onclick={() =>
																(icon =
																	icon ===
																	item.id
																		? null
																		: item.id)}
															title={item.label}
															aria-pressed={icon ===
																item.id}
															disabled={saving}
														>
															<LucideIcon
																name={item.id}
																iconNode={getDeckIconNode(
																	item.id,
																)}
																size={18}
																aria-hidden="true"
															/>
														</button>
													{/each}
												</div>
											{:else if aiStatus === 'empty'}
												<p class="dform__icon-empty">
													No close matches for "{aiQuery}".
												</p>
											{:else if aiStatus === 'error'}
												<p
													class="dform__icon-empty dform__ai-error"
												>
													Couldn't reach suggestions.
													<button
														type="button"
														class="dform__icon-clear"
														onclick={() =>
															fetchSuggestions(
																iconQuery.trim(),
															)}
													>
														Retry
													</button>
												</p>
											{:else}
												<p class="dform__icon-empty">
													No icons match "{iconQuery}".
												</p>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</LabelledField>

						<LabelledField
							label="Image"
							hint="JPEG/PNG/WebP · max 5MB"
							optional
						>
							<ImageSlot
								src={previewImage ?? ''}
								onupload={handleFileChange}
								onclear={handleRemoveImage}
							/>
							{#if previewImage}
								<p class="dform__image-note">
									When set, the image is shown on the card.
									The icon overlays at low opacity.
								</p>
							{/if}
						</LabelledField>
					</div>
				{:else}
					<div class="dform__css">
						<div class="dform__css-editor">
							<div class="dform__css-bar">
								<span class="dform__css-dot"></span>
								<span class="mono">styles.css</span>
								<span class="dform__css-target">
									· targets
									<span class="mono dform__css-target-token">
										[data-deck-id]
									</span>
								</span>
								<span class="dform__spacer"></span>
								<span class="dform__css-lines">
									{cssLineCount} lines
								</span>
							</div>
							<div
								class="dform__css-host"
								bind:this={cssEditorEl}
							></div>
						</div>
						<div class="dform__snippets">
							<div class="dform__snippets-head">Snippets</div>
							<div class="dform__snippets-list">
								{#each snippets as snippet (snippet.label)}
									<button
										class="dform__snippet"
										type="button"
										onclick={() => applySnippet(snippet)}
										disabled={saving}
									>
										<Plus size={11} />
										{snippet.label}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Right: live preview -->
			<aside class="dform__preview-col">
				<div
					class="dform__preview"
					class:dform__preview--image={previewImage}
					style:background-image={previewImage
						? `url(${previewImage})`
						: undefined}
				>
					{#if !previewImage}
						<div
							class="dform__preview-glow"
							aria-hidden="true"
						></div>
					{/if}
					<div class="dform__preview-top">
						<div class="dform__preview-icon">
							<LucideIcon
								name={icon ?? 'Layers'}
								iconNode={previewIconNode}
								size={22}
								aria-hidden="true"
							/>
						</div>
						<span class="dform__preview-pill mono">
							{cardCount || 0} kort
						</span>
					</div>
				</div>

				<dl class="dform__meta">
					<div class="dform__meta-row">
						<dt>Cards</dt>
						<dd class="mono">{cardCount || 0}</dd>
					</div>
					<div class="dform__meta-row">
						<dt>Created</dt>
						<dd>{relativeTime(createdAt)}</dd>
					</div>
					<div class="dform__meta-row">
						<dt>Custom CSS</dt>
						<dd
							class="mono"
							class:dform__meta-ok={css}
							class:dform__meta-faint={!css}
						>
							{css ? `${cssLineCount} lines` : 'none'}
						</dd>
					</div>
				</dl>
			</aside>
		</div>
	{/if}
</div>

<Dialog
	open={confirmDiscardOpen}
	onclose={() => (confirmDiscardOpen = false)}
	title="Discard your changes?"
	description="Anything you've edited since opening this deck will be lost."
	danger
	confirmLabel="Discard"
	onconfirm={confirmDiscard}
/>

<style>
	/* ─── Header ───────────────────────────────────────────────── */

	.dform__header {
		display: flex;
		margin: -24px -24px 0;
		padding: 14px 24px;
		align-items: center;
		min-height: 60px;

		background: var(--glass-bg);
		border-bottom: 1px solid var(--border);
		backdrop-filter: blur(8px);

		gap: 14px;
	}

	.dform__back {
		display: inline-flex;
		align-items: center;
		height: 30px;
		padding: 0 10px;

		font-size: 0.75rem;

		color: var(--fg-mute);
		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			color 80ms ease;

		gap: 4px;

		&:hover {
			color: var(--fg);
			background: var(--surface);
		}
	}

	.dform__title-area {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 2px;
	}

	.dform__breadcrumb {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	.dform__breadcrumb--body {
		display: none;
	}

	.dform__title-text {
		overflow: hidden;

		font-size: 1rem;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dform__spacer {
		flex: 1;
	}

	.dform__dirty {
		display: inline-flex;
		align-items: center;

		font-size: 0.75rem;

		color: var(--accent-2);

		gap: 6px;
	}

	.dform__dirty-dot {
		width: 6px;
		height: 6px;

		background: var(--accent-2);
		border-radius: 50%;
	}

	.dform__error {
		font-size: 0.75rem;

		color: var(--danger);
	}

	.dform__btn {
		display: inline-flex;
		align-items: center;
		height: var(--h-button);
		padding: 0 14px;

		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;

		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			border-color 80ms ease;

		gap: 6px;

		&:disabled {
			cursor: default;
			opacity: 0.5;
		}
	}

	.dform__btn--ghost {
		color: var(--fg);
		background: transparent;
		border: 1px solid var(--border);

		&:not(:disabled):hover {
			background: var(--surface);
			border-color: var(--border-strong);
		}
	}

	.dform__btn--primary {
		font-weight: 600;

		color: var(--accent-fg);
		background: var(--accent);

		&:not(:disabled):hover {
			background: var(--accent-hover);
		}
	}

	/* ─── Body layout ──────────────────────────────────────────── */

	.dform__loading {
		padding: 48px 24px;

		font-size: 0.75rem;
		text-align: center;

		color: var(--fg-mute);
	}

	.dform__body {
		display: grid;
		padding-top: 24px;
		align-items: start;

		grid-template-columns: 1fr 320px;
		gap: 28px;
	}

	.dform__main {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 22px;
	}

	.dform__fields {
		display: grid;

		grid-template-columns: 1.4fr 1fr;
		gap: 16px;
	}

	.dform__input {
		width: 100%;
		height: var(--h-button);
		padding: 0 12px;

		font-size: 0.875rem;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;

		&:focus-visible {
			border-color: var(--border-strong);
			outline: none;
		}

		&::placeholder {
			color: var(--fg-faint);
		}
	}

	/* ─── Tabs ─────────────────────────────────────────────────── */

	.dform__tabs {
		display: flex;
		align-items: center;

		border-bottom: 1px solid var(--border);
	}

	.dform__tab {
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 16px;
		margin-bottom: -1px;

		font-size: 0.875rem;
		font-weight: 500;

		color: var(--fg-mute);
		border-bottom: 2px solid transparent;

		gap: 8px;

		&:hover {
			color: var(--fg);
		}
	}

	.dform__tab--active {
		color: var(--fg);
		border-bottom-color: var(--accent);
	}

	.dform__tab-hint {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	/* ─── Look tab ─────────────────────────────────────────────── */

	.dform__look {
		display: grid;

		grid-template-columns: 1fr 1fr;
		gap: 22px;
	}

	.dform__icon-picker {
		display: flex;

		flex-direction: column;
		gap: 8px;
	}

	.dform__icon-search {
		display: flex;
		height: 34px;
		padding: 0 10px;
		align-items: center;

		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		gap: 8px;

		input {
			min-width: 0;

			font-size: 0.75rem;

			color: var(--fg);
			background: transparent;
			border: 0;
			outline: none;

			flex: 1;

			&::placeholder {
				color: var(--fg-faint);
			}
		}
	}

	.dform__icon-search :global(svg:first-child) {
		color: var(--fg-faint);

		flex-shrink: 0;
	}

	.dform__icon-count {
		font-size: 0.625rem;

		color: var(--fg-faint);
	}

	.dform__icon-clear {
		font-size: 0.6875rem;

		color: var(--accent-2);
		&:hover {
			color: var(--accent-2-hover);
		}
	}

	.dform__icon-grid {
		display: grid;
		max-height: 240px;
		padding: 4px;
		overflow: auto;

		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
		gap: 4px;
	}

	.dform__icon-btn {
		display: grid;
		aspect-ratio: 1;

		color: var(--fg-mute);
		border: 1px solid transparent;
		border-radius: var(--r-1);

		transition:
			background 80ms ease,
			color 80ms ease;

		place-items: center;

		&:not(:disabled):hover {
			color: var(--fg);
			background: var(--surface);
		}
	}

	.dform__icon-btn--active {
		color: var(--accent);
		background: var(--accent-soft);
		border-color: var(--border-accent);
	}

	.dform__icon-empty {
		margin: 0;
		padding: 12px;

		font-size: 0.75rem;

		color: var(--fg-faint);

		grid-column: 1 / -1;
	}

	/* ─── AI icon suggestions ──────────────────────────────────── */

	.dform__ai {
		grid-column: 1 / -1;
	}

	.dform__ai-loader {
		display: flex;
		padding: 12px;
		align-items: center;

		font-size: 0.75rem;

		color: var(--fg-mute);

		gap: 10px;
	}

	.dform__ai-shape {
		display: inline-grid;

		color: var(--accent-2);

		place-items: center;

		animation: dform-pop 420ms ease;
	}

	@keyframes dform-pop {
		from {
			opacity: 0.55;

			transform: scale(0.92);
		}

		to {
			opacity: 1;

			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dform__ai-shape {
			animation: none;
		}
	}

	.dform__ai-head {
		display: flex;
		padding: 8px 12px 6px;
		align-items: center;

		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;

		color: var(--accent-2);

		gap: 6px;
	}

	.dform__ai-grid {
		display: grid;
		padding: 0 4px 4px;

		grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
		gap: 4px;
	}

	.dform__ai-error {
		display: flex;
		align-items: center;

		gap: 8px;
	}

	.dform__image-note {
		margin: 8px 0 0;

		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	/* ─── Custom CSS tab ───────────────────────────────────────── */

	.dform__css {
		display: grid;
		height: 360px;
		overflow: hidden;

		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		grid-template-columns: 1fr 200px;
		grid-template-rows: minmax(0, 1fr);
	}

	.dform__css-editor {
		display: flex;
		min-width: 0;
		min-height: 0;

		border-right: 1px solid var(--border);
		flex-direction: column;
	}

	.dform__css-bar {
		display: flex;
		padding: 8px 12px;
		align-items: center;

		font-size: 0.6875rem;

		color: var(--fg-mute);
		background: var(--surface);
		border-bottom: 1px solid var(--border);

		gap: 8px;
	}

	.dform__css-dot {
		width: 8px;
		height: 8px;

		background: lch(64% 60 145);
		border-radius: 50%;
	}

	.dform__css-target {
		color: var(--fg-faint);
	}

	.dform__css-target-token {
		color: var(--fg);
	}

	.dform__css-lines {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	.dform__css-host {
		display: flex;
		overflow: hidden;
		min-height: 0;

		flex: 1;
	}

	.dform__css-host :global(.prism-code-editor) {
		height: 100%;

		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 20px;

		background: var(--bg-2);

		flex: 1;

		--pce-bg: var(--bg-2);
		--pce-line-number: var(--fg-faint);
		--padding-inline: 14px;
		--number-spacing: 10px;
	}

	.dform__snippets {
		display: flex;
		min-height: 0;

		background: var(--bg-2);
		flex-direction: column;
	}

	.dform__snippets-head {
		padding: 8px 12px;

		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
		border-bottom: 1px solid var(--border);
	}

	.dform__snippets-list {
		display: flex;
		padding: 8px;
		overflow: auto;
		min-height: 0;

		flex: 1;
		flex-direction: column;
		gap: 4px;
	}

	.dform__snippet {
		display: flex;
		align-items: center;
		padding: 8px 10px;

		font-size: 0.75rem;
		text-align: left;

		color: var(--fg);
		border-radius: var(--r-1);

		transition: background 80ms ease;

		gap: 6px;

		&:not(:disabled):hover {
			background: var(--surface);
		}
	}

	.dform__snippet :global(svg) {
		color: var(--fg-faint);

		flex-shrink: 0;
	}

	/* ─── Live preview ─────────────────────────────────────────── */

	.dform__preview-col {
		display: flex;
		position: sticky;
		top: 0;
		align-items: flex-start;

		flex-direction: column;
		gap: 10px;
	}

	.dform__preview {
		display: flex;
		position: relative;
		overflow: hidden;
		width: 200px;
		height: 280px;
		padding: 18px;

		color: var(--glass-fg);
		background: linear-gradient(160deg, var(--surface-2) 0%, var(--bg) 70%);
		background-position: center;
		background-size: cover;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-3);
		box-shadow: 0 20px 40px -16px lch(0% 0 0 / 0.7);

		flex-direction: column;
		justify-content: space-between;
		flex: 0 0 200px;
	}

	.dform__preview-glow {
		position: absolute;
		inset: 0;

		background: radial-gradient(
			circle at 30% 20%,
			lch(94.2% 90.2 115 / 0.08),
			transparent 50%
		);

		pointer-events: none;
	}

	.dform__preview-top {
		display: flex;
		position: relative;
		align-items: flex-start;
		justify-content: space-between;
	}

	.dform__preview-icon {
		display: grid;
		width: 44px;
		height: 44px;

		color: var(--glass-fg);
		background: lch(100% 0 0 / 0.08);
		border: 1px solid var(--glass-border);
		border-radius: 10px;

		backdrop-filter: blur(6px);
		place-items: center;
	}

	.dform__preview-pill {
		padding: 3px 8px;

		font-size: 0.6875rem;

		color: lch(100% 0 0 / 0.7);
		background: var(--scrim);
		border: 1px solid var(--glass-border);
		border-radius: 100px;
	}

	.dform__meta {
		display: flex;
		width: 200px;
		margin: 6px 0 0;

		font-size: 0.75rem;

		color: var(--fg-mute);

		flex-direction: column;
		gap: 8px;
	}

	.dform__meta-row {
		display: flex;
		justify-content: space-between;
	}

	.dform__meta-row dd {
		margin: 0;

		color: var(--fg);
	}

	.dform__meta-ok {
		color: var(--ok);
	}

	.dform__meta-faint {
		color: var(--fg-faint);
	}

	/* ─── Responsive ───────────────────────────────────────────── */

	@media (max-width: 900px) {
		.dform__body {
			grid-template-columns: 1fr;
			gap: 22px;
		}

		.dform__preview-col {
			position: static;
			align-items: center;
			order: -1;
		}
	}

	@media (max-width: 768px) {
		.dform__breadcrumb--inline {
			display: none;
		}

		.dform__breadcrumb--body {
			display: block;
			order: -2;
			overflow: hidden;

			grid-column: 1 / -1;

			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.dform__back span {
			display: none;
		}

		.dform__title-text {
			font-size: 0.875rem;
		}

		.dform__dirty {
			width: 8px;
			height: 8px;
			overflow: hidden;

			font-size: 0;

			background: var(--accent-2);
			border-radius: 50%;
		}

		.dform__dirty-dot {
			display: none;
		}

		.dform__btn--ghost {
			display: none;
		}

		.dform__btn--primary {
			height: 32px;
			padding: 0 12px;
		}

		.dform__fields {
			grid-template-columns: 1fr;
		}

		.dform__look {
			grid-template-columns: 1fr;
		}

		.dform__css {
			height: auto;

			grid-template-columns: 1fr;
		}

		.dform__css-editor {
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}

		.dform__css-host {
			height: 260px;
		}
	}
</style>
