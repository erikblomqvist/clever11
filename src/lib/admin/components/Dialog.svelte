<script>
	let {
		open = false,
		onclose,
		onconfirm,
		title = '',
		description = '',
		danger = false,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		children,
	} = $props();

	let dialogEl = $state(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleClose() {
		onclose?.();
	}

	function handleConfirm() {
		onconfirm?.();
	}

	function handleBackdropClick(e) {
		if (e.target === dialogEl) onclose?.();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="dialog"
	class:dialog--danger={danger}
	onclose={handleClose}
	onclick={handleBackdropClick}
>
	<div class="dialog__panel">
		<div class="dialog__header">
			<div class="dialog__icon">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="3" y="4" width="18" height="4" rx="1" /><path
						d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"
					/><path d="M10 12h4" />
				</svg>
			</div>
			<h2 class="dialog__title">{title}</h2>
			{#if description}
				<p class="dialog__description">{description}</p>
			{/if}
		</div>
		{#if children}
			<div class="dialog__body">
				{@render children()}
			</div>
		{/if}
		<div class="dialog__actions">
			<button
				class="dialog__btn dialog__btn--cancel"
				onclick={handleClose}>{cancelLabel}</button
			>
			<button
				class="dialog__btn"
				class:dialog__btn--primary={!danger}
				class:dialog__btn--danger={danger}
				onclick={handleConfirm}
			>
				{confirmLabel}
			</button>
		</div>
	</div>
</dialog>

<style>
	.dialog {
		overflow: visible;
		max-width: min(440px, calc(100% - 32px));
		padding: 0;

		color: var(--fg);
		background: transparent;
		border: 0;

		animation: pop var(--dur-pop) ease;
	}

	.dialog::backdrop {
		background: lch(3% 2 280 / 0.6);
		backdrop-filter: blur(4px);

		animation: fade-in var(--dur-fade-in) ease;
	}

	.dialog__panel {
		overflow: hidden;

		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-3);
		box-shadow: var(--shadow-pop);
	}

	.dialog__header {
		padding: 22px 24px 8px;
	}

	.dialog__icon {
		display: grid;
		width: 36px;
		height: 36px;
		margin-bottom: 12px;

		place-items: center;

		border: 1px solid var(--border-accent-2);
		border-radius: var(--r-2);
	}

	.dialog--danger .dialog__icon {
		color: var(--danger);
		background: var(--danger-soft);
		border-color: lch(63.3% 63.5 19 / 0.25);
	}

	.dialog:not(.dialog--danger) .dialog__icon {
		color: var(--accent-2);
		background: var(--accent-2-soft);
	}

	.dialog__title {
		margin: 0;

		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.dialog__description {
		margin: 6px 0 0;

		font-size: 13.5px;
		line-height: 1.55;

		color: var(--fg-mute);
	}

	.dialog__body {
		padding: 12px 24px;
	}

	.dialog__actions {
		display: flex;
		gap: 8px;
		padding: 18px 24px 20px;
		justify-content: flex-end;
	}

	.dialog__btn {
		display: inline-flex;
		align-items: center;
		height: var(--h-button);
		padding: 0 14px;

		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;

		border-radius: var(--r-2);

		transition:
			background 80ms ease,
			border-color 80ms ease;
	}

	.dialog__btn--cancel {
		color: var(--fg);
		background: transparent;
		border: 1px solid var(--border);
	}

	.dialog__btn--cancel:hover {
		background: var(--surface);
		border-color: var(--border-strong);
	}

	.dialog__btn--primary {
		font-weight: 600;

		color: var(--accent-fg);
		background: var(--accent);
		border: 1px solid transparent;
		box-shadow:
			0 0 0 1px lch(94.2% 90.2 115 / 0.25),
			0 8px 24px -8px lch(94.2% 90.2 115 / 0.35);
	}

	.dialog__btn--primary:hover {
		background: var(--accent-hover);
	}

	.dialog__btn--danger {
		font-weight: 600;

		color: lch(7.1% 8 19);
		background: var(--danger);
		border: 0;
	}

	.dialog__btn--danger:hover {
		background: lch(58% 63.5 19);
	}
</style>
