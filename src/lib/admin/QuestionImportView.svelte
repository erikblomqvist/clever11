<script>
	import { supabase } from '$lib/supabase.js';
	import { QUESTION_TYPES } from '$lib/data/questionTypes.js';
	import { logActivity } from './activityLog.js';
	import {
		createEmptyImportDraft,
		normalizeAnswers,
		normalizeImportDraft,
		toQuestionInsertPayload,
		validateImportDraft,
	} from '$lib/admin/questionImport.js';
	import { base } from '$app/paths';
	import {
		Camera,
		ImagePlus,
		ChevronRight,
		Check,
		AlertTriangle,
		Trash2,
		RotateCcw,
	} from 'lucide-svelte';
	import TypeBadge from './components/TypeBadge.svelte';
	import StatusPill from './components/StatusPill.svelte';
	import ConfidencePills from './components/ConfidencePills.svelte';
	import Select from './components/Select.svelte';
	import Toast from './components/Toast.svelte';
	import EmptyState from './components/EmptyState.svelte';
	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let deckId = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let batchSaving = $state(false);
	let batchTotal = $state(0);
	let batchDone = $state(0);
	let error = $state('');
	let items = $state(/** @type {ImportItem[]} */ ([]));
	/** @type {Toast|null} */
	let toastRef = $state(null);

	const typeOptions = Object.entries(QUESTION_TYPES);
	const OPTION_IMAGE_BUCKET = 'question-option-images';

	/**
	 * @typedef {{
	 *   id: string,
	 *   fileName: string,
	 *   file: File,
	 *   previewUrl: string,
	 *   status: 'queued'|'extracting'|'ready'|'error'|'saved',
	 *   draft: ReturnType<typeof normalizeImportDraft>,
	 *   optionImages: { dataUrl: string, width: number, height: number, warnings: string[] }[],
	 *   useOptionImages: boolean,
	 *   errors: string[],
	 *   extractionError: string,
	 *   collapsed: boolean
	 * }} ImportItem
	 */

	$effect(() => {
		loadDecks();
		return () => {
			items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
		};
	});

	async function loadDecks() {
		const { data, error: err } = await supabase
			.from('decks')
			.select('id, name')
			.order('name');
		if (err) error = err.message;
		decks = data ?? [];
		loading = false;
	}

	/** @param {Event} event */
	async function handleFiles(event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const files = Array.from(input.files ?? []).filter((file) =>
			file.type.startsWith('image/'),
		);
		input.value = '';
		if (files.length === 0) return;

		const newItems = files.map((file, index) => ({
			id: `${Date.now()}-${index}-${file.name}`,
			fileName: file.name,
			file,
			previewUrl: URL.createObjectURL(file),
			status: /** @type {ImportItem['status']} */ ('queued'),
			draft: createEmptyImportDraft(),
			optionImages: [],
			useOptionImages: false,
			errors: [],
			extractionError: '',
			collapsed: false,
		}));

		items = [...newItems, ...items];
		await Promise.all(
			newItems.map((item, index) => extractFile(item.id, files[index])),
		);
	}

	/** @param {string} id */
	async function retryExtraction(id) {
		const item = items.find((candidate) => candidate.id === id);
		if (!item) return;
		await extractFile(item.id, item.file);
	}

	/**
	 * @param {string} id
	 * @param {File} file
	 */
	async function extractFile(id, file) {
		updateItem(id, (item) => ({
			...item,
			status: 'extracting',
			extractionError: '',
		}));
		try {
			const image = await imageToUploadDataUrl(file);
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const headers = new Headers({ 'Content-Type': 'application/json' });
			if (user?.id) {
				const { data: sessionData } = await supabase.auth.getSession();
				if (sessionData.session?.access_token) {
					headers.set(
						'Authorization',
						`Bearer ${sessionData.session.access_token}`,
					);
				}
			}
			const response = await fetch(`${base}/api/extract-card`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ image, deckId, fileName: file.name }),
			});
			const data = await response.json();
			if (!response.ok)
				throw new Error(data?.error ?? 'Extraction failed.');

			const draft = normalizeImportDraft(data);
			const optionImages = normalizeOptionImages(data?.option_images);
			const useOptionImages = false;
			updateItem(id, (item) => ({
				...item,
				status: 'ready',
				draft,
				optionImages,
				useOptionImages,
				errors: [
					...validateImportDraft(draft),
					...validateImportItem(draft, optionImages, useOptionImages),
				],
				extractionError: '',
			}));
		} catch (/** @type {any} */ err) {
			updateItem(id, (item) => ({
				...item,
				status: 'error',
				extractionError: err.message ?? 'Extraction failed.',
			}));
		}
	}

	/**
	 * @param {string} id
	 * @param {(item: ImportItem) => ImportItem} updater
	 */
	function updateItem(id, updater) {
		items = items.map((item) => (item.id === id ? updater(item) : item));
	}

	/**
	 * @param {string} id
	 * @param {(draft: ReturnType<typeof normalizeImportDraft>) => void} updater
	 */
	function updateDraft(id, updater) {
		updateItem(id, (item) => {
			const draft = structuredClone(item.draft);
			updater(draft);
			const normalized = normalizeImportDraft(draft);
			return {
				...item,
				draft: normalized,
				errors: [
					...validateImportDraft(normalized),
					...validateImportItem(
						normalized,
						item.optionImages,
						item.useOptionImages,
					),
				],
			};
		});
	}

	/**
	 * @param {string} id
	 * @param {import('$lib/data/questionTypes.js').QuestionType} type
	 */
	function changeType(id, type) {
		updateDraft(id, (draft) => {
			draft.type = type;
			draft.correct_answers_json = normalizeAnswers(
				type,
				draft.correct_answers_json,
			);
		});
	}

	/**
	 * @param {string} id
	 * @param {number} index
	 * @param {unknown} value
	 */
	function setAnswer(id, index, value) {
		updateDraft(id, (draft) => {
			draft.correct_answers_json[index] = value;
		});
	}

	/**
	 * @param {string} id
	 * @param {number} index
	 * @param {string} key
	 * @param {string} value
	 */
	function setColorAnswer(id, index, key, value) {
		updateDraft(id, (draft) => {
			const current = draft.correct_answers_json[index];
			draft.correct_answers_json[index] = {
				text:
					typeof current === 'object' && current
						? (current.text ?? '')
						: '',
				backgroundColor:
					typeof current === 'object' && current
						? (current.backgroundColor ?? 'hsl(0 80% 50%)')
						: 'hsl(0 80% 50%)',
				[key]: value,
			};
		});
	}

	/**
	 * @param {string} id
	 * @param {boolean} useOptionImages
	 */
	function setUseOptionImages(id, useOptionImages) {
		updateItem(id, (item) => ({
			...item,
			useOptionImages,
			errors: [
				...validateImportDraft(item.draft),
				...validateImportItem(
					item.draft,
					item.optionImages,
					useOptionImages,
				),
			],
		}));
	}

	/**
	 * @param {string} id
	 * @param {number} index
	 * @param {Event} event
	 */
	async function replaceImportedOptionImage(id, index, event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		try {
			const dataUrl = await resizeOptionCropImage(file);
			updateItem(id, (item) => {
				const optionImages = item.optionImages.map(
					(image, imageIndex) =>
						imageIndex === index
							? { dataUrl, width: 0, height: 0, warnings: [] }
							: image,
				);
				return {
					...item,
					optionImages,
					useOptionImages: true,
					errors: [
						...validateImportDraft(item.draft),
						...validateImportItem(item.draft, optionImages, true),
					],
				};
			});
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Could not replace option image.';
		}
	}

	/** @param {string} id */
	function removeItem(id) {
		const item = items.find((candidate) => candidate.id === id);
		if (item) URL.revokeObjectURL(item.previewUrl);
		items = items.filter((candidate) => candidate.id !== id);
	}

	/** @param {string} id */
	function toggleCollapsed(id) {
		const item = items.find((i) => i.id === id);
		if (!item || (item.status !== 'ready' && item.status !== 'saved'))
			return;
		updateItem(id, (i) => ({ ...i, collapsed: !i.collapsed }));
	}

	function clearSaved() {
		items
			.filter((item) => item.status === 'saved')
			.forEach((item) => URL.revokeObjectURL(item.previewUrl));
		items = items.filter((item) => item.status !== 'saved');
	}

	/** @param {ImportItem} item */
	async function saveItem(item) {
		error = '';
		if (!deckId) {
			error = 'Please choose a deck before saving imported questions.';
			return;
		}
		const errors = validateImportDraft(item.draft);
		const itemErrors = validateImportItem(
			item.draft,
			item.optionImages,
			item.useOptionImages,
		);
		if (errors.length > 0 || itemErrors.length > 0) {
			updateItem(item.id, (current) => ({
				...current,
				errors: [...errors, ...itemErrors],
			}));
			return;
		}

		saving = true;
		try {
			const payload = toQuestionInsertPayload(item.draft, deckId);
			if (item.useOptionImages) {
				payload.answer_media_json =
					await uploadImportedOptionImages(item);
			}
			const { error: err } = await supabase
				.from('questions')
				.insert(payload);
			if (err) throw err;
			updateItem(item.id, (current) => ({
				...current,
				status: 'saved',
				errors: [],
				collapsed: true,
			}));
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save imported question.';
		} finally {
			saving = false;
		}
	}

	/**
	 * @param {ReturnType<typeof normalizeImportDraft>} draft
	 * @param {{ dataUrl: string }[]} optionImages
	 * @param {boolean} useOptionImages
	 */
	function validateImportItem(draft, optionImages, useOptionImages) {
		if (!useOptionImages) return [];
		if (
			optionImages.length !== 10 ||
			optionImages.some((image) => !image.dataUrl)
		) {
			return [
				'All 10 option image crops are required, or turn off image options for this import.',
			];
		}
		if (draft.options_json.some((option) => !String(option).trim())) {
			return ['Image options still need text labels for accessibility.'];
		}
		return [];
	}

	/** @param {ImportItem} item */
	async function uploadImportedOptionImages(item) {
		if (!supabase) throw new Error('Supabase is not configured.');
		const groupId = crypto.randomUUID();
		return Promise.all(
			item.optionImages.map(async (image, index) => {
				const response = await fetch(image.dataUrl);
				const blob = await response.blob();
				const path = `imports/${groupId}/options/${index + 1}.webp`;
				const { error: uploadError } = await supabase.storage
					.from(OPTION_IMAGE_BUCKET)
					.upload(path, blob, {
						cacheControl: '31536000',
						contentType: 'image/webp',
						upsert: true,
					});
				if (uploadError) throw uploadError;
				const { data } = supabase.storage
					.from(OPTION_IMAGE_BUCKET)
					.getPublicUrl(path);
				return {
					option_image_url: data.publicUrl,
					option_image_path: path,
					option_image_alt: item.draft.options_json[index] ?? '',
				};
			}),
		);
	}

	async function saveAndLogItem(/** @type {ImportItem} */ item) {
		const wasSaved = item.status === 'saved';
		await saveItem(item);
		const updated = items.find((i) => i.id === item.id);
		if (!wasSaved && updated?.status === 'saved') {
			logActivity({
				verb: 'imported',
				entity_type: 'question',
				entity_id: null,
				summary: '1 question',
				deck_name: decks.find((d) => d.id === deckId)?.name ?? null,
			});
			toastRef?.show('Saved card.');
		}
	}

	async function saveAllReady() {
		const readyItems = items.filter(
			(i) => i.status === 'ready' && i.errors.length === 0,
		);
		if (readyItems.length === 0) return;

		batchSaving = true;
		batchTotal = readyItems.length;
		batchDone = 0;

		const beforeCount = items.filter((i) => i.status === 'saved').length;
		for (const item of readyItems) {
			await saveItem(item);
			batchDone++;
		}

		batchSaving = false;
		batchTotal = 0;
		batchDone = 0;

		const savedInBatch =
			items.filter((i) => i.status === 'saved').length - beforeCount;
		if (savedInBatch > 0) {
			logActivity({
				verb: 'imported',
				entity_type: 'question',
				entity_id: null,
				summary: `${savedInBatch} question${savedInBatch !== 1 ? 's' : ''}`,
				deck_name: decks.find((d) => d.id === deckId)?.name ?? null,
			});
			toastRef?.show(
				`Saved ${savedInBatch} card${savedInBatch !== 1 ? 's' : ''}.`,
			);
		}
	}

	/** @param {File} file */
	async function imageToUploadDataUrl(file) {
		try {
			return await resizeImage(file);
		} catch {
			return fileToDataUrl(file);
		}
	}

	/** @param {File} file */
	function resizeImage(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				const maxSize = 1600;
				const scale = Math.min(
					1,
					maxSize / Math.max(image.width, image.height),
				);
				const canvas = document.createElement('canvas');
				canvas.width = Math.max(1, Math.round(image.width * scale));
				canvas.height = Math.max(1, Math.round(image.height * scale));
				const context = canvas.getContext('2d');
				if (!context) {
					URL.revokeObjectURL(url);
					reject(new Error('Could not prepare image for upload.'));
					return;
				}
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				URL.revokeObjectURL(url);
				resolve(canvas.toDataURL('image/jpeg', 0.85));
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Could not read image.'));
			};
			image.src = url;
		});
	}

	/** @param {File} file */
	function resizeOptionCropImage(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				const maxSize = 512;
				const scale = Math.min(
					1,
					maxSize / Math.max(image.width, image.height),
				);
				const canvas = document.createElement('canvas');
				canvas.width = Math.max(1, Math.round(image.width * scale));
				canvas.height = Math.max(1, Math.round(image.height * scale));
				const context = canvas.getContext('2d');
				if (!context) {
					URL.revokeObjectURL(url);
					reject(new Error('Could not prepare replacement crop.'));
					return;
				}
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(
					(blob) => {
						URL.revokeObjectURL(url);
						if (!blob) {
							reject(
								new Error(
									'Could not compress replacement crop.',
								),
							);
							return;
						}
						const reader = new FileReader();
						reader.onload = () => resolve(String(reader.result));
						reader.onerror = () => reject(reader.error);
						reader.readAsDataURL(blob);
					},
					'image/webp',
					0.78,
				);
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Could not read replacement image.'));
			};
			image.src = url;
		});
	}

	/** @param {File} file */
	function fileToDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
	}

	/** @param {unknown} value */
	function normalizeOptionImages(value) {
		const array = Array.isArray(value) ? value : [];
		return Array.from({ length: 10 }, (_, index) => {
			const image =
				array[index] && typeof array[index] === 'object'
					? /** @type {Record<string, any>} */ (array[index])
					: {};
			return {
				dataUrl: typeof image.dataUrl === 'string' ? image.dataUrl : '',
				width: Number(image.width) || 0,
				height: Number(image.height) || 0,
				warnings: Array.isArray(image.warnings)
					? image.warnings.map(String).filter(Boolean)
					: [],
			};
		});
	}

	const readyToSaveCount = $derived(
		items.filter(
			(item) => item.status === 'ready' && item.errors.length === 0,
		).length,
	);
	const savedCount = $derived(
		items.filter((item) => item.status === 'saved').length,
	);
	const counts = $derived({
		queued: items.filter((i) => i.status === 'queued').length,
		extracting: items.filter((i) => i.status === 'extracting').length,
		ready: items.filter((i) => i.status === 'ready').length,
		error: items.filter((i) => i.status === 'error').length,
		saved: items.filter((i) => i.status === 'saved').length,
	});
	const errorCount = $derived(
		items.filter((i) => i.status === 'error' || i.errors.length > 0).length,
	);
</script>

<div class="qi">
	{#if loading}
		<div class="qi__status">Loading…</div>
	{:else}
		<!-- Page header -->
		<div class="qi__header">
			<div>
				<h1 class="qi__title">Import from photos</h1>
				<p class="qi__subtitle">
					Snap one photo per physical card. We extract a draft
					question; you review, fix, save.
				</p>
			</div>
			<div class="qi__counts">
				<span class="qi__blip">
					<span class="qi__blip-led" style:background="var(--ok)"
					></span>
					<span class="qi__blip-num mono">{counts.saved}</span>
					Saved
				</span>
				<span class="qi__blip">
					<span
						class="qi__blip-led"
						style:background="var(--accent-2)"
					></span>
					<span class="qi__blip-num mono">{counts.ready}</span>
					Ready
				</span>
				<span class="qi__blip">
					<span class="qi__blip-led" style:background="var(--info)"
					></span>
					<span class="qi__blip-num mono">{counts.extracting}</span>
					Extracting
				</span>
				<span class="qi__blip">
					<span
						class="qi__blip-led"
						style:background="var(--fg-faint)"
					></span>
					<span class="qi__blip-num mono">{counts.queued}</span>
					Queued
				</span>
				{#if counts.error > 0}
					<span class="qi__blip">
						<span
							class="qi__blip-led"
							style:background="var(--danger)"
						></span>
						<span class="qi__blip-num mono">{counts.error}</span>
						Error
					</span>
				{/if}
			</div>
		</div>

		{#if error}
			<div class="qi__error">{error}</div>
		{/if}

		<!-- Sticky toolbar -->
		<div class="qi__toolbar">
			<Select
				label="Deck"
				value={deckId || null}
				options={decks.map((d) => ({ value: d.id, label: d.name }))}
				onchange={(v) => (deckId = v ?? '')}
			/>

			<div class="qi__toolbar-btns">
				<label class="qi__btn">
					<Camera size={13} />
					Take photo
					<input
						type="file"
						accept="image/*"
						capture="environment"
						multiple
						onchange={handleFiles}
						class="qi__file-input"
					/>
				</label>
				<label class="qi__btn qi__btn--ghost">
					<ImagePlus size={13} />
					Add photos
					<input
						type="file"
						accept="image/*"
						multiple
						onchange={handleFiles}
						class="qi__file-input"
					/>
				</label>
			</div>

			<span class="qi__toolbar-spacer"></span>

			{#if errorCount > 0}
				<span class="qi__toolbar-errors">
					{errorCount} need attention
				</span>
			{/if}

			<button
				class="qi__btn qi__btn--primary"
				type="button"
				onclick={saveAllReady}
				disabled={!deckId ||
					readyToSaveCount === 0 ||
					saving ||
					batchSaving}
			>
				{#if batchSaving}
					Saving {batchTotal - batchDone}…
				{:else}
					Save all ready ({readyToSaveCount})
				{/if}
			</button>

			{#if savedCount > 0}
				<button
					class="qi__btn qi__btn--ghost qi__btn--sm"
					type="button"
					onclick={clearSaved}
					disabled={saving}
				>
					Clear saved
				</button>
			{/if}
		</div>

		<!-- Batch progress strip -->
		{#if batchSaving}
			<div class="qi__progress">
				<span class="qi__progress-spinner"></span>
				<span>Saving {batchTotal - batchDone} cards…</span>
				<div class="qi__progress-track">
					<div
						class="qi__progress-fill"
						style:width="{batchTotal > 0
							? (batchDone / batchTotal) * 100
							: 0}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Card list -->
		{#if items.length === 0}
			<EmptyState title="No card photos selected yet.">
				{#snippet icon()}
					<ImagePlus size={18} />
				{/snippet}
			</EmptyState>
		{:else}
			<div class="qi__list">
				{#each items as item (item.id)}
					{@const isReady = item.status === 'ready'}
					{@const isSaved = item.status === 'saved'}
					{@const isError = item.status === 'error'}
					{@const isExpandable = isReady || isSaved}
					{@const isExpanded = isExpandable && !item.collapsed}
					<article
						class="card qi__card"
						class:qi__card--saved={isSaved}
						class:qi__card--error={isError}
						class:qi__card--extracting={item.status ===
							'extracting'}
					>
						<!-- Card header -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="qi__card-header"
							class:qi__card-header--clickable={isExpandable}
							onclick={() =>
								isExpandable && toggleCollapsed(item.id)}
						>
							<div class="qi__thumb">
								<img
									src={item.previewUrl}
									alt={`Preview of ${item.fileName}`}
								/>
								{#if item.status === 'extracting'}
									<div class="qi__thumb-overlay">
										<span class="qi__thumb-spinner"></span>
									</div>
								{/if}
								{#if isSaved}
									<div class="qi__thumb-check">
										<Check size={10} />
									</div>
								{/if}
							</div>

							<div class="qi__card-info">
								<div class="qi__card-meta">
									<StatusPill status={item.status} />
									{#if item.draft.type}
										<TypeBadge type={item.draft.type} />
									{/if}
									<span class="qi__card-id mono">
										{item.fileName}
									</span>
									{#if isReady && !item.collapsed}
										<span class="qi__card-caret">
											<ChevronRight size={11} />
										</span>
									{:else if isExpandable}
										<span
											class="qi__card-caret qi__card-caret--collapsed"
										>
											<ChevronRight size={11} />
										</span>
									{/if}
								</div>

								<div class="qi__card-text">
									{#if item.status === 'extracting'}
										Extracting question…
									{:else if item.status === 'queued'}
										Queued for extraction
									{:else if isError && !item.draft.question_text}
										Extraction failed
									{:else}
										{item.draft.question_text || 'Untitled'}
									{/if}
								</div>

								{#if !isSaved && item.status !== 'extracting' && item.status !== 'queued'}
									<div class="qi__card-deck-line">
										{#if deckId}
											<span
												>{decks.find(
													(d) => d.id === deckId,
												)?.name ?? 'No deck'}</span
											>
										{:else}
											<span class="qi__card-no-deck"
												>No deck assigned</span
											>
										{/if}
										{#if isReady}
											<span class="qi__card-dot"></span>
											<ConfidencePills
												confidence={item.draft
													.confidence}
											/>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Right rail actions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="qi__card-actions"
								onclick={(e) => e.stopPropagation()}
							>
								{#if isError}
									<button
										class="qi__btn qi__btn--ghost qi__btn--sm"
										onclick={() => retryExtraction(item.id)}
									>
										<RotateCcw size={11} />
										Retry
									</button>
									<button
										class="qi__btn qi__btn--ghost qi__btn--sm qi__btn--danger-text"
										onclick={() => removeItem(item.id)}
									>
										Discard
									</button>
								{/if}
							</div>
						</div>

						<!-- Card body (expanded) -->
						{#if isExpanded}
							<div class="qi__card-body">
								<!-- Error banner -->
								{#if item.errors.length > 0}
									<div class="qi__banner qi__banner--error">
										{#each item.errors as err, i (i)}
											<div class="qi__banner-row">
												<span
													class="qi__banner-icon qi__banner-icon--error"
													>!</span
												>
												<span>{err}</span>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Extraction error -->
								{#if item.extractionError}
									<div class="qi__banner qi__banner--error">
										<div class="qi__banner-row">
											<span
												class="qi__banner-icon qi__banner-icon--error"
												>!</span
											>
											<span>{item.extractionError}</span>
										</div>
									</div>
								{/if}

								<!-- Warning banner -->
								{#if item.draft.warnings.length > 0}
									<div class="qi__banner qi__banner--warn">
										{#each item.draft.warnings as warning, i (i)}
											<div class="qi__banner-row">
												<AlertTriangle size={10} />
												<span>{warning}</span>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Question fields -->
								<div class="qi__fields">
									<div class="qi__fields-grid">
										<div class="qi__input-wrap">
											<input
												class="qi__input"
												type="text"
												value={item.draft.question_text}
												placeholder="Question text"
												oninput={(event) =>
													updateDraft(
														item.id,
														(draft) => {
															draft.question_text =
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value;
														},
													)}
												disabled={isSaved || saving}
											/>
										</div>
										<Select
											label="Type"
											value={item.draft.type}
											options={typeOptions.map(
												([key, config]) => ({
													value: key,
													label: config.label,
												}),
											)}
											onchange={(v) =>
												v &&
												changeType(
													item.id,
													/** @type {import('$lib/data/questionTypes.js').QuestionType} */ (
														v
													),
												)}
										/>
										<div
											class="qi__input-wrap qi__input-wrap--num"
										>
											<input
												class="qi__input"
												type="number"
												value={item.draft
													.question_number ?? ''}
												placeholder="#"
												oninput={(event) =>
													updateDraft(
														item.id,
														(draft) => {
															draft.question_number =
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value
																	? Number(
																			/** @type {HTMLInputElement} */ (
																				event.currentTarget
																			)
																				.value,
																		)
																	: null;
														},
													)}
												disabled={isSaved || saving}
											/>
										</div>
									</div>

									{#if item.optionImages.length > 0}
										<label class="qi__image-toggle">
											<input
												type="checkbox"
												checked={item.useOptionImages}
												onchange={(event) =>
													setUseOptionImages(
														item.id,
														/** @type {HTMLInputElement} */ (
															event.currentTarget
														).checked,
													)}
												disabled={isSaved || saving}
											/>
											<span>
												{item.useOptionImages
													? 'Using image options'
													: 'Use text options'}
											</span>
										</label>
									{/if}
								</div>

								<!-- Options list -->
								<div class="qi__options">
									<div class="qi__options-head">
										<span class="qi__options-label upper">
											Options
										</span>
										<span class="qi__options-count mono">
											{item.draft.options_json.filter(
												(o) => o.trim(),
											).length} / {item.draft.options_json
												.length}
										</span>
									</div>

									{#each item.draft.options_json as option, i (i)}
										<div class="qi__option-row">
											<span class="qi__option-num mono">
												{i + 1}
											</span>
											<input
												class="qi__option-label"
												type="text"
												value={option}
												placeholder="Option {i + 1}"
												oninput={(event) =>
													updateDraft(
														item.id,
														(draft) => {
															draft.options_json[
																i
															] =
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value;
														},
													)}
												disabled={isSaved || saving}
											/>

											{#if item.useOptionImages && item.optionImages[i]}
												<div class="qi__option-image">
													{#if item.optionImages[i].dataUrl}
														<img
															src={item
																.optionImages[i]
																.dataUrl}
															alt={option ||
																`Option ${i + 1}`}
														/>
													{:else}
														<span
															class="qi__option-image-empty"
															>No crop</span
														>
													{/if}
													{#if item.optionImages[i].warnings.length > 0}
														<small
															class="qi__option-image-warn"
														>
															{item.optionImages[
																i
															].warnings.join(
																', ',
															)}
														</small>
													{/if}
													<label
														class="qi__btn qi__btn--ghost qi__btn--sm"
													>
														Replace
														<input
															type="file"
															accept="image/*"
															onchange={(event) =>
																replaceImportedOptionImage(
																	item.id,
																	i,
																	event,
																)}
															disabled={isSaved ||
																saving}
															class="qi__file-input"
														/>
													</label>
												</div>
											{/if}

											{#if item.draft.type === 'boolean'}
												<div class="qi__bool-toggle">
													{#each [{ v: true, l: 'Yes' }, { v: false, l: 'No' }] as opt (String(opt.v))}
														<button
															class="qi__bool-btn"
															class:qi__bool-btn--yes={opt.v &&
																item.draft
																	.correct_answers_json[
																	i
																] === opt.v}
															class:qi__bool-btn--no={!opt.v &&
																item.draft
																	.correct_answers_json[
																	i
																] === opt.v}
															onclick={() =>
																setAnswer(
																	item.id,
																	i,
																	opt.v,
																)}
															disabled={isSaved ||
																saving}
														>
															{opt.l}
														</button>
													{/each}
												</div>
											{:else if item.draft.type === 'rank'}
												<select
													class="qi__option-select"
													value={item.draft
														.correct_answers_json[
														i
													]}
													onchange={(event) =>
														setAnswer(
															item.id,
															i,
															Number(
																/** @type {HTMLSelectElement} */ (
																	event.currentTarget
																).value,
															),
														)}
													disabled={isSaved || saving}
												>
													{#each Array.from({ length: 10 }, (_, j) => j + 1) as rank (rank)}
														<option value={rank}
															>#{rank}</option
														>
													{/each}
												</select>
											{:else if item.draft.type === 'numbers'}
												<input
													class="qi__option-answer"
													type="number"
													step="any"
													value={item.draft
														.correct_answers_json[
														i
													]}
													placeholder="0"
													oninput={(event) =>
														setAnswer(
															item.id,
															i,
															Number(
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value,
															),
														)}
													disabled={isSaved || saving}
												/>
											{:else if item.draft.type === 'colors'}
												<div class="qi__color-fields">
													<span
														class="qi__color-swatch"
														style:background={item
															.draft
															.correct_answers_json[
															i
														]?.backgroundColor ??
															'lch(0% 0 0)'}
													></span>
													<input
														class="qi__option-answer"
														type="text"
														value={item.draft
															.correct_answers_json[
															i
														]?.text ?? ''}
														placeholder="Color label"
														oninput={(event) =>
															setColorAnswer(
																item.id,
																i,
																'text',
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value,
															)}
														disabled={isSaved ||
															saving}
													/>
													<input
														class="qi__option-answer"
														type="text"
														value={item.draft
															.correct_answers_json[
															i
														]?.backgroundColor ??
															''}
														placeholder="hsl(0 80% 50%)"
														oninput={(event) =>
															setColorAnswer(
																item.id,
																i,
																'backgroundColor',
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value,
															)}
														disabled={isSaved ||
															saving}
													/>
												</div>
											{:else}
												<div
													class="qi__option-answer-wrap"
												>
													<span
														class="qi__option-arrow"
														>→</span
													>
													<input
														class="qi__option-answer"
														type="text"
														value={item.draft
															.correct_answers_json[
															i
														]}
														placeholder="Correct answer"
														oninput={(event) =>
															setAnswer(
																item.id,
																i,
																/** @type {HTMLInputElement} */ (
																	event.currentTarget
																).value,
															)}
														disabled={isSaved ||
															saving}
													/>
												</div>
											{/if}
										</div>
									{/each}
								</div>

								<!-- Card footer -->
								<div class="qi__card-footer">
									<span class="qi__card-footer-hint">
										{#if item.errors.length > 0}
											Fix errors above to enable Save
										{:else}
											Ready to save
										{/if}
									</span>
									<button
										class="qi__btn qi__btn--ghost qi__btn--sm qi__btn--danger-text"
										onclick={() => removeItem(item.id)}
										disabled={saving}
									>
										<Trash2 size={11} />
										Discard
									</button>
									<button
										class="qi__btn qi__btn--primary qi__btn--sm"
										onclick={() => saveAndLogItem(item)}
										disabled={item.errors.length > 0 ||
											isSaved ||
											saving}
									>
										<Check size={11} />
										Save question
									</button>
								</div>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<Toast bind:this={toastRef} />

<style>
	/* ─── Layout ───────────────────────────────────────────────── */

	.qi__status {
		display: grid;
		height: 200px;

		font-size: 13px;

		color: var(--fg-mute);

		place-items: center;
	}

	.qi__header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 4px;

		flex-wrap: wrap;
		gap: 16px;
	}

	.qi__title {
		margin: 0;

		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.qi__subtitle {
		margin: 4px 0 0;

		font-size: 13px;

		color: var(--fg-mute);
	}

	.qi__counts {
		display: flex;
		align-items: center;

		gap: 16px;
	}

	.qi__blip {
		display: inline-flex;
		align-items: center;

		font-size: 11.5px;

		color: var(--fg-faint);

		gap: 6px;
	}

	.qi__blip-led {
		width: 6px;
		height: 6px;

		border-radius: 50%;
	}

	.qi__blip-num {
		color: var(--fg);
	}

	.qi__error {
		padding: 10px 14px;
		margin: 8px 0;

		font-size: 13px;

		color: var(--danger);
		background: var(--danger-soft);
		border: 1px solid lch(63.3% 63.5 19 / 0.25);
		border-radius: var(--r-2);
	}

	/* ─── Toolbar ──────────────────────────────────────────────── */

	.qi__toolbar {
		display: flex;
		position: sticky;
		top: -24px;
		z-index: 4;
		margin: 0 -24px;
		padding: 14px 24px;
		align-items: center;

		background: var(--bg);
		border-bottom: 1px solid var(--border);

		flex-wrap: wrap;
		gap: 8px;
	}

	.qi__toolbar-btns {
		display: flex;
		align-items: center;

		gap: 6px;
	}

	.qi__toolbar-spacer {
		flex: 1;
	}

	.qi__toolbar-errors {
		font-size: 12px;

		color: var(--danger);
	}

	/* ─── Buttons ──────────────────────────────────────────────── */

	.qi__btn {
		display: inline-flex;
		align-items: center;
		height: var(--h-button);
		padding: 0 14px;

		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;

		color: var(--fg);
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);
		cursor: pointer;

		transition:
			background 80ms ease,
			border-color 80ms ease;

		gap: 6px;
	}

	.qi__btn:hover {
		background: var(--surface-hover);
	}

	.qi__btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.qi__btn--ghost {
		background: transparent;
		border-color: var(--border);
	}

	.qi__btn--ghost:hover {
		background: var(--surface);
		border-color: var(--border-strong);
	}

	.qi__btn--primary {
		font-weight: 600;

		color: var(--accent-fg);
		background: var(--accent);
		border-color: transparent;
		box-shadow:
			0 0 0 1px lch(94.2% 90.2 115 / 0.25),
			0 8px 24px -8px lch(94.2% 90.2 115 / 0.35);
	}

	.qi__btn--primary:hover {
		background: var(--accent-hover);
	}

	.qi__btn--sm {
		height: 28px;
		padding: 0 10px;

		font-size: 12px;

		border-radius: var(--r-1);
	}

	.qi__btn--danger-text {
		color: var(--danger);
	}

	.qi__file-input {
		display: none;
	}

	/* ─── Batch progress ──────────────────────────────────────── */

	.qi__progress {
		display: flex;
		margin: 0 -24px;
		padding: 10px 24px;
		align-items: center;

		font-size: 12px;

		color: var(--accent);
		background: var(--accent-soft);
		border-bottom: 1px solid var(--border-accent);

		gap: 12px;
	}

	.qi__progress-spinner {
		display: inline-block;
		width: 12px;
		height: 12px;

		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;

		animation: spin var(--dur-spin) linear infinite;
	}

	.qi__progress-track {
		overflow: hidden;
		height: 4px;

		background: var(--surface);
		border-radius: 100px;

		flex: 1;
	}

	.qi__progress-fill {
		height: 100%;

		background: var(--accent);
		border-radius: 100px;

		transition: width 200ms ease;
	}

	/* ─── Card list ────────────────────────────────────────────── */

	.qi__list {
		display: flex;
		padding-top: 14px;

		flex-direction: column;
		gap: 10px;
	}

	/* ─── Import card ──────────────────────────────────────────── */

	.qi__card {
		overflow: hidden;

		border: 1px solid var(--border);
		border-radius: var(--r-2);
		background: var(--surface);
		
		transition: border-color 160ms ease;
	}

	.qi__card--saved {
		border-color: lch(86.6% 57.6 150 / 0.18);
	}

	.qi__card--error {
		border-color: lch(63.3% 63.5 19 / 0.25);
	}

	.qi__card--extracting {
		border-color: lch(70.8% 45.3 266 / 0.2);
	}

	/* ─── Card header ──────────────────────────────────────────── */

	.qi__card-header {
		display: flex;
		align-items: flex-start;
		padding: 14px;

		gap: 14px;
	}

	.qi__card-header--clickable {
		cursor: pointer;
	}

	.qi__card--saved .qi__card-header {
		background: var(--ok-soft);
	}

	.qi__card--error .qi__card-header {
		background: var(--danger-soft);
	}

	.qi__card--extracting .qi__card-header {
		background: var(--info-soft);
	}

	/* ─── Photo thumbnail ─────────────────────────────────────── */

	.qi__thumb {
		display: flex;
		position: relative;
		overflow: hidden;
		width: 84px;
		height: 112px;

		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);

		flex: 0 0 84px;
	}

	.qi__thumb img {
		width: 100%;
		height: 100%;

		object-fit: cover;
	}

	.qi__thumb-overlay {
		display: grid;
		position: absolute;
		inset: 0;

		place-items: center;

		background: lch(4.4% 1.7 290 / 0.55);
	}

	.qi__thumb-spinner {
		display: inline-block;
		width: 18px;
		height: 18px;

		border: 2px solid lch(100% 0 0 / 0.2);
		border-top-color: var(--info);
		border-radius: 50%;

		animation: spin var(--dur-spin) linear infinite;
	}

	.qi__thumb-check {
		display: grid;
		position: absolute;
		bottom: 4px;
		right: 4px;
		width: 18px;
		height: 18px;

		place-items: center;

		color: lch(10% 10 150);
		background: var(--ok);
		border-radius: 50%;
		box-shadow: 0 2px 6px lch(0% 0 0 / 0.4);
	}

	/* ─── Card info ────────────────────────────────────────────── */

	.qi__card-info {
		display: flex;
		min-width: 0;

		flex: 1;
		flex-direction: column;
		gap: 6px;
	}

	.qi__card-meta {
		display: flex;
		align-items: center;

		flex-wrap: wrap;
		gap: 8px;
	}

	.qi__card-id {
		font-size: 11px;

		color: var(--fg-faint);
	}

	.qi__card-caret {
		display: inline-flex;
		margin-left: auto;

		color: var(--fg-mute);

		transform: rotate(90deg);
		transition: transform 160ms ease;
	}

	.qi__card-caret--collapsed {
		transform: rotate(0deg);
	}

	.qi__card-text {
		overflow: hidden;
		max-width: 600px;

		font-size: 14.5px;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.qi__card-deck-line {
		display: inline-flex;
		align-items: center;

		font-size: 12px;

		color: var(--fg-mute);

		gap: 8px;
	}

	.qi__card-no-deck {
		color: var(--danger);
	}

	.qi__card-dot {
		width: 2px;
		height: 2px;

		background: var(--border-strong);
		border-radius: 50%;
	}

	.qi__card-actions {
		display: flex;
		align-items: center;

		gap: 4px;

		&:empty {
			display: none;
		}
	}

	/* ─── Card body (expanded) ─────────────────────────────────── */

	.qi__card-body {
		border-top: 1px solid var(--border);
	}

	/* ─── Banners ──────────────────────────────────────────────── */

	.qi__banner {
		padding: 10px 14px;

		font-size: 12.5px;
	}

	.qi__banner--error {
		color: var(--danger);
		background: var(--danger-soft);
		border-bottom: 1px solid lch(63.3% 63.5 19 / 0.18);
	}

	.qi__banner--warn {
		color: var(--warn);
		background: var(--warn-soft);
		border-bottom: 1px solid lch(78.9% 66.4 75 / 0.18);
	}

	.qi__banner-row {
		display: flex;
		align-items: flex-start;

		gap: 8px;
	}

	.qi__banner-row + .qi__banner-row {
		margin-top: 4px;
	}

	.qi__banner-icon {
		display: grid;
		width: 12px;
		height: 12px;

		font-size: 9px;
		font-weight: 700;

		place-items: center;

		border-radius: 2px;

		flex: 0 0 12px;
	}

	.qi__banner-icon--error {
		color: lch(10% 8 19);
		background: var(--danger);
	}

	/* ─── Question fields ──────────────────────────────────────── */

	.qi__fields {
		padding: 14px 16px 8px;
	}

	.qi__fields-grid {
		display: grid;
		margin-bottom: 8px;

		gap: 8px;

		grid-template-columns: 1fr 180px 80px;
	}

	.qi__input-wrap {
		display: flex;
		align-items: center;
		height: var(--h-button);

		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;
	}

	.qi__input-wrap:focus-within {
		border-color: var(--border-accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.qi__input {
		width: 100%;
		padding: 0 12px;

		font-size: 13px;
	}

	.qi__input::placeholder {
		color: var(--fg-faint);
	}

	.qi__input-wrap--num {
		max-width: 80px;
	}

	.qi__image-toggle {
		display: flex;
		align-items: center;
		margin-top: 8px;

		font-size: 12px;

		color: var(--fg-mute);
		cursor: pointer;

		gap: 8px;
	}

	/* ─── Options list ─────────────────────────────────────────── */

	.qi__options {
		padding: 0 16px 8px;
	}

	.qi__options-head {
		display: flex;
		align-items: center;
		padding: 6px 4px;

		border-bottom: 1px solid var(--border);

		gap: 8px;
	}

	.qi__options-label {
		font-size: 11px;
		font-weight: 500;

		color: var(--fg-mute);
	}

	.qi__options-count {
		font-size: 11px;

		color: var(--fg-faint);
	}

	.qi__option-row {
		display: grid;
		padding: 6px 4px;
		align-items: center;

		border-bottom: 1px solid var(--border);

		gap: 8px;

		grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1fr);
	}

	.qi__option-num {
		font-size: 11px;
		text-align: right;

		color: var(--fg-faint);
	}

	.qi__option-label {
		min-width: 0;
		padding: 4px 8px;

		font-size: 12.5px;

		border-radius: var(--r-1);

		transition: background 80ms ease;
	}

	.qi__option-label:focus {
		background: var(--surface-2);
	}

	.qi__option-answer-wrap {
		display: flex;
		align-items: center;
		min-width: 0;

		gap: 4px;
	}

	.qi__option-arrow {
		font-size: 12px;

		color: var(--fg-faint);
	}

	.qi__option-answer {
		min-width: 0;
		padding: 4px 8px;

		font-size: 12.5px;

		border-radius: var(--r-1);

		flex: 1;

		transition: background 80ms ease;
	}

	.qi__option-answer:focus {
		background: var(--surface-2);
	}

	.qi__option-select {
		height: 26px;
		padding: 0 8px;

		font-family: var(--font-mono);
		font-size: 12px;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-1);
	}

	/* ─── Boolean toggle ───────────────────────────────────────── */

	.qi__bool-toggle {
		display: inline-flex;

		gap: 4px;
	}

	.qi__bool-btn {
		height: 24px;
		padding: 0 10px;

		font-size: 11.5px;
		font-weight: 500;

		color: var(--fg-mute);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-1);
		cursor: pointer;

		transition:
			background 80ms ease,
			border-color 80ms ease,
			color 80ms ease;
	}

	.qi__bool-btn--yes {
		color: var(--ok);
		background: var(--ok-soft);
		border-color: lch(86.6% 57.6 150 / 0.3);
	}

	.qi__bool-btn--no {
		color: var(--danger);
		background: var(--danger-soft);
		border-color: lch(63.3% 63.5 19 / 0.3);
	}

	/* ─── Color fields ─────────────────────────────────────────── */

	.qi__color-fields {
		display: inline-flex;
		align-items: center;

		gap: 6px;
	}

	.qi__color-swatch {
		width: 16px;
		height: 16px;

		border: 1px solid var(--border);
		border-radius: 3px;
	}

	/* ─── Option images ────────────────────────────────────────── */

	.qi__option-image {
		display: flex;
		align-items: center;

		gap: 8px;

		grid-column: 2 / -1;
	}

	.qi__option-image img {
		width: 40px;
		height: 40px;

		object-fit: cover;

		border: 1px solid var(--border);
		border-radius: var(--r-1);
	}

	.qi__option-image-empty {
		font-size: 11px;

		color: var(--fg-faint);
	}

	.qi__option-image-warn {
		font-size: 11px;

		color: var(--warn);
	}

	/* ─── Card footer ──────────────────────────────────────────── */

	.qi__card-footer {
		display: flex;
		align-items: center;
		padding: 14px 16px;

		background: var(--bg-2);
		border-top: 1px solid var(--border);

		gap: 8px;
	}

	.qi__card-footer-hint {
		font-size: 11.5px;

		color: var(--fg-faint);

		flex: 1;
	}

	/* ─── Responsive ───────────────────────────────────────────── */

	@media (max-width: 768px) {
		.qi__header {
			flex-direction: column;
			align-items: flex-start;
		}

		.qi__counts {
			flex-wrap: wrap;
			gap: 10px;
		}

		.qi__toolbar {
			top: -16px;
		}

		.qi__progress {
			margin: 0 -16px;
			padding: 8px 16px;
		}

		.qi__thumb {
			width: 44px;
			height: 60px;

			flex: 0 0 44px;
		}

		.qi__card-header {
			padding: 12px;
		}

		.qi__card-text {
			max-width: 240px;

			font-size: 13.5px;
		}

		.qi__fields-grid {
			grid-template-columns: 1fr;
		}

		.qi__input-wrap--num {
			max-width: none;
		}

		.qi__option-row {
			grid-template-columns: 24px 1fr;

			& > :nth-child(3) {
				grid-column: 1 / -1;
			}
		}

		.qi__fields {
			padding: 12px 12px 6px;
		}

		.qi__options {
			padding: 0 12px 8px;
		}

		.qi__card-footer {
			padding: 12px;
		}
	}
</style>
