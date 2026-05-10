<script>
	import { supabase } from '../lib/supabase.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import {
		createEmptyImportDraft,
		normalizeAnswers,
		normalizeImportDraft,
		toQuestionInsertPayload,
		validateImportDraft,
	} from '../lib/questionImport.js';
	import { base } from '$app/paths';
	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let deckId = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let items = $state(/** @type {ImportItem[]} */ ([]));

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
		const { data, error: err } = await supabase.from('decks').select('id, name').order('name');
		if (err) error = err.message;
		decks = data ?? [];
		loading = false;
	}

	/** @param {Event} event */
	async function handleFiles(event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
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
		await Promise.all(newItems.map((item, index) => extractFile(item.id, files[index])));
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
		updateItem(id, (item) => ({ ...item, status: 'extracting', extractionError: '' }));
		try {
			const image = await imageToUploadDataUrl(file);
			const { data: { user } } = await supabase.auth.getUser();
			const headers = new Headers({ 'Content-Type': 'application/json' });
			if (user?.id) {
				const { data: sessionData } = await supabase.auth.getSession();
				if (sessionData.session?.access_token) {
					headers.set('Authorization', `Bearer ${sessionData.session.access_token}`);
				}
			}
			const response = await fetch(`${base}/api/extract-card`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ image, deckId, fileName: file.name }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data?.error ?? 'Extraction failed.');

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
					...validateImportItem(normalized, item.optionImages, item.useOptionImages),
				],
			};
		});
	}

	/**
	 * @param {string} id
	 * @param {import('../data/questionTypes.js').QuestionType} type
	 */
	function changeType(id, type) {
		updateDraft(id, (draft) => {
			draft.type = type;
			draft.correct_answers_json = normalizeAnswers(type, draft.correct_answers_json);
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
				text: typeof current === 'object' && current ? current.text ?? '' : '',
				backgroundColor: typeof current === 'object' && current ? current.backgroundColor ?? 'hsl(0 80% 50%)' : 'hsl(0 80% 50%)',
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
				...validateImportItem(item.draft, item.optionImages, useOptionImages),
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
				const optionImages = item.optionImages.map((image, imageIndex) =>
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
		updateItem(id, (item) => ({ ...item, collapsed: !item.collapsed }));
	}

	function clearSaved() {
		items.filter((item) => item.status === 'saved').forEach((item) => URL.revokeObjectURL(item.previewUrl));
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
		const itemErrors = validateImportItem(item.draft, item.optionImages, item.useOptionImages);
		if (errors.length > 0 || itemErrors.length > 0) {
			updateItem(item.id, (current) => ({ ...current, errors: [...errors, ...itemErrors] }));
			return;
		}

		saving = true;
		try {
			const payload = toQuestionInsertPayload(item.draft, deckId);
			if (item.useOptionImages) {
				payload.answer_media_json = await uploadImportedOptionImages(item);
			}
			const { error: err } = await supabase.from('questions').insert(payload);
			if (err) throw err;
			updateItem(item.id, (current) => ({ ...current, status: 'saved', errors: [], collapsed: true }));
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
		if (optionImages.length !== 10 || optionImages.some((image) => !image.dataUrl)) {
			return ['All 10 option image crops are required, or turn off image options for this import.'];
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
				const { data } = supabase.storage.from(OPTION_IMAGE_BUCKET).getPublicUrl(path);
				return {
					option_image_url: data.publicUrl,
					option_image_path: path,
					option_image_alt: item.draft.options_json[index] ?? '',
				};
			}),
		);
	}

	async function saveAllReady() {
		for (const item of items) {
			if (item.status === 'ready' && item.errors.length === 0) {
				await saveItem(item);
			}
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
				const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
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
				const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
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
							reject(new Error('Could not compress replacement crop.'));
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
			const image = array[index] && typeof array[index] === 'object'
				? /** @type {Record<string, any>} */ (array[index])
				: {};
			return {
				dataUrl: typeof image.dataUrl === 'string' ? image.dataUrl : '',
				width: Number(image.width) || 0,
				height: Number(image.height) || 0,
				warnings: Array.isArray(image.warnings) ? image.warnings.map(String).filter(Boolean) : [],
			};
		});
	}

	/** @param {number} value */
	function confidencePercent(value) {
		return `${Math.round(value * 100)}%`;
	}

	/** @param {number} value */
	function confidenceClass(value) {
		return Math.round(value * 100) >= 100 ? 'admin-import-confidence__pill admin-import-confidence__pill--complete' : 'admin-import-confidence__pill';
	}

	const readyToSaveCount = $derived(items.filter((item) => item.status === 'ready' && item.errors.length === 0).length);
	const savedCount = $derived(items.filter((item) => item.status === 'saved').length);
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<a class="admin-back" href="{base}/admin/questions">← Questions</a>
		<h1 class="admin-page__title">Import cards</h1>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else}
		<div class="admin-import">
			{#if error}<p class="admin-form-error">{error}</p>{/if}

			<section class="admin-import-panel">
				<div class="admin-form-row">
					<label class="admin-label">
						Target deck *
						<select class="admin-select" bind:value={deckId} disabled={saving}>
							<option value="">Choose a deck</option>
							{#each decks as deck (deck.id)}
								<option value={deck.id}>{deck.name}</option>
							{/each}
						</select>
					</label>

					<label class="admin-label">
						Card photos
						<span class="admin-file-upload">
							Upload or take photos
							<input type="file" accept="image/*" capture="environment" multiple onchange={handleFiles} />
						</span>
					</label>
				</div>
				<p class="admin-hint">Add one physical card per image. Each detected card must be reviewed before it is saved.</p>
				<div class="admin-form-actions">
					<button class="admin-btn admin-btn--primary" type="button" onclick={saveAllReady} disabled={!deckId || readyToSaveCount === 0 || saving}>
						{saving ? 'Saving…' : `Save ${readyToSaveCount} ready`}
					</button>
					<button class="admin-btn" type="button" onclick={clearSaved} disabled={savedCount === 0 || saving}>Clear saved</button>
					<a class="admin-btn" href="{base}/admin/questions">Done</a>
				</div>
			</section>

			{#if items.length === 0}
				<p class="admin-hint">No card photos selected yet.</p>
			{:else}
				<div class="admin-import-list">
					{#each items as item (item.id)}
						<article class="admin-import-card" class:admin-import-card--collapsed={item.status === 'saved' && item.collapsed}>
							<div class="admin-import-card__media">
								<img src={item.previewUrl} alt={`Preview of ${item.fileName}`} />
								<span class="admin-list__badge">{item.status}</span>
								<small>{item.fileName}</small>
							</div>

							<div class="admin-import-card__body">
								{#if item.status === 'extracting' || item.status === 'queued'}
									<p class="admin-hint">Extracting question data…</p>
								{:else if item.status === 'error'}
									<p class="admin-form-error">{item.extractionError}</p>
									<div class="admin-form-actions">
										<button class="admin-btn" type="button" onclick={() => retryExtraction(item.id)}>Try again</button>
										<button class="admin-btn admin-btn--danger" type="button" onclick={() => removeItem(item.id)}>Discard</button>
									</div>
								{:else if item.status === 'saved' && item.collapsed}
									<div class="admin-import-saved-summary">
										<span class="admin-list__badge" data-type={item.draft.type}>{QUESTION_TYPES[item.draft.type]?.label ?? item.draft.type}</span>
										{#if item.draft.question_number}
											<span class="admin-list__num">#{item.draft.question_number}</span>
										{/if}
										<strong>{item.draft.question_text}</strong>
									</div>
									<div class="admin-form-actions">
										<button class="admin-btn admin-btn--sm" type="button" onclick={() => toggleCollapsed(item.id)}>Expand</button>
										<button class="admin-btn admin-btn--sm admin-btn--danger" type="button" onclick={() => removeItem(item.id)}>Remove</button>
									</div>
								{:else}
									<div class="admin-form-row">
										<label class="admin-label">
											Type *
											<select class="admin-select" value={item.draft.type} onchange={(event) => changeType(item.id, /** @type {import('../data/questionTypes.js').QuestionType} */ (/** @type {HTMLSelectElement} */ (event.currentTarget).value))} disabled={item.status === 'saved' || saving}>
												{#each typeOptions as [key, config] (key)}
													<option value={key}>{config.label}</option>
												{/each}
											</select>
										</label>
										<label class="admin-label admin-import-number">
											Question number
											<input class="admin-input" type="number" value={item.draft.question_number ?? ''} oninput={(event) => updateDraft(item.id, (draft) => { draft.question_number = /** @type {HTMLInputElement} */ (event.currentTarget).value ? Number(/** @type {HTMLInputElement} */ (event.currentTarget).value) : null; })} disabled={item.status === 'saved' || saving} />
										</label>
									</div>

									<label class="admin-label">
										Question text *
										<input class="admin-input" type="text" value={item.draft.question_text} oninput={(event) => updateDraft(item.id, (draft) => { draft.question_text = /** @type {HTMLInputElement} */ (event.currentTarget).value; })} disabled={item.status === 'saved' || saving} />
									</label>

									<div class="admin-import-confidence">
										<span class={confidenceClass(item.draft.confidence.type)}>Type {confidencePercent(item.draft.confidence.type)}</span>
										<span class={confidenceClass(item.draft.confidence.question_text)}>Text {confidencePercent(item.draft.confidence.question_text)}</span>
										<span class={confidenceClass(item.draft.confidence.question_number)}>Number {confidencePercent(item.draft.confidence.question_number)}</span>
										<span class={confidenceClass(item.draft.confidence.options)}>Options {confidencePercent(item.draft.confidence.options)}</span>
										<span class={confidenceClass(item.draft.confidence.correct_answers)}>Answers {confidencePercent(item.draft.confidence.correct_answers)}</span>
									</div>

									{#if item.optionImages.length > 0}
										<label class="admin-toggle-wrap admin-import-image-toggle">
											<input
												type="checkbox"
												checked={item.useOptionImages}
												onchange={(event) => setUseOptionImages(item.id, /** @type {HTMLInputElement} */ (event.currentTarget).checked)}
												disabled={item.status === 'saved' || saving}
											/>
											<span class="admin-toggle" class:admin-toggle--on={item.useOptionImages}>
												{item.useOptionImages ? 'Using image options' : 'Use text options'}
											</span>
										</label>
									{/if}

									{#if item.draft.warnings.length > 0}
										<ul class="admin-import-warnings">
											{#each item.draft.warnings as warning, i (i)}
												<li>{warning}</li>
											{/each}
										</ul>
									{/if}

									<div class="admin-label">
										Options &amp; correct answers
										<div class="admin-options">
											{#each item.draft.options_json as option, i (i)}
												<div class="admin-option-row">
													<span class="admin-option-num">{i + 1}</span>
													<input class="admin-input admin-option-label" type="text" value={option} placeholder="Option {i + 1}" oninput={(event) => updateDraft(item.id, (draft) => { draft.options_json[i] = /** @type {HTMLInputElement} */ (event.currentTarget).value; })} disabled={item.status === 'saved' || saving} />

													{#if item.useOptionImages && item.optionImages[i]}
														<div class="admin-import-option-image">
															{#if item.optionImages[i].dataUrl}
																<img src={item.optionImages[i].dataUrl} alt={option || `Option ${i + 1}`} />
															{:else}
																<span>No crop</span>
															{/if}
															{#if item.optionImages[i].warnings.length > 0}
																<small>{item.optionImages[i].warnings.join(', ')}</small>
															{/if}
															<label class="admin-btn admin-btn--sm">
																Replace
																<input
																	type="file"
																	accept="image/*"
																	onchange={(event) => replaceImportedOptionImage(item.id, i, event)}
																	disabled={item.status === 'saved' || saving}
																/>
															</label>
														</div>
													{/if}

													{#if item.draft.type === 'boolean'}
														<label class="admin-toggle-wrap">
															<input type="checkbox" checked={item.draft.correct_answers_json[i]} onchange={(event) => setAnswer(item.id, i, /** @type {HTMLInputElement} */ (event.currentTarget).checked)} disabled={item.status === 'saved' || saving} />
															<span class="admin-toggle" class:admin-toggle--on={item.draft.correct_answers_json[i]}>{item.draft.correct_answers_json[i] ? 'Yes' : 'No'}</span>
														</label>
													{:else if item.draft.type === 'rank'}
														<input class="admin-input admin-option-num-input" type="number" min="1" max="10" value={item.draft.correct_answers_json[i]} oninput={(event) => setAnswer(item.id, i, Number(/** @type {HTMLInputElement} */ (event.currentTarget).value))} disabled={item.status === 'saved' || saving} />
													{:else if item.draft.type === 'numbers'}
														<input class="admin-input admin-option-num-input" type="number" step="any" value={item.draft.correct_answers_json[i]} oninput={(event) => setAnswer(item.id, i, Number(/** @type {HTMLInputElement} */ (event.currentTarget).value))} disabled={item.status === 'saved' || saving} />
													{:else if item.draft.type === 'colors'}
														<input class="admin-input admin-option-answer" type="text" value={item.draft.correct_answers_json[i]?.text ?? ''} placeholder="Color label" oninput={(event) => setColorAnswer(item.id, i, 'text', /** @type {HTMLInputElement} */ (event.currentTarget).value)} disabled={item.status === 'saved' || saving} />
														<input class="admin-input admin-option-answer" type="text" value={item.draft.correct_answers_json[i]?.backgroundColor ?? ''} placeholder="hsl(0 80% 50%)" oninput={(event) => setColorAnswer(item.id, i, 'backgroundColor', /** @type {HTMLInputElement} */ (event.currentTarget).value)} disabled={item.status === 'saved' || saving} />
													{:else}
														<input class="admin-input admin-option-answer" type="text" value={item.draft.correct_answers_json[i]} placeholder="Correct answer" oninput={(event) => setAnswer(item.id, i, /** @type {HTMLInputElement} */ (event.currentTarget).value)} disabled={item.status === 'saved' || saving} />
													{/if}
												</div>
											{/each}
										</div>
									</div>

									{#if item.errors.length > 0}
										<ul class="admin-import-errors">
											{#each item.errors as validationError, i (i)}
												<li>{validationError}</li>
											{/each}
										</ul>
									{/if}

									<div class="admin-form-actions">
										<button class="admin-btn admin-btn--primary" type="button" onclick={() => saveItem(item)} disabled={item.status === 'saved' || saving}>
											{item.status === 'saved' ? 'Saved' : 'Save question'}
										</button>
										{#if item.status === 'saved'}
											<button class="admin-btn" type="button" onclick={() => toggleCollapsed(item.id)}>Collapse</button>
										{/if}
										<button class="admin-btn admin-btn--danger" type="button" onclick={() => removeItem(item.id)} disabled={saving}>Discard</button>
									</div>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
