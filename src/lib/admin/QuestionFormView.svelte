<script>
	import { untrack } from 'svelte';
	import { supabase } from '$lib/supabase.js';
	import { goto } from '$app/navigation';

	/** @type {{ id: string|null }} */
	let { id } = $props();

	const isEdit = $derived(id !== null);
	const NUM_BLOBS = 10;
	const OPTION_IMAGE_BUCKET = 'question-option-images';
	const OPTION_IMAGE_MAX_SIZE = 512;
	const OPTION_IMAGE_QUALITY = 0.78;
	const draftMediaId = crypto.randomUUID();

	// --- Form state ---
	let deckId = $state('');
	let type = $state(/** @type {import('$lib/data/questionTypes.js').QuestionType} */ ('standard'));
	let questionText = $state('');
	let questionNumber = $state(/** @type {number|''} */ (''));
	let optionDisplayMode = $state(/** @type {'text'|'image'} */ ('text'));
	let options = $state(/** @type {string[]} */ (Array(NUM_BLOBS).fill('')));
	// correctAnswers: type-specific values
	let correctAnswers = $state(/** @type {any[]} */ (Array(NUM_BLOBS).fill('')));
	// For colors: per-blob HSL state
	let colorHsl = $state(
		Array(NUM_BLOBS).fill(null).map(() => ({ h: 0, s: 80, l: 50 })),
	);
	// Media per blob: { url, spotify_url, youtube_url, option_image_url, option_image_path }
	let media = $state(
		Array(NUM_BLOBS).fill(null).map(() => createEmptyMedia()),
	);
	let imageUploading = $state(Array(NUM_BLOBS).fill(false));

	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	// Reset correct answers when type changes (only on user-initiated change)
	let prevType = $state(untrack(() => type));
	$effect(() => {
		if (type !== prevType) {
			correctAnswers = initCorrectAnswers(type);
			prevType = type;
		}
	});

	$effect(() => {
		loadDecks();
		if (isEdit && id) loadQuestion(id);
		else loading = false;
	});

	async function loadDecks() {
		const { data } = await supabase.from('decks').select('id, name').order('name');
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
		if (err) { error = 'Failed to load question.'; loading = false; return; }

		deckId = data.deck_id;
		type = data.type;
		prevType = data.type;
		questionText = data.question_text;
		questionNumber = data.question_number ?? '';
		options = data.options_json ?? Array(NUM_BLOBS).fill('');

		const loaded = data.correct_answers_json ?? Array(NUM_BLOBS).fill('');
		correctAnswers = loaded;

		// For colors: unpack stored { text, backgroundColor } into colorHsl + correctAnswers[i].text
		if (data.type === 'colors') {
			colorHsl = loaded.map((/** @type {any} */ ca) => {
				const match = (ca?.backgroundColor ?? '').match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
				return match
					? { h: +match[1], s: +match[2], l: +match[3] }
					: { h: 0, s: 80, l: 50 };
			});
		}

		const loadedMedia = data.answer_media_json ?? Array(NUM_BLOBS).fill(null);
		media = loadedMedia.map((/** @type {any} */ m) => ({
			url: m?.url ?? '',
			spotify_url: m?.spotify_url ?? '',
			youtube_url: m?.youtube_url ?? '',
			option_image_url: m?.option_image_url ?? '',
			option_image_path: m?.option_image_path ?? '',
			option_image_alt: m?.option_image_alt ?? '',
		}));
		optionDisplayMode = media.every((m) => m.option_image_url) ? 'image' : 'text';

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

	/** @param {number} h @param {number} s @param {number} l */
	function hslToRgb(h, s, l) {
		h /= 360;
		s /= 100;
		l /= 100;
		if (s === 0) {
			const v = Math.round(l * 255);
			return [v, v, v];
		}
		const hue2rgb = (/** @type {number} */ p, /** @type {number} */ q, /** @type {number} */ t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		const r = hue2rgb(p, q, h + 1 / 3);
		const g = hue2rgb(p, q, h);
		const b = hue2rgb(p, q, h - 1 / 3);
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}

	/** @param {number} h @param {number} s @param {number} l */
	function hslToHex(h, s, l) {
		const [r, g, b] = hslToRgb(h, s, l);
		return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
	}

	/** @param {string} hex */
	function hexToHsl(hex) {
		const n = hex.replace('#', '');
		const r = parseInt(n.slice(0, 2), 16) / 255;
		const g = parseInt(n.slice(2, 4), 16) / 255;
		const b = parseInt(n.slice(4, 6), 16) / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0;
		let s = 0;
		const l = (max + min) / 2;
		const d = max - min;
		if (d !== 0) {
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r:
					h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
					break;
				case g:
					h = ((b - r) / d + 2) / 6;
					break;
				default:
					h = ((r - g) / d + 4) / 6;
			}
		}
		return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
	}

	/** @param {number} i */
	function colorToBg(i) {
		const { h, s, l } = colorHsl[i];
		return `hsl(${h} ${s}% ${l}%)`;
	}

	/** @param {number} i @param {string} hex */
	function applyColorFromNativePicker(i, hex) {
		const { h, s, l } = hexToHsl(hex);
		colorHsl[i].h = h;
		colorHsl[i].s = s;
		colorHsl[i].l = l;
		syncColorAnswer(i);
	}

	/** @param {number} i */
	function syncColorAnswer(i) {
		const text = typeof correctAnswers[i] === 'object' ? correctAnswers[i]?.text ?? '' : correctAnswers[i] ?? '';
		const backgroundColor = colorToBg(i);
		correctAnswers[i] = { text, backgroundColor };
	}

	/** @param {number} i @param {string} text */
	function setColorText(i, text) {
		correctAnswers[i] = { text, backgroundColor: colorToBg(i) };
	}

	async function handleSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		error = '';
		if (!deckId) { error = 'Please select a deck.'; return; }
		if (!questionText.trim()) { error = 'Question text is required.'; return; }
		if (options.some((o) => !o.trim())) { error = 'All 10 options must be filled in.'; return; }
		if (imageUploading.some(Boolean)) { error = 'Wait for image uploads to finish.'; return; }
		if (optionDisplayMode === 'image' && media.some((m) => !m.option_image_url)) {
			error = 'Upload an image for all 10 options or switch back to text options.';
			return;
		}

		// Serialize correct answers for colors
		const finalAnswers = type === 'colors'
			? correctAnswers.map((ca, i) => ({
					text: (typeof ca === 'object' ? ca?.text : ca) ?? '',
					backgroundColor: colorToBg(i),
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
						option_image_alt: m.option_image_alt || options[i] || '',
					}
				: {}),
		}));

		const payload = {
			deck_id: deckId,
			type,
			question_text: questionText.trim(),
			question_number: questionNumber !== '' ? Number(questionNumber) : null,
			options_json: options,
			correct_answers_json: finalAnswers,
			answer_media_json: finalMedia,
		};

		saving = true;
		try {
			if (isEdit && id) {
				const { error: err } = await supabase.from('questions').update(payload).eq('id', id);
				if (err) throw err;
			} else {
				const { error: err } = await supabase.from('questions').insert(payload);
				if (err) throw err;
			}
			goto('/admin/questions');
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save.';
			saving = false;
		}
	}

	/**
	 * @param {number} index
	 * @param {Event} event
	 */
	async function handleOptionImageFile(index, event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (!supabase) {
			error = 'Supabase is not configured.';
			return;
		}

		error = '';
		imageUploading[index] = true;
		try {
			const blob = await resizeOptionImage(file);
			const path = buildOptionImagePath(index);
			const { error: uploadError } = await supabase.storage
				.from(OPTION_IMAGE_BUCKET)
				.upload(path, blob, {
					cacheControl: '31536000',
					contentType: 'image/webp',
					upsert: true,
				});
			if (uploadError) throw uploadError;

			const { data } = supabase.storage.from(OPTION_IMAGE_BUCKET).getPublicUrl(path);
			media[index] = {
				...media[index],
				option_image_url: data.publicUrl,
				option_image_path: path,
				option_image_alt: options[index] ?? '',
			};
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
	}

	/** @param {number} index */
	function buildOptionImagePath(index) {
		const questionKey = id ?? draftMediaId;
		return `questions/${questionKey}/options/${index + 1}-${Date.now()}.webp`;
	}

	/** Swap slot `a` with `b` so labels, answers, colors, and media move together. */
	function swapOptionSlots(/** @type {number} */ a, /** @type {number} */ b) {
		if (a === b || a < 0 || b < 0 || a >= NUM_BLOBS || b >= NUM_BLOBS) return;
		const swap = (/** @type {any[]} */ arr) => {
			const next = [...arr];
			[next[a], next[b]] = [next[b], next[a]];
			return next;
		};
		options = swap(options);
		correctAnswers = swap(correctAnswers);
		colorHsl = swap(colorHsl);
		media = swap(media);
		imageUploading = swap(imageUploading);
	}

	/** @param {File|Blob} file */
	function resizeOptionImage(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				const scale = Math.min(1, OPTION_IMAGE_MAX_SIZE / Math.max(image.width, image.height));
				const canvas = document.createElement('canvas');
				canvas.width = Math.max(1, Math.round(image.width * scale));
				canvas.height = Math.max(1, Math.round(image.height * scale));
				const context = canvas.getContext('2d');
				if (!context) {
					URL.revokeObjectURL(url);
					reject(new Error('Could not prepare image.'));
					return;
				}
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(
					(blob) => {
						URL.revokeObjectURL(url);
						if (blob) resolve(blob);
						else reject(new Error('Could not compress image.'));
					},
					'image/webp',
					OPTION_IMAGE_QUALITY,
				);
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Could not read image.'));
			};
			image.src = url;
		});
	}

	const TYPE_OPTIONS = [
		{ value: 'standard', label: 'Standard' },
		{ value: 'boolean', label: 'Boolean (Yes / No)' },
		{ value: 'rank', label: 'Rank (1–10)' },
		{ value: 'chooseBetween', label: 'Choose between' },
		{ value: 'colors', label: 'Colors' },
		{ value: 'numbers', label: 'Numbers' },
		{ value: 'centuryDecade', label: 'Century / Decade' },
	];

	const SHY = '­';
	const LONG_WORD_THRESHOLD = 11;

	/** @param {string} wordText */
	function parseWordChars(wordText) {
		/** @type {string[]} */
		const chars = [];
		/** @type {Record<number, true>} */
		const shyAfter = {};
		for (const c of wordText) {
			if (c === SHY) {
				if (chars.length > 0) shyAfter[chars.length - 1] = true;
			} else {
				chars.push(c);
			}
		}
		return { chars, shyAfter };
	}

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
		const { chars, shyAfter } = parseWordChars(wordText);
		if (shyAfter[charIndex]) delete shyAfter[charIndex];
		else shyAfter[charIndex] = true;
		let rebuilt = '';
		for (let i = 0; i < chars.length; i++) {
			rebuilt += chars[i];
			if (shyAfter[i]) rebuilt += SHY;
		}
		questionText = questionText.substring(0, offset) + rebuilt + questionText.substring(offset + wordText.length);
	}
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<a class="admin-back" href="/admin/questions">← Questions</a>
		<h1 class="admin-page__title">{isEdit ? 'Edit question' : 'New question'}</h1>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else}
		<form class="admin-form admin-form--wide" onsubmit={handleSubmit}>
			{#if error}<p class="admin-form-error">{error}</p>{/if}

			<div class="admin-form-row">
				<label class="admin-label">
					Deck *
					<select class="admin-select" bind:value={deckId} required disabled={saving}>
						<option value="">Choose a deck</option>
						{#each decks as deck (deck.id)}
							<option value={deck.id}>{deck.name}</option>
						{/each}
					</select>
				</label>
				<label class="admin-label">
					Type *
					<select class="admin-select" bind:value={type} disabled={saving}>
						{#each TYPE_OPTIONS as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="admin-label">
				Question text *
				<input class="admin-input" type="text" bind:value={questionText} required disabled={saving} placeholder="Write the question" />
			</label>

			{#if longWords.length > 0}
				<div class="shy-helper">
					<span class="shy-helper__hint">
						{longWords.some((w) => !w.text.includes(SHY))
							? 'Long words found — tap a letter to add a break after it'
							: 'Break points set'}
					</span>
					<div class="shy-helper__words">
						{#each longWords as word (word.offset)}
							{@const parsed = parseWordChars(word.text)}
							<div class="shy-helper__word" class:shy-helper__word--done={word.text.includes(SHY)}>
								{#each parsed.chars as char, i (i)}
									<button
										class="shy-helper__letter"
										class:shy-helper__letter--break={parsed.shyAfter[i]}
										type="button"
										onclick={() => toggleShy(word.offset, word.text, i)}
										disabled={saving}
									>{char}</button>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<label class="admin-label" style="max-width:200px">
				Question number
				<input class="admin-input" type="number" bind:value={questionNumber} disabled={saving} placeholder="Optional" />
			</label>

			<!-- Options + correct answers grid -->
			<div class="admin-label">
				Options &amp; correct answers
				<div class="admin-segmented">
					<label>
						<input type="radio" bind:group={optionDisplayMode} value="text" disabled={saving} />
						Text options
					</label>
					<label>
						<input type="radio" bind:group={optionDisplayMode} value="image" disabled={saving} />
						Image options
					</label>
				</div>
				<div class="admin-options">
					{#each options as _, i (i)}
						<div class="admin-option-row">
							<span class="admin-option-num">{i + 1}</span>
							<div class="admin-option-reorder">
								<button
									class="admin-btn admin-btn--sm admin-option-move"
									type="button"
									disabled={saving || i === 0}
									aria-label="Move option up"
									onclick={() => swapOptionSlots(i, i - 1)}
								>
									↑
								</button>
								<button
									class="admin-btn admin-btn--sm admin-option-move"
									type="button"
									disabled={saving || i === NUM_BLOBS - 1}
									aria-label="Move option down"
									onclick={() => swapOptionSlots(i, i + 1)}
								>
									↓
								</button>
							</div>

							<!-- Option label -->
							<input
								class="admin-input admin-option-label"
								type="text"
								bind:value={options[i]}
								placeholder="Option {i + 1}"
								required
								disabled={saving}
							/>

							{#if optionDisplayMode === 'image'}
								<div class="admin-option-image">
									{#if media[i].option_image_url}
										<img src={media[i].option_image_url} alt={options[i] || `Option ${i + 1}`} />
									{/if}
									<label class="admin-btn admin-btn--sm">
										{imageUploading[i] ? 'Uploading…' : media[i].option_image_url ? 'Replace image' : 'Upload image'}
										<input
											type="file"
											accept="image/*"
											onchange={(event) => handleOptionImageFile(i, event)}
											disabled={saving || imageUploading[i]}
										/>
									</label>
									{#if media[i].option_image_url}
										<button class="admin-btn admin-btn--sm" type="button" onclick={() => clearOptionImage(i)} disabled={saving || imageUploading[i]}>
											Clear
										</button>
									{/if}
								</div>
							{/if}

							<!-- Correct answer — type-specific -->
							{#if type === 'standard'}
								<input class="admin-input admin-option-answer" type="text" bind:value={correctAnswers[i]} placeholder="Correct answer" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].spotify_url} placeholder="Spotify URL" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].youtube_url} placeholder="YouTube URL" disabled={saving} />

							{:else if type === 'boolean'}
								<label class="admin-toggle-wrap">
									<input type="checkbox" bind:checked={correctAnswers[i]} disabled={saving} />
									<span class="admin-toggle" class:admin-toggle--on={correctAnswers[i]}>{correctAnswers[i] ? 'Yes' : 'No'}</span>
								</label>
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'rank'}
								<input class="admin-input admin-option-num-input" type="number" min="1" max="10" bind:value={correctAnswers[i]} placeholder="1–10" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'chooseBetween'}
								<input class="admin-input admin-option-answer" type="text" bind:value={correctAnswers[i]} placeholder="Correct choice" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'colors'}
								<div class="admin-color-picker">
									<label class="admin-color-swatch" style="background:{colorToBg(i)}" title="Pick color" aria-label="Open color picker">
										<input
											type="color"
											class="admin-color-picker-native"
											value={hslToHex(colorHsl[i].h, colorHsl[i].s, colorHsl[i].l)}
											oninput={(e) =>
												applyColorFromNativePicker(i, /** @type {HTMLInputElement} */ (e.currentTarget).value)}
											disabled={saving}
										/>
									</label>
									<label class="admin-color-slider">
										H
										<input type="range" min="0" max="360"
											value={colorHsl[i].h}
											oninput={(e) => { colorHsl[i].h = +/** @type {HTMLInputElement} */ (e.target).value; syncColorAnswer(i); }}
											disabled={saving}
										/>
										<span>{colorHsl[i].h}</span>
									</label>
									<label class="admin-color-slider">
										S
										<input type="range" min="0" max="100"
											value={colorHsl[i].s}
											oninput={(e) => { colorHsl[i].s = +/** @type {HTMLInputElement} */ (e.target).value; syncColorAnswer(i); }}
											disabled={saving}
										/>
										<span>{colorHsl[i].s}%</span>
									</label>
									<label class="admin-color-slider">
										L
										<input type="range" min="0" max="100"
											value={colorHsl[i].l}
											oninput={(e) => { colorHsl[i].l = +/** @type {HTMLInputElement} */ (e.target).value; syncColorAnswer(i); }}
											disabled={saving}
										/>
										<span>{colorHsl[i].l}%</span>
									</label>
								</div>
								<input
									class="admin-input admin-option-answer"
									type="text"
									value={typeof correctAnswers[i] === 'object' ? correctAnswers[i]?.text ?? '' : correctAnswers[i] ?? ''}
									oninput={(e) => setColorText(i, /** @type {HTMLInputElement} */ (e.target).value)}
									placeholder="Color label (e.g. 'röd')"
									disabled={saving}
								/>
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'numbers'}
								<input class="admin-input admin-option-num-input" type="text" bind:value={correctAnswers[i]} placeholder="Number" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'centuryDecade'}
								<input class="admin-input admin-option-answer" type="text" bind:value={correctAnswers[i]} placeholder="e.g. 1960" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="admin-form-actions">
				<button class="admin-btn admin-btn--primary" type="submit" disabled={saving}>
					{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create question'}
				</button>
				<a class="admin-btn" href="/admin/questions">Cancel</a>
			</div>
		</form>
	{/if}
</div>

<style>
	.shy-helper {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: -2px;
	}

	.shy-helper__hint {
		font-size: 12px;
		color: #d97706;
	}

	.shy-helper__words {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.shy-helper__word {
		display: inline-flex;
		align-items: center;
		background: #1a1a1a;
		border: 1px solid #d9770644;
		border-radius: 6px;
		padding: 2px 4px;
	}

	.shy-helper__word--done {
		border-color: #2a2a2a;
	}

	.shy-helper__letter {
		appearance: none;
		font-size: 15px;
		font-family: 'Berkeley Mono', ui-monospace, monospace;
		color: #ccc;
		line-height: 1;
		background: none;
		border: none;
		padding: 6px 2px;
		margin: 0;
		cursor: pointer;
		position: relative;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.shy-helper__letter::after {
		content: '';
		position: absolute;
		right: -1px;
		top: 4px;
		bottom: 4px;
		width: 2px;
		border-radius: 1px;
		background: transparent;
		transition: background-color 0.15s;
	}

	.shy-helper__letter:hover::after {
		background: #ffffff22;
	}

	.shy-helper__letter--break::after {
		background: #2563eb;
	}

	.shy-helper__letter--break:hover::after {
		background: #3b82f6;
	}

	.shy-helper__letter:last-child::after {
		display: none;
	}

	.shy-helper__letter:disabled {
		cursor: default;
		pointer-events: none;
	}
</style>
