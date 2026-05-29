<script>
	import { untrack } from 'svelte';
	import { supabase } from '$lib/supabase.js';
	import { goto } from '$app/navigation';
	import { logActivity } from './activityLog.js';
	import AdminIcon from './components/AdminIcon.svelte';
	import Select from './components/Select.svelte';
	import LabelledField from './components/LabelledField.svelte';
	import ImageSlot from './components/ImageSlot.svelte';
	import UrlsBlock from './components/UrlsBlock.svelte';
	import SoftHyphenHelper from './components/SoftHyphenHelper.svelte';
	import Dialog from './components/Dialog.svelte';

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

	// --- Color helpers ---
	/** @param {number} h @param {number} s @param {number} l */
	function hslToRgb(h, s, l) {
		h /= 360;
		s /= 100;
		l /= 100;
		if (s === 0) {
			const v = Math.round(l * 255);
			return [v, v, v];
		}
		const hue2rgb = (
			/** @type {number} */ p,
			/** @type {number} */ q,
			/** @type {number} */ t,
		) => {
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
		return {
			h: Math.round(h * 360),
			s: Math.round(s * 100),
			l: Math.round(l * 100),
		};
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
		dirty = true;
	}

	/** @param {number} i */
	function syncColorAnswer(i) {
		const text =
			typeof correctAnswers[i] === 'object'
				? (correctAnswers[i]?.text ?? '')
				: (correctAnswers[i] ?? '');
		const backgroundColor = colorToBg(i);
		correctAnswers[i] = { text, backgroundColor };
	}

	/** @param {number} i @param {string} text */
	function setColorText(i, text) {
		correctAnswers[i] = { text, backgroundColor: colorToBg(i) };
		dirty = true;
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

			const { data } = supabase.storage
				.from(OPTION_IMAGE_BUCKET)
				.getPublicUrl(path);
			media[index] = {
				...media[index],
				option_image_url: data.publicUrl,
				option_image_path: path,
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

	/** @param {number} index */
	function buildOptionImagePath(index) {
		const questionKey = id ?? draftMediaId;
		return `questions/${questionKey}/options/${index + 1}-${Date.now()}.webp`;
	}

	/** @param {File|Blob} file */
	function resizeOptionImage(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				const scale = Math.min(
					1,
					OPTION_IMAGE_MAX_SIZE / Math.max(image.width, image.height),
				);
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

	// --- Correct answer chip for master list ---
	/** @param {string} questionType @param {any} value */
	function chipLabel(questionType, value) {
		if (questionType === 'boolean') {
			return value === true ? 'YES' : value === false ? 'NO' : '—';
		}
		if (questionType === 'rank') {
			return value != null && value !== 0 ? `#${value}` : '—';
		}
		if (questionType === 'colors') {
			if (!value) return null;
			const label =
				typeof value === 'object' ? value?.label || value?.text : null;
			return label || null;
		}
		if (questionType === 'numbers') {
			return value != null && value !== 0 ? `= ${value}` : '—';
		}
		const str =
			typeof value === 'object'
				? (value?.text ?? '')
				: String(value ?? '');
		if (!str) return '—';
		return str.length > 16 ? `→ ${str.slice(0, 14)}…` : `→ ${str}`;
	}

	/** @param {string} questionType @param {any} value */
	function chipVariant(questionType, value) {
		if (questionType === 'boolean')
			return value === true ? 'ok' : value === false ? 'danger' : 'mute';
		if (questionType === 'rank') return value ? 'accent' : 'mute';
		if (questionType === 'colors') return 'color';
		if (questionType === 'numbers')
			return value != null && value !== 0 ? 'info' : 'mute';
		const str =
			typeof value === 'object'
				? (value?.text ?? '')
				: String(value ?? '');
		return str ? 'default' : 'mute';
	}

	/** @param {string} t */
	function correctAnswerHint(t) {
		const hints = {
			standard: 'Answer revealed for this option',
			chooseBetween: 'Which side of the comparison',
			centuryDecade: 'e.g. 1980-talet',
			rank: 'Each option needs a unique rank 1–10',
			boolean: 'Yes/no for this option',
			colors: 'HSL — used to score how close player guesses are',
			numbers: 'Exact number for this option',
		};
		return hints[t] ?? '';
	}

	/** @param {string} t */
	function answerPlaceholder(t) {
		const placeholders = {
			standard: 'e.g. Sverige',
			chooseBetween: 'e.g. Star Wars',
			centuryDecade: 'e.g. 1980-talet',
		};
		return placeholders[t] ?? 'Correct answer';
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
			<!-- Master list (desktop) -->
			<div class="editor__master">
				<div class="editor__master-head">
					<span class="editor__master-label upper">Options</span>
					<span class="editor__master-count mono">10 / 10</span>
					<span class="editor__spacer"></span>
					<span class="editor__master-hint mono">↑ ↓</span>
				</div>
				<div class="editor__master-list">
					{#each options as _, i (i)}
						{@const active = i === focusedIdx}
						{@const label = options[i]}
						{@const hasImage =
							optionDisplayMode === 'image' &&
							media[i]?.option_image_url}
						{@const variant = chipVariant(type, correctAnswers[i])}
						{@const chipText = chipLabel(type, correctAnswers[i])}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="master-row"
							class:master-row--active={active}
							onclick={() => {
								focusedIdx = i;
							}}
						>
							{#if active}
								<span class="master-row__accent-bar"></span>
							{/if}
							<div class="master-row__handle">
								<svg
									width="10"
									height="14"
									viewBox="0 0 10 14"
									fill="currentColor"
								>
									<circle cx="2" cy="3" r="1.1" /><circle
										cx="8"
										cy="3"
										r="1.1"
									/>
									<circle cx="2" cy="7" r="1.1" /><circle
										cx="8"
										cy="7"
										r="1.1"
									/>
									<circle cx="2" cy="11" r="1.1" /><circle
										cx="8"
										cy="11"
										r="1.1"
									/>
								</svg>
							</div>
							<div
								class="master-row__thumb"
								class:master-row__thumb--has-img={hasImage}
							>
								{#if hasImage}
									<img
										src={media[i].option_image_url}
										alt=""
										class="master-row__thumb-img"
									/>
								{:else}
									<span class="mono">{i + 1}</span>
								{/if}
							</div>
							<div class="master-row__body">
								<span
									class="master-row__label"
									class:master-row__label--empty={!label}
								>
									{label || `Option ${i + 1}`}
								</span>
								{#if type === 'colors' && correctAnswers[i]}
									{@const bg = colorToBg(i)}
									<span
										class="master-row__chip master-row__chip--color"
									>
										<span
											class="master-row__color-dot"
											style="background: {bg}"
										></span>
										{chipText || `hsl(${colorHsl[i].h}°)`}
									</span>
								{:else if chipText}
									<span
										class="master-row__chip master-row__chip--{variant}"
									>
										{chipText}
									</span>
								{/if}
							</div>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="master-row__arrows"
								onclick={(e) => e.stopPropagation()}
							>
								<button
									class="master-row__arrow-btn"
									type="button"
									disabled={i === 0}
									onclick={() => moveOption(i, i - 1)}
									aria-label="Move up"
								>
									<svg
										width="8"
										height="6"
										viewBox="0 0 8 6"
										fill="currentColor"
										><path d="M4 0l4 6H0z" /></svg
									>
								</button>
								<button
									class="master-row__arrow-btn"
									type="button"
									disabled={i === 9}
									onclick={() => moveOption(i, i + 1)}
									aria-label="Move down"
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
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Mobile chip strip -->
			<div class="editor__chips">
				<span class="editor__chips-label upper">Options</span>
				{#each options as _, i (i)}
					{@const active = i === focusedIdx}
					<button
						class="editor__chip"
						class:editor__chip--active={active}
						type="button"
						onclick={() => {
							focusedIdx = i;
						}}
					>
						<span class="editor__chip-num mono">{i + 1}</span>
						<span class="editor__chip-label">
							{options[i] || `Option ${i + 1}`}
						</span>
					</button>
				{/each}
			</div>

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

							<LabelledField
								label="Correct answer"
								hint={correctAnswerHint(type)}
							>
								<!-- Type-specific correct answer fields -->
								{#if type === 'standard' || type === 'chooseBetween' || type === 'centuryDecade'}
									<input
										class="editor__input"
										type="text"
										bind:value={correctAnswers[focusedIdx]}
										oninput={markDirty}
										placeholder={answerPlaceholder(type)}
										disabled={saving}
									/>
								{:else if type === 'boolean'}
									<div class="editor__bool-field">
										{#each [{ v: true, label: 'Yes', cls: 'ok' }, { v: false, label: 'No', cls: 'danger' }] as opt (opt.label)}
											<button
												class="editor__bool-btn"
												class:editor__bool-btn--active={correctAnswers[
													focusedIdx
												] === opt.v}
												class:editor__bool-btn--ok={opt.cls ===
													'ok' &&
													correctAnswers[
														focusedIdx
													] === opt.v}
												class:editor__bool-btn--danger={opt.cls ===
													'danger' &&
													correctAnswers[
														focusedIdx
													] === opt.v}
												type="button"
												onclick={() => {
													correctAnswers[focusedIdx] =
														opt.v;
													markDirty();
												}}
												disabled={saving}
											>
												{opt.label}
											</button>
										{/each}
									</div>
								{:else if type === 'rank'}
									{@const usedRanks = correctAnswers
										.map((r, ri) =>
											ri !== focusedIdx
												? Number(r)
												: null,
										)
										.filter((r) => r != null && r > 0)}
									<div class="editor__rank-field">
										<div class="editor__rank-grid">
											{#each Array(10) as _, ri (ri)}
												{@const n = ri + 1}
												{@const taken =
													usedRanks.includes(n)}
												{@const selected =
													Number(
														correctAnswers[
															focusedIdx
														],
													) === n}
												<button
													class="editor__rank-btn"
													class:editor__rank-btn--selected={selected}
													class:editor__rank-btn--taken={taken &&
														!selected}
													type="button"
													disabled={(taken &&
														!selected) ||
														saving}
													onclick={() => {
														correctAnswers[
															focusedIdx
														] = selected ? 0 : n;
														markDirty();
													}}
													title={taken && !selected
														? `Used by option ${correctAnswers.findIndex((r, idx) => idx !== focusedIdx && Number(r) === n) + 1}`
														: ''}
												>
													<span class="mono">{n}</span
													>
												</button>
											{/each}
										</div>
										<span class="editor__rank-hint"
											>All 10 options must form a complete
											permutation.</span
										>
									</div>
								{:else if type === 'colors'}
									{@const hsl = colorHsl[focusedIdx]}
									{@const css = colorToBg(focusedIdx)}
									<div class="editor__color-field">
										<div class="editor__color-top">
											<label
												class="editor__color-swatch"
												style="background: {css}"
											>
												<input
													type="color"
													class="editor__color-native"
													value={hslToHex(
														hsl.h,
														hsl.s,
														hsl.l,
													)}
													oninput={(e) =>
														applyColorFromNativePicker(
															focusedIdx,
															/** @type {HTMLInputElement} */ (
																e.currentTarget
															).value,
														)}
													disabled={saving}
												/>
											</label>
											<div class="editor__color-sliders">
												{#each [{ key: 'h', label: 'H', min: 0, max: 360, suffix: '°', track: `linear-gradient(90deg, hsl(0 ${hsl.s}% ${hsl.l}%), hsl(60 ${hsl.s}% ${hsl.l}%), hsl(120 ${hsl.s}% ${hsl.l}%), hsl(180 ${hsl.s}% ${hsl.l}%), hsl(240 ${hsl.s}% ${hsl.l}%), hsl(300 ${hsl.s}% ${hsl.l}%), hsl(360 ${hsl.s}% ${hsl.l}%))` }, { key: 's', label: 'S', min: 0, max: 100, suffix: '%', track: `linear-gradient(90deg, hsl(${hsl.h} 0% ${hsl.l}%), hsl(${hsl.h} 100% ${hsl.l}%))` }, { key: 'l', label: 'L', min: 0, max: 100, suffix: '%', track: `linear-gradient(90deg, hsl(${hsl.h} ${hsl.s}% 0%), hsl(${hsl.h} ${hsl.s}% 50%), hsl(${hsl.h} ${hsl.s}% 100%))` }] as slider (slider.key)}
													<div
														class="editor__slider-row"
													>
														<span
															class="editor__slider-label mono"
															>{slider.label}</span
														>
														<div
															class="editor__slider-track-wrap"
														>
															<div
																class="editor__slider-track"
																style="background: {slider.track}"
															></div>
															<input
																type="range"
																class="editor__slider-input"
																min={slider.min}
																max={slider.max}
																value={hsl[
																	slider.key
																]}
																oninput={(
																	e,
																) => {
																	colorHsl[
																		focusedIdx
																	][
																		slider.key
																	] = +(
																		/** @type {HTMLInputElement} */ (
																			e.target
																		).value
																	);
																	syncColorAnswer(
																		focusedIdx,
																	);
																	dirty = true;
																}}
																disabled={saving}
															/>
															<div
																class="editor__slider-thumb"
																style="left: calc({((hsl[
																	slider.key
																] -
																	slider.min) /
																	(slider.max -
																		slider.min)) *
																	100}% - 7px)"
															></div>
														</div>
														<span
															class="editor__slider-value mono"
															>{hsl[
																slider.key
															]}{slider.suffix}</span
														>
													</div>
												{/each}
											</div>
										</div>
										<LabelledField
											label="Color label"
											hint="Shown to players"
										>
											<input
												class="editor__input"
												type="text"
												value={typeof correctAnswers[
													focusedIdx
												] === 'object'
													? (correctAnswers[
															focusedIdx
														]?.text ?? '')
													: (correctAnswers[
															focusedIdx
														] ?? '')}
												oninput={(e) =>
													setColorText(
														focusedIdx,
														/** @type {HTMLInputElement} */ (
															e.target
														).value,
													)}
												placeholder="e.g. Sky blue"
												disabled={saving}
											/>
										</LabelledField>
									</div>
								{:else if type === 'numbers'}
									<input
										class="editor__input"
										type="number"
										bind:value={correctAnswers[focusedIdx]}
										oninput={markDirty}
										placeholder="Number for this option"
										disabled={saving}
									/>
								{/if}
							</LabelledField>

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

	/* ─── Master list ───────────────────────────────────────────── */

	.editor__master {
		display: flex;
		width: 320px;

		background: var(--bg-2);
		border-right: 1px solid var(--border);

		flex: 0 0 320px;
		flex-direction: column;
	}

	.editor__master-head {
		display: flex;
		padding: 12px 12px 12px 16px;
		align-items: center;

		border-bottom: 1px solid var(--border);

		gap: 8px;
	}

	.editor__master-label {
		font-size: 11.5px;
		font-weight: 500;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
	}

	.editor__master-count {
		font-size: 11.5px;

		color: var(--fg-faint);
	}

	.editor__master-hint {
		font-size: 10.5px;

		color: var(--fg-faint);
	}

	.editor__master-list {
		overflow-y: auto;
		min-height: 0;

		flex: 1;
	}

	/* Master row */

	.master-row {
		display: grid;
		position: relative;
		min-height: 48px;
		padding: 8px 12px 8px 8px;
		align-items: center;

		border-top: 1px solid var(--border);
		cursor: pointer;

		transition: background 80ms ease;

		grid-template-columns: 24px 32px 1fr auto;
		gap: 8px;
	}

	.master-row:first-child {
		border-top: none;
	}

	.master-row:hover {
		background: var(--surface);
	}

	.master-row--active {
		background: var(--surface-2);
	}

	.master-row--active:hover {
		background: var(--surface-2);
	}

	.master-row__accent-bar {
		position: absolute;
		top: 8px;
		bottom: 8px;
		left: 0;
		width: 2px;

		background: var(--accent);
	}

	.master-row__handle {
		display: flex;
		align-items: center;
		justify-content: center;

		color: var(--fg-faint);
	}

	.master-row__thumb {
		display: grid;
		width: 32px;
		height: 32px;

		font-size: 12px;

		color: var(--fg-mute);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.master-row__thumb--has-img {
		overflow: hidden;
		padding: 0;

		background: none;
	}

	.master-row__thumb-img {
		width: 100%;
		height: 100%;

		object-fit: cover;
	}

	.master-row__body {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 2px;
	}

	.master-row__label {
		overflow: hidden;

		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.master-row__label--empty {
		color: var(--fg-faint);
	}

	.master-row__chip {
		display: inline-flex;
		width: fit-content;
		max-width: 200px;
		height: 16px;
		padding: 0 6px;
		align-items: center;

		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.master-row__chip--mute {
		color: var(--fg-faint);
	}

	.master-row__chip--ok {
		color: var(--ok);
		background: var(--ok-soft);
		border-color: lch(86.6% 57.6 150 / 0.25);
	}

	.master-row__chip--danger {
		color: var(--danger);
		background: var(--danger-soft);
		border-color: lch(63.3% 63.5 19 / 0.25);
	}

	.master-row__chip--accent {
		color: var(--accent);
		background: var(--accent-soft);
		border-color: var(--border-accent);
	}

	.master-row__chip--info {
		color: var(--info);
		background: var(--info-soft);
		border-color: lch(70.8% 45.3 266 / 0.25);
	}

	.master-row__chip--default {
		color: var(--fg-mute);
	}

	.master-row__chip--color {
		display: inline-flex;
		align-items: center;

		font-family: var(--font-mono);
		font-size: 10.5px;

		color: var(--fg-mute);
		border: none;

		gap: 4px;
	}

	.master-row__color-dot {
		width: 10px;
		height: 10px;

		border: 1px solid var(--border);
		border-radius: 2px;

		flex: 0 0 10px;
	}

	.master-row__arrows {
		display: flex;

		flex-direction: column;
		gap: 2px;
	}

	.master-row__arrow-btn {
		display: grid;
		width: 18px;
		height: 16px;

		color: var(--fg-faint);
		border-radius: 2px;

		place-items: center;
	}

	.master-row__arrow-btn:hover:not(:disabled) {
		color: var(--fg-mute);
	}

	.master-row__arrow-btn:disabled {
		color: var(--fg-disabled);
		cursor: not-allowed;
	}

	/* ─── Mobile chip strip ─────────────────────────────────────── */

	.editor__chips {
		display: none;
	}

	.editor__chips-label {
		font-size: 11.5px;
		font-weight: 500;
		letter-spacing: 0.06em;

		color: var(--fg-mute);

		flex: 0 0 auto;
	}

	.editor__chip {
		display: inline-flex;
		height: 38px;
		padding: 0 12px;
		align-items: center;

		font-size: 12.5px;

		color: var(--fg-mute);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 100px;

		flex: 0 0 auto;
		gap: 6px;
	}

	.editor__chip--active {
		color: var(--fg);
		background: var(--surface-2);
		border-color: var(--border-strong);
	}

	.editor__chip-num {
		font-size: 12px;

		color: var(--fg-mute);
	}

	.editor__chip--active .editor__chip-num {
		color: var(--accent);
	}

	.editor__chip-label {
		overflow: hidden;
		max-width: 90px;

		text-overflow: ellipsis;
		white-space: nowrap;
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

	/* ─── Boolean field ─────────────────────────────────────────── */

	.editor__bool-field {
		display: flex;

		gap: 8px;
	}

	.editor__bool-btn {
		display: inline-flex;
		height: 40px;
		align-items: center;
		justify-content: center;

		font-size: 13.5px;
		font-weight: 500;

		color: var(--fg-mute);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			border-color 80ms ease;

		flex: 1;
		gap: 8px;
	}

	.editor__bool-btn--active {
		color: var(--fg);
		background: var(--surface-2);
		border-color: var(--border-strong);
	}

	.editor__bool-btn--ok {
		border-left: 3px solid var(--ok);
	}

	.editor__bool-btn--danger {
		border-left: 3px solid var(--danger);
	}

	/* ─── Rank field ────────────────────────────────────────────── */

	.editor__rank-grid {
		display: flex;

		flex-wrap: wrap;
		gap: 4px;
	}

	.editor__rank-btn {
		display: grid;
		width: 34px;
		height: 34px;

		font-weight: 600;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.editor__rank-btn:hover:not(:disabled) {
		background: var(--surface-2);
	}

	.editor__rank-btn--selected {
		color: var(--accent-fg);
		background: var(--accent);
		border-color: transparent;
	}

	.editor__rank-btn--selected:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.editor__rank-btn--taken {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.editor__rank-hint {
		display: block;
		margin-top: 8px;

		font-size: 11.5px;

		color: var(--fg-faint);
	}

	/* ─── Color field ───────────────────────────────────────────── */

	.editor__color-field {
		display: flex;

		flex-direction: column;
		gap: 10px;
	}

	.editor__color-top {
		display: flex;
		align-items: center;

		gap: 12px;
	}

	.editor__color-swatch {
		display: block;
		width: 56px;
		height: 56px;

		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);
		box-shadow: inset 0 0 0 1px lch(100% 0 0 / 0.04);
		cursor: pointer;

		flex: 0 0 56px;
	}

	.editor__color-native {
		width: 0;
		height: 0;

		opacity: 0;
	}

	.editor__color-sliders {
		display: flex;

		flex: 1;
		flex-direction: column;
		gap: 6px;
	}

	.editor__slider-row {
		display: flex;
		align-items: center;

		gap: 10px;
	}

	.editor__slider-label {
		width: 14px;

		font-size: 11px;

		color: var(--fg-faint);
	}

	.editor__slider-track-wrap {
		display: flex;
		position: relative;
		height: 14px;
		align-items: center;

		flex: 1;
	}

	.editor__slider-track {
		position: absolute;
		right: 0;
		left: 0;
		height: 6px;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.editor__slider-input {
		position: absolute;
		width: 100%;

		opacity: 0;
		cursor: pointer;

		inset: 0;
	}

	.editor__slider-thumb {
		position: absolute;
		width: 14px;
		height: 14px;

		background: var(--fg);
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		box-shadow: 0 1px 3px lch(0% 0 0 / 0.6);

		pointer-events: none;
	}

	.editor__slider-value {
		width: 36px;

		font-size: 11.5px;
		text-align: right;

		color: var(--fg-mute);
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

		.editor__master {
			display: none;
		}

		.editor__chips {
			display: flex;
			padding: 8px 16px;
			align-items: center;
			overflow-x: auto;
			flex: 1 0 50px;

			background: var(--bg-2);
			border-bottom: 1px solid var(--border);

			gap: 6px;
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
