<script>
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import { supabase } from '$lib/supabase.js';
	import { DECK_ICONS } from '$lib/deckIcons.js';
	import {
		validateImageFile,
		uploadDeckImage,
		deleteDeckImage,
	} from '$lib/storage.js';
	import { goto } from '$app/navigation';

	/** @type {{ id: string|null }} */
	let { id } = $props();

	const isEdit = $derived(id !== null);

	let name = $state('');
	let description = $state('');
	let icon = $state(/** @type {string|null} */ (null));
	let iconQuery = $state('');
	let currentImageUrl = $state(/** @type {string|null} */ (null));
	/** @type {File|null} */
	let imageFile = $state(null);
	let imagePreview = $state(/** @type {string|null} */ (null));
	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');

	/** @type {HTMLInputElement|null} */
	let fileInput = $state(null);

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

	$effect(() => {
		if (isEdit && id) loadDeck(id);
	});

	async function loadDeck(/** @type {string} */ deckId) {
		loading = true;
		const { data, error: err } = await supabase
			.from('decks')
			.select('*')
			.eq('id', deckId)
			.single();
		if (err) {
			error = 'Failed to load deck.';
			loading = false;
			return;
		}
		name = data.name;
		description = data.description ?? '';
		icon = data.icon ?? null;
		currentImageUrl = data.image_url ?? null;
		loading = false;
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
		if (fileInput) fileInput.value = '';
	}

	async function handleSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
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
					})
					.eq('id', id);
				if (err) throw err;
			} else {
				const { data: deck, error: insertErr } = await supabase
					.from('decks')
					.insert({
						name: name.trim(),
						description: description.trim() || null,
						icon: icon || null,
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
			}
			goto('/admin/decks');
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save deck.';
			saving = false;
		}
	}
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<a
			class="admin-back"
			href="/admin/decks">← Decks</a
		>
		<h1 class="admin-page__title">{isEdit ? 'Edit deck' : 'New deck'}</h1>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else}
		<form class="admin-form" onsubmit={handleSubmit}>
			{#if error}<p class="admin-form-error">{error}</p>{/if}

			<label class="admin-label">
				Name *
				<input
					class="admin-input"
					type="text"
					bind:value={name}
					required
					disabled={saving}
				/>
			</label>

			<label class="admin-label">
				Description
				<input
					class="admin-input"
					type="text"
					bind:value={description}
					disabled={saving}
					placeholder="Optional"
				/>
			</label>

			<!-- Icon picker -->
			<div class="admin-label">
				Icon
				<div class="admin-icon-picker-toolbar">
					<input
						class="admin-input admin-icon-search"
						type="search"
						bind:value={iconQuery}
						placeholder="Search all Lucide icons"
						disabled={saving}
					/>
					{#if icon}
						<button
							class="admin-btn admin-btn--sm"
							type="button"
							onclick={() => (icon = null)}
							disabled={saving}
						>
							Clear
						</button>
					{/if}
				</div>
				<div class="admin-icon-picker">
					{#each filteredDeckIcons as item (item.id)}
						<button
							type="button"
							class="admin-icon-btn"
							class:admin-icon-btn--active={icon === item.id}
							onclick={() =>
								(icon = icon === item.id ? null : item.id)}
							title={item.label}
							aria-pressed={icon === item.id}
							disabled={saving}
						>
							<LucideIcon
								name={item.id}
								iconNode={item.iconNode}
								size={20}
								aria-hidden="true"
							/>
						</button>
					{/each}
					{#if filteredDeckIcons.length === 0}
						<p class="admin-icon-picker__empty">
							No icons match "{iconQuery}".
						</p>
					{/if}
				</div>
			</div>

			<!-- Image upload -->
			<div class="admin-label">
				Image
				{#if currentImageUrl || imagePreview}
					<div class="admin-image-preview">
						<img
							src={imagePreview ?? currentImageUrl ?? ''}
							alt="Deck preview"
						/>
						<div class="admin-image-actions">
							<label class="admin-btn admin-btn--sm">
								Replace
								<input
									bind:this={fileInput}
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/webp"
									onchange={handleFileChange}
									disabled={saving}
									hidden
								/>
							</label>
							<button
								class="admin-btn admin-btn--sm admin-btn--danger"
								type="button"
								onclick={handleRemoveImage}
								disabled={saving}>Remove</button
							>
						</div>
					</div>
				{:else}
					<label class="admin-file-upload">
						<input
							bind:this={fileInput}
							type="file"
							accept="image/jpeg,image/jpg,image/png,image/webp"
							onchange={handleFileChange}
							disabled={saving}
							hidden
						/>
						<span>Click to upload (JPEG, PNG, WebP — max 5 MB)</span
						>
					</label>
				{/if}
			</div>

			<div class="admin-form-actions">
				<button
					class="admin-btn admin-btn--primary"
					type="submit"
					disabled={saving}
				>
					{saving
						? 'Saving…'
						: isEdit
							? 'Save changes'
							: 'Create deck'}
				</button>
				<a
					class="admin-btn"
					href="/admin/decks"
					style="text-decoration: none">Cancel</a
				>
			</div>
		</form>
	{/if}
</div>
