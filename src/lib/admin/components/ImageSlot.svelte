<script>
	import AdminIcon from './AdminIcon.svelte';

	let { src = '', uploading = false, onupload, onclear } = $props();

	let fileInput = $state(null);

	function handleClick() {
		fileInput?.click();
	}

	function handleFileChange(e) {
		onupload?.(e);
	}
</script>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	onchange={handleFileChange}
	class="image-slot__file-input"
	disabled={uploading}
/>

{#if src}
	<div class="image-slot image-slot--has-image">
		<img class="image-slot__preview" {src} alt="" />
		<div class="image-slot__actions">
			<button
				class="image-slot__btn"
				type="button"
				onclick={handleClick}
				disabled={uploading}
			>
				{uploading ? 'Uploading…' : 'Replace'}
			</button>
			<button
				class="image-slot__btn image-slot__btn--danger"
				type="button"
				onclick={() => onclear?.()}
				disabled={uploading}
			>
				Clear
			</button>
		</div>
	</div>
{:else}
	<button
		class="image-slot image-slot--empty"
		type="button"
		onclick={handleClick}
		disabled={uploading}
	>
		<AdminIcon name="import" size={15} />
		<span>{uploading ? 'Uploading…' : 'Upload image'}</span>
	</button>
{/if}

<style>
	.image-slot__file-input {
		display: none;
	}

	.image-slot--has-image {
		display: flex;
		align-items: center;

		gap: 12px;
	}

	.image-slot__preview {
		width: 72px;
		height: 72px;

		border: 1px solid var(--border);
		border-radius: var(--r-2);

		flex: 0 0 72px;
		object-fit: cover;
	}

	.image-slot__actions {
		display: flex;

		flex-direction: column;
		gap: 6px;
	}

	.image-slot__btn {
		height: 30px;
		padding: 0 10px;

		font-size: 0.75rem;

		color: var(--fg-mute);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		transition:
			background 80ms ease,
			color 80ms ease;
	}

	.image-slot__btn:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.image-slot__btn--danger {
		color: var(--danger);
	}

	.image-slot__btn--danger:hover {
		background: var(--danger-soft);
	}

	.image-slot__btn:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.image-slot--empty {
		display: flex;
		width: 100%;
		height: 64px;
		align-items: center;
		justify-content: center;

		font-size: 0.75rem;

		color: var(--fg-mute);
		background: transparent;
		border: 1px dashed var(--border-strong);
		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			border-color 80ms ease;

		gap: 10px;
	}

	.image-slot--empty:hover {
		background: var(--surface);
		border-color: var(--fg-faint);
	}

	.image-slot--empty:disabled {
		cursor: default;
		opacity: 0.5;
	}
</style>
