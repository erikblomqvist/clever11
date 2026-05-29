<script>
	import { untrack } from 'svelte';
	import { supabase } from '$lib/supabase.js';
	import { resizeAndUploadOptionImage } from '$lib/storage.js';
	import { goto } from '$app/navigation';
	import { logActivity } from './activityLog.js';
	import { hslToCss } from '$lib/utilities/color.js';
	import AdminIcon from './components/AdminIcon.svelte';
	import Select from './components/Select.svelte';
	import LabelledField from './components/LabelledField.svelte';
	import ImageSlot from './components/ImageSlot.svelte';
	import UrlsBlock from './components/UrlsBlock.svelte';
	import SoftHyphenHelper from './components/SoftHyphenHelper.svelte';
	import Dialog from './components/Dialog.svelte';
	import CorrectAnswerEditor from './components/CorrectAnswerEditor.svelte';
	import OptionMasterList from './components/OptionMasterList.svelte';

	/** @type {{ id: string|null }} */
	let { id } = $props();

	const isEdit = $derived(id !== null);
	const NUM_BLOBS = 10;
	const draftMediaId = crypto.randomUUID();

	// --- Form state ---
	let deckId = $state('');
	let type = $state(
		/** @type {import('$lib/data/questionTypes.js').QuestionType} */ (
			'standard'
		),
	);
	let questionText = $state('');
	let questionNumber = $state(/** @type {number|''} */ (''));
	let optionDisplayMode = $state(/** @type {'text'|'image'} */ ('text'));
	let options = $state(/** @type {string[]} */ (Array(NUM_BLOBS).fill('')));
	let correctAnswers = $state(
		/** @type {any[]} */ (Array(NUM_BLOBS).fill('')),
	);
	let colorHsl = $state(
		Array(NUM_BLOBS)
			.fill(null)
			.map(() => ({ h: 0, s: 80, l: 50 })),
	);
	let media = $state(
		Array(NUM_BLOBS)
			.fill(null)
			.map(() => createEmptyMedia()),
	);
	let imageUploading = $state(Array(NUM_BLOBS).fill(false));

	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	// --- Editor state ---
	let focusedIdx = $state(0);
	let dirty = $state(false);
	let confirmDiscardOpen = $state(false);

	const focusedMedia = $derived(media[focusedIdx]);

	const TYPE_OPTIONS = [
		{ value: 'standard', label: 'Standard' },
		{ value: 'boolean', label: 'Boolean (Yes / No)' },
		{ value: 'rank', label: 'Rank (1–10)' },
		{ value: 'chooseBetween', label: 'Choose between' },
		{ value: 'colors', label: 'Colors' },
		{ value: 'numbers', label: 'Numbers' },
		{ value: 'centuryDecade', label: 'Century / Decade' },
	];

	// Reset correct answers when type changes
	let prevType = $state(untrack(() => type));
	$effect(() => {
		if (type !== prevType) {
			correctAnswers = initCorrectAnswers(type);
			prevType = type;
			dirty = true;
		}
	});

	$effect(() => {
		loadDecks();
		if (isEdit && id) loadQuestion(id);
		else loading = false;
	});

	// Keyboard shortcuts
	function handleKeydown(/** @type {KeyboardEvent} */ e) {
		const meta = e.metaKey || e.ctrlKey;
		if (meta && e.key === 's') {
			e.preventDefault();
			handleSubmit();
		}
		if (
			!(
				/** @type {HTMLElement} */ (e.target).matches(
					'input, textarea, select',
				)
			)
		) {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				focusedIdx = Math.max(0, focusedIdx - 1);
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				focusedIdx = Math.min(9, focusedIdx + 1);
			}
		}
		if (meta && /^[0-9]$/.test(e.key)) {
			e.preventDefault();
			focusedIdx = e.key === '0' ? 9 : Number(e.key) - 1;
		}
	}

	// --- Data loading ---
	async function loadDecks() {
		const { data } = await supabase
			.from('decks')
			.select('id, name')
			.order('name');
		decks = data ?? [];
	}

	/** @param {import('$lib/data/questionTypes.js').QuestionType} t */
	function initCorrectAnswers(t) {
		if (t === 'boolean') return Array(NUM_BLOBS).fill(false);
		if (t === 'rank' || t === 'numbers') return Array(NUM_BLOBS).fill(0);
		return Array(NUM_BLOBS).fill('');
	}

	async function loadQuestion(/** @type {string} */ qId) {
		const { data, error: err } = await supabase
			.from('questions')
			.select('*')
			.eq('id', qId)
			.single();
		if (err) {
			error = 'Failed to load question.';
			loading = false;
			return;
		}

		deckId = data.deck_id;
		type = data.type;
		prevType = data.type;
		questionText = data.question_text;
		questionNumber = data.question_number ?? '';
		options = data.options_json ?? Array(NUM_BLOBS).fill('');

		const loaded = data.correct_answers_json ?? Array(NUM_BLOBS).fill('');
		correctAnswers = loaded;

		if (data.type === 'colors') {
			colorHsl = loaded.map((/** @type {any} */ ca) => {
				const match = (ca?.backgroundColor ?? '').match(
					/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/,
				);
				return match
					? { h: +match[1], s: +match[2], l: +match[3] }
					: { h: 0, s: 80, l: 50 };
			});
		}

		const loadedMedia =
			data.answer_media_json ?? Array(NUM_BLOBS).fill(null);
		media = loadedMedia.map((/** @type {any} */ m) => ({
			url: m?.url ?? '',
			spotify_url: m?.spotify_url ?? '',
			youtube_url: m?.youtube_url ?? '',
			option_image_url: m?.option_image_url ?? '',
			option_image_path: m?.option_image_path ?? '',
			option_image_alt: m?.option_image_alt ?? '',
		}));
		optionDisplayMode = media.every((m) => m.option_image_url)
			? 'image'
			: 'text';

		loading = false;
	}

	function createEmptyMedia() {
		return {
			url: '',
			spotify_url: '',
			youtube_url: '',
			option_image_url: '',
			option_image_path: '',
			option_image_alt: '',
		};
	}

	// --- Option reorder ---
	function moveOption(/** @type {number} */ from, /** @type {number} */ to) {
		if (to < 0 || to > 9) return;
		const swap = (/** @type {any[]} */ arr) => {
			const next = [...arr];
			[next[from], next[to]] = [next[to], next[from]];
			return next;
		};
		options = swap(options);
		correctAnswers = swap(correctAnswers);
		colorHsl = swap(colorHsl);
		media = swap(media);
		imageUploading = swap(imageUploading);
		focusedIdx = to;
		dirty = true;
	}

	// --- Image upload ---
	/** @param {number} index @param {Event} event */
	async function handleOptionImageFile(index, event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		error = '';
		imageUploading[index] = true;
		try {
			const basePath = `questions/${id ?? draftMediaId}/options`;
			const result = await resizeAndUploadOptionImage(file, {
				basePath,
				index,
			});
			media[index] = {
				...media[index],
				option_image_url: result.url,
				option_image_path: result.path,
				option_image_alt: options[index] ?? '',
			};
			dirty = true;
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to upload option image.';
		} finally {
			imageUploading[index] = false;
		}
	}

	/** @param {number} index */
	function clearOptionImage(index) {
		media[index] = {
			...media[index],
			option_image_url: '',
			option_image_path: '',
			option_image_alt: '',
		};
		dirty = true;
	}

	// --- Soft-hyphen ---
	const SHY = '­';
	const LONG_WORD_THRESHOLD = 11;

	let longWords = $derived.by(() => {
		if (!questionText) return [];
		/** @type {{ text: string, offset: number }[]} */
		const result = [];
		const regex = /\S+/g;
		let match;
		while ((match = regex.exec(questionText)) !== null) {
			const cleanLen = match[0].replaceAll(SHY, '').length;
			if (cleanLen >= LONG_WORD_THRESHOLD) {
				result.push({ text: match[0], offset: match.index });
			}
		}
		return result;
	});

	/** @param {number} offset @param {string} wordText @param {number} charIndex */
	function toggleShy(offset, wordText, charIndex) {
		const chars = [];
		const shyAfter = {};
		for (const c of wordText) {
			if (c === SHY) {
				if (chars.length > 0) shyAfter[chars.length - 1] = true;
			} else {
				chars.push(c);
			}
		}
		if (shyAfter[charIndex]) delete shyAfter[charIndex];
		else shyAfter[charIndex] = true;
		let rebuilt = '';
		for (let i = 0; i < chars.length; i++) {
			rebuilt += chars[i];
			if (shyAfter[i]) rebuilt += SHY;
		}
		questionText =
			questionText.substring(0, offset) +
			rebuilt +
			questionText.substring(offset + wordText.length);
		dirty = true;
	}

	// --- Submit ---
	async function handleSubmit(/** @type {SubmitEvent|undefined} */ e) {
		e?.preventDefault?.();
		error = '';
		if (!deckId) {
			error = 'Please select a deck.';
			return;
		}
		if (!questionText.trim()) {
			error = 'Question text is required.';
			return;
		}
		if (options.some((o) => !o.trim())) {
			error = 'All 10 options must be filled in.';
			return;
		}
		if (imageUploading.some(Boolean)) {
			error = 'Wait for image uploads to finish.';
			return;
		}
		if (
			optionDisplayMode === 'image' &&
			media.some((m) => !m.option_image_url)
		) {
			error =
				'Upload an image for all 10 options or switch back to text options.';
			return;
		}

		if (type === 'rank') {
			const seen = [];
			for (let i = 0; i < NUM_BLOBS; i++) {
				const val = Number(correctAnswers[i]);
				if (correctAnswers[i] === '' || isNaN(val)) {
					error = `Rank for option ${i + 1} is required.`;
					return;
				}
				if (val < 1 || val > 10) {
					error = `Rank for option ${i + 1} must be between 1 and 10.`;
					return;
				}
				if (seen.includes(val)) {
					error = `Rank ${val} is used more than once.`;
					return;
				}
				seen.push(val);
			}
			for (let n = 1; n <= 10; n++) {
				if (!seen.includes(n)) {
					error = `Rank ${n} is missing.`;
					return;
				}
			}
		}

		const finalAnswers =
			type === 'colors'
				? correctAnswers.map((ca, i) => ({
						text: (typeof ca === 'object' ? ca?.text : ca) ?? '',
						backgroundColor: hslToCss(
							colorHsl[i].h,
							colorHsl[i].s,
							colorHsl[i].l,
						),
					}))
				: correctAnswers;

		const finalMedia = media.map((m, i) => ({
			...(m.url ? { url: m.url } : {}),
			...(m.spotify_url ? { spotify_url: m.spotify_url } : {}),
			...(m.youtube_url ? { youtube_url: m.youtube_url } : {}),
			...(optionDisplayMode === 'image' && m.option_image_url
				? {
						option_image_url: m.option_image_url,
						option_image_path: m.option_image_path,
						option_image_alt:
							m.option_image_alt || options[i] || '',
					}
				: {}),
		}));

		const payload = {
			deck_id: deckId,
			type,
			question_text: questionText.trim(),
			question_number:
				questionNumber !== '' ? Number(questionNumber) : null,
			options_json: options,
			correct_answers_json: finalAnswers,
			answer_media_json: finalMedia,
		};

		saving = true;
		try {
			const deckName = decks.find((d) => d.id === deckId)?.name ?? null;
			const target = questionNumber ? `Q #${questionNumber}` : 'question';
			if (isEdit && id) {
				const { error: err } = await supabase
					.from('questions')
					.update(payload)
					.eq('id', id);
				if (err) throw err;
				logActivity({
					verb: 'edited',
					entity_type: 'question',
					entity_id: id,
					summary: target,
					deck_name: deckName,
				});
			} else {
				const { data: newQ, error: err } = await supabase
					.from('questions')
					.insert(payload)
					.select('id')
					.single();
				if (err) throw err;
				logActivity({
					verb: 'created',
					entity_type: 'question',
					entity_id: newQ.id,
					summary: target,
					deck_name: deckName,
				});
			}
			dirty = false;
			goto('/admin/questions');
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save.';
			saving = false;
		}
	}

	function handleDiscard() {
		if (dirty) {
			confirmDiscardOpen = true;
		} else {
			goto('/admin/questions');
		}
	}

	function confirmDiscard() {
		confirmDiscardOpen = false;
		goto('/admin/questions');
	}

	function markDirty() {
		dirty = true;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor">
	<!-- ─── Header ───────────────────────────────────────────────── -->
	<header class="editor__header">
		<a class="editor__back" href="/admin/questions">
			<AdminIcon name="caret" size={12} />
			<span>Back</span>
		</a>
		<div class="editor__title-area">
			<span class="editor__breadcrumb mono">
				/admin/questions/{id ?? 'new'}
			</span>
			<span class="editor__title-text">
				{questionText || 'Untitled question'}
			</span>
		</div>
		<span class="editor__spacer"></span>
		{#if dirty}
			<span class="editor__dirty">
				<span class="editor__dirty-dot"></span>
				Unsaved
			</span>
		{/if}
		{#if error}
			<span class="editor__error">{error}</span>
		{/if}
		<button
			class="editor__btn editor__btn--ghost"
			type="button"
			onclick={handleDiscard}
			disabled={saving}
		>
			Discard
		</button>
		<button
			class="editor__btn editor__btn--primary"
			type="button"
			onclick={() => handleSubmit()}
			disabled={saving}
		>
			<AdminIcon name="bolt" size={13} />
			{saving ? 'Saving…' : 'Save'}
		</button>
	</header>

	{#if loading}
		<div class="editor__loading">Loading…</div>
	{:else}
		<!-- ─── Question fields ───────────────────────────────────── -->
		<section class="editor__fields">
			<div class="editor__fields-grid">
				<LabelledField label="Deck">
					<Select
						label=""
						value={deckId}
						onchange={(v) => {
							deckId = v ?? '';
							markDirty();
						}}
						options={decks.map((d) => ({
							value: d.id,
							label: d.name,
						}))}
					/>
				</LabelledField>
				<LabelledField label="Type" hint="Changes correct-answer shape">
					<Select
						label=""
						value={type}
						onchange={(v) => {
							if (v) type = v;
							markDirty();
						}}
						options={TYPE_OPTIONS}
					/>
				</LabelledField>
				<div class="editor__field-number">
					<LabelledField label="#" optional>
						<input
							class="editor__input"
							type="number"
							bind:value={questionNumber}
							oninput={markDirty}
							placeholder="—"
							disabled={saving}
						/>
					</LabelledField>
				</div>
				<LabelledField label="Display">
					<div class="editor__display-toggle">
						<button
							class="editor__display-btn"
							class:editor__display-btn--active={optionDisplayMode ===
								'text'}
							type="button"
							onclick={() => {
								optionDisplayMode = 'text';
								markDirty();
							}}
						>
							<AdminIcon name="question" size={12} />
							Text
						</button>
						<button
							class="editor__display-btn"
							class:editor__display-btn--active={optionDisplayMode ===
								'image'}
							type="button"
							onclick={() => {
								optionDisplayMode = 'image';
								markDirty();
							}}
						>
							<AdminIcon name="chip" size={12} />
							Image
						</button>
					</div>
				</LabelledField>
			</div>

			<LabelledField
				label="Question text"
				hint="{(questionText || '').length} chars"
			>
				<textarea
					class="editor__textarea"
					bind:value={questionText}
					oninput={markDirty}
					placeholder="Write the question here…"
					rows="2"
					disabled={saving}
				></textarea>
			</LabelledField>

			<SoftHyphenHelper
				words={longWords}
				disabled={saving}
				ontoggle={toggleShy}
			/>
		</section>

		<!-- ─── Master / Detail body ─────────────────────────────── -->
		<div class="editor__body">
			<OptionMasterList
				{options}
				{type}
				{correctAnswers}
				{colorHsl}
				{media}
				{optionDisplayMode}
				focusedIndex={focusedIdx}
				onfocus={(i) => {
					focusedIdx = i;
				}}
				onmove={moveOption}
			/>

			<!-- Detail panel -->
			<div class="editor__detail">
				<div class="editor__detail-head">
					<span class="editor__detail-label mono upper">Option</span>
					<span class="editor__detail-num mono">
						{focusedIdx + 1}<span class="faint">/10</span>
					</span>
					<span class="editor__spacer"></span>
					<button
						class="editor__detail-btn"
						type="button"
						disabled={focusedIdx === 0}
						onclick={() => moveOption(focusedIdx, focusedIdx - 1)}
						title="Move up"
					>
						<svg
							width="8"
							height="6"
							viewBox="0 0 8 6"
							fill="currentColor"><path d="M4 0l4 6H0z" /></svg
						>
					</button>
					<button
						class="editor__detail-btn"
						type="button"
						disabled={focusedIdx === 9}
						onclick={() => moveOption(focusedIdx, focusedIdx + 1)}
						title="Move down"
					>
						<svg
							width="8"
							height="6"
							viewBox="0 0 8 6"
							fill="currentColor"
							style="transform: rotate(180deg)"
							><path d="M4 0l4 6H0z" /></svg
						>
					</button>
					<div class="editor__detail-sep"></div>
					<button
						class="editor__detail-btn editor__detail-btn--nav"
						type="button"
						disabled={focusedIdx === 0}
						onclick={() => {
							focusedIdx = Math.max(0, focusedIdx - 1);
						}}
					>
						<span
							style="transform: rotate(180deg); display: inline-flex"
							><AdminIcon name="caret" size={11} /></span
						>
						Prev
					</button>
					<button
						class="editor__detail-btn editor__detail-btn--nav"
						type="button"
						disabled={focusedIdx === 9}
						onclick={() => {
							focusedIdx = Math.min(9, focusedIdx + 1);
						}}
					>
						Next
						<AdminIcon name="caret" size={11} />
					</button>
				</div>

				<div class="editor__detail-body">
					<div
						class="editor__detail-grid"
						class:editor__detail-grid--with-image={optionDisplayMode ===
							'image'}
					>
						{#if optionDisplayMode === 'image'}
							<div class="editor__detail-image">
								<LabelledField
									label="Image"
									hint="JPEG/PNG/WebP · max 5MB"
								>
									<ImageSlot
										src={focusedMedia?.option_image_url ??
											''}
										uploading={imageUploading[focusedIdx]}
										onupload={(e) =>
											handleOptionImageFile(
												focusedIdx,
												e,
											)}
										onclear={() =>
											clearOptionImage(focusedIdx)}
									/>
								</LabelledField>
							</div>
						{/if}

						<div class="editor__detail-fields">
							<LabelledField
								label="Option label"
								hint="Shown on the card"
							>
								<input
									class="editor__input"
									type="text"
									bind:value={options[focusedIdx]}
									oninput={markDirty}
									placeholder="Option {focusedIdx + 1}"
									disabled={saving}
								/>
							</LabelledField>

							<CorrectAnswerEditor
								{type}
								value={correctAnswers[focusedIdx]}
								hsl={colorHsl[focusedIdx]}
								allAnswers={correctAnswers}
								focusedIndex={focusedIdx}
								disabled={saving}
								onchange={(v) => {
									correctAnswers[focusedIdx] = v;
									markDirty();
								}}
								onhslchange={(v) => {
									colorHsl[focusedIdx] = v;
								}}
							/>

							{#if type === 'standard'}
								<LabelledField
									label="Links"
									hint="Shown after answer reveals"
									optional
								>
									<UrlsBlock
										urls={{
											url: media[focusedIdx]?.url ?? '',
											spotify_url:
												media[focusedIdx]
													?.spotify_url ?? '',
											youtube_url:
												media[focusedIdx]
													?.youtube_url ?? '',
										}}
										onchange={(v) => {
											media[focusedIdx] = {
												...media[focusedIdx],
												...v,
											};
											markDirty();
										}}
										disabled={saving}
									/>
								</LabelledField>
							{:else}
								<LabelledField
									label="Link"
									hint="Shown after answer reveals"
									optional
								>
									<input
										class="editor__input"
										type="url"
										bind:value={media[focusedIdx].url}
										oninput={markDirty}
										placeholder="https://…"
										disabled={saving}
									/>
								</LabelledField>
							{/if}

							{#if optionDisplayMode === 'text'}
								<details class="editor__optional-image">
									<summary
										>Optional image for this option</summary
									>
									<div class="editor__optional-image-body">
										<ImageSlot
											src={focusedMedia?.option_image_url ??
												''}
											uploading={imageUploading[
												focusedIdx
											]}
											onupload={(e) =>
												handleOptionImageFile(
													focusedIdx,
													e,
												)}
											onclear={() =>
												clearOptionImage(focusedIdx)}
										/>
									</div>
								</details>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<Dialog
	open={confirmDiscardOpen}
	onclose={() => {
		confirmDiscardOpen = false;
	}}
	onconfirm={confirmDiscard}
	title="Discard your changes?"
	description="Anything you've edited since opening this question will be lost. The saved version is unaffected."
	danger
	confirmLabel="Discard"
/>

<style>
	/* ─── Editor shell ──────────────────────────────────────────── */

	.editor {
		display: flex;
		height: calc(100vh - var(--h-topbar));
		margin: -24px;

		flex-direction: column;
	}

	.editor__loading {
		display: grid;
		height: 200px;

		font-size: 13px;

		color: var(--fg-mute);

		place-items: center;
	}

	.editor__spacer {
		flex: 1;
	}

	/* ─── Header ────────────────────────────────────────────────── */

	.editor__header {
		display: flex;
		min-height: 60px;
		padding: 14px 22px;
		align-items: center;

		background: lch(4.4% 1.7 290 / 0.65);
		border-bottom: 1px solid var(--border);
		backdrop-filter: blur(8px);

		flex: 0 0 auto;
		gap: 14px;
	}

	.editor__back {
		display: inline-flex;
		height: 30px;
		padding: 0 10px;
		align-items: center;

		font-size: 12.5px;
		text-decoration: none;

		color: var(--fg-mute);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			color 80ms ease;

		gap: 6px;
	}

	.editor__back :global(svg) {
		transform: rotate(180deg);
	}

	.editor__back:hover {
		color: var(--fg);
		background: var(--surface-2);
	}

	.editor__title-area {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 2px;
	}

	.editor__breadcrumb {
		font-size: 11.5px;

		color: var(--fg-faint);
	}

	.editor__title-text {
		overflow: hidden;
		max-width: 600px;

		font-size: 15px;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.editor__dirty {
		display: inline-flex;
		align-items: center;

		font-size: 12px;

		color: var(--accent-2);

		gap: 6px;
	}

	.editor__dirty-dot {
		width: 6px;
		height: 6px;

		background: var(--accent-2);
		border-radius: 50%;
	}

	.editor__error {
		max-width: 300px;
		padding: 4px 10px;

		font-size: 12px;

		color: var(--danger);
		background: var(--danger-soft);
		border-radius: var(--r-1);
	}

	.editor__btn {
		display: inline-flex;
		height: var(--h-button);
		padding: 0 14px;
		align-items: center;

		font-size: 13px;
		font-weight: 500;

		border-radius: var(--r-2);
		cursor: pointer;

		transition:
			background 80ms ease,
			border-color 80ms ease;

		gap: 6px;
	}

	.editor__btn--ghost {
		color: var(--fg-mute);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.editor__btn--ghost:hover {
		color: var(--fg);
		background: var(--surface-2);
	}

	.editor__btn--primary {
		color: var(--accent-fg);
		background: var(--accent);
		border: 1px solid transparent;
	}

	.editor__btn--primary:hover {
		background: var(--accent-hover);
	}

	.editor__btn:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.editor__btn--fill {
		flex: 1;

		justify-content: center;
	}

	/* ─── Question fields ───────────────────────────────────────── */

	.editor__fields {
		display: flex;
		padding: 18px 22px;

		background: var(--bg);
		border-bottom: 1px solid var(--border);

		flex: 0 0 auto;
		flex-direction: column;
		gap: 12px;
	}

	.editor__fields-grid {
		display: grid;

		grid-template-columns: 1fr 1fr 120px 160px;
		gap: 10px;
	}

	.editor__field-number {
		max-width: 120px;
	}

	.editor__input {
		width: 100%;
		height: var(--h-button);
		padding: 0 12px;

		font-size: 13.5px;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;
	}

	.editor__input:focus {
		border-color: var(--border-strong);
	}

	.editor__input::placeholder {
		color: var(--fg-faint);
	}

	.editor__input:disabled {
		opacity: 0.5;
	}

	.editor__textarea {
		width: 100%;
		min-height: 56px;
		padding: 10px 12px;

		font-family: var(--font-sans);
		font-size: 14px;
		line-height: 1.5;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;

		resize: vertical;
	}

	.editor__textarea:focus {
		border-color: var(--border-strong);
	}

	.editor__textarea::placeholder {
		color: var(--fg-faint);
	}

	.editor__display-toggle {
		display: inline-flex;
		height: var(--h-button);
		padding: 3px;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);
	}

	.editor__display-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		font-size: 12.5px;
		font-weight: 500;

		color: var(--fg-mute);
		border-radius: var(--r-1);

		transition:
			background 80ms ease,
			color 80ms ease;

		flex: 1;
		gap: 6px;
	}

	.editor__display-btn--active {
		color: var(--fg);
		background: var(--surface-2);
	}

	/* ─── Body: master + detail ──────────────────────────────────── */

	.editor__body {
		display: flex;
		min-height: 0;
		align-items: stretch;

		flex: 1;
	}

	/* ─── Detail panel ──────────────────────────────────────────── */

	.editor__detail {
		display: flex;
		min-width: 0;

		flex: 1;
		flex-direction: column;
	}

	.editor__detail-head {
		display: flex;
		padding: 14px 22px;
		align-items: center;

		border-bottom: 1px solid var(--border);

		gap: 10px;
	}

	.editor__detail-label {
		font-size: 12px;
		letter-spacing: 0.04em;

		color: var(--fg-faint);
	}

	.editor__detail-num {
		font-size: 22px;
		font-weight: 500;
		letter-spacing: -0.02em;

		color: var(--fg);
	}

	.editor__detail-num .faint {
		font-size: 16px;
	}

	.editor__detail-btn {
		display: grid;
		width: 28px;
		height: 28px;

		color: var(--fg-faint);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.editor__detail-btn:hover:not(:disabled) {
		color: var(--fg);
		background: var(--surface-2);
	}

	.editor__detail-btn:disabled {
		cursor: default;
		opacity: 0.4;
	}

	.editor__detail-btn--nav {
		display: inline-flex;
		width: auto;
		padding: 0 10px;
		align-items: center;

		font-size: 12px;

		gap: 4px;
	}

	.editor__detail-sep {
		width: 1px;
		height: 20px;
		margin: 0 4px;

		background: var(--border);
	}

	.editor__detail-body {
		overflow-y: auto;
		padding: 20px 22px;

		flex: 1;
	}

	.editor__detail-grid {
		display: grid;

		grid-template-columns: 1fr;
		gap: 20px;
	}

	.editor__detail-grid--with-image {
		grid-template-columns: 180px 1fr;
	}

	.editor__detail-fields {
		display: flex;

		flex-direction: column;
		gap: 16px;
	}

	/* ─── Optional image details ────────────────────────────────── */

	.editor__optional-image {
		padding: 10px 12px;

		border: 1px solid var(--border);
		border-radius: var(--r-2);
	}

	.editor__optional-image summary {
		font-size: 12.5px;

		color: var(--fg-mute);
		cursor: pointer;

		list-style: none;
	}

	.editor__optional-image-body {
		margin-top: 10px;
	}

	/* ─── Responsive ────────────────────────────────────────────── */

	@media (max-width: 768px) {
		.editor__header {
			position: sticky;
			top: -24px;
			z-index: 10;
			height: var(--h-mobile-header);
			min-height: var(--h-mobile-header);
			padding: 0 12px;

			gap: 10px;
		}

		.editor__breadcrumb {
			font-size: 11px;
			white-space: nowrap;
			overflow: clip;
			text-overflow: ellipsis;
		}

		.editor__title-text {
			max-width: none;

			font-size: 13.5px;
		}

		.editor__dirty {
			width: 8px;
			height: 8px;
			overflow: hidden;

			font-size: 0;

			background: var(--accent-2);
			border-radius: 50%;
		}

		.editor__dirty-dot {
			display: none;
		}

		.editor__error {
			display: none;
		}

		.editor__btn--ghost {
			display: none;
		}

		.editor__btn--primary {
			height: 32px;
			padding: 0 12px;

			font-size: 12px;
		}

		.editor__fields {
			padding: 14px 16px;
		}

		.editor__fields-grid {
			grid-template-columns: 1fr;
		}

		.editor__field-number {
			max-width: none;
		}

		.editor__body {
			flex-direction: column;
		}

		.editor__detail-head {
			padding: 12px 16px;

			gap: 8px;
		}

		.editor__detail-body {
			padding: 16px;
		}

		.editor__detail-grid--with-image {
			grid-template-columns: 1fr;
		}

		.editor__detail-btn--nav {
			display: none;
		}

		.editor__detail-sep {
			display: none;
		}
	}
</style>
