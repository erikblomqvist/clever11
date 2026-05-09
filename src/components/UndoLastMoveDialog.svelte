<script>
	import { _ } from 'svelte-i18n';
	import { syncDialogOpen } from '../../utilities/dialog.js';

	/**
	 * @type {{
	 *   open: boolean,
	 *   onconfirm: () => void,
	 *   oncancel: () => void,
	 * }}
	 */
	let { open, onconfirm, oncancel } = $props();

	/** @type {HTMLDialogElement | null} */
	let dialogEl = $state(null);

	$effect(() => {
		syncDialogOpen(dialogEl, open);
	});
</script>

<dialog
	bind:this={dialogEl}
	class="undo-dialog"
	onkeydown={(e) => e.key === 'Escape' && e.preventDefault()}
	onclick={(e) => e.stopPropagation()}
>
	<p class="undo-dialog__prompt">{$_('undo_dialog.prompt')}</p>

	<div class="undo-dialog__actions">
		<button
			class="undo-dialog__btn undo-dialog__btn--confirm"
			type="button"
			onclick={onconfirm}
		>
			{$_('undo_dialog.yes')}
		</button>
		<button
			class="undo-dialog__btn undo-dialog__btn--cancel"
			type="button"
			onclick={oncancel}
		>
			{$_('undo_dialog.no')}
		</button>
	</div>
</dialog>

<style>
	.undo-dialog {
		border: 3px solid var(--orange-700);
		border-radius: 1rem;
		max-width: min(24rem, calc(100vw - 6rem));
		width: 100%;
		padding: 1.5rem;
		background-color: var(--white);
		color: var(--grayscale-900);
		box-shadow: 0 1rem 3rem hsl(0 0% 0% / 0.35);
		text-align: center;
	}

	.undo-dialog::backdrop {
		background-color: hsl(0 0% 0% / 0.4);
		backdrop-filter: blur(2px);
	}

	.undo-dialog__prompt {
		margin: 0 0 1.5rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 500;
		line-height: 1.2;
	}

	.undo-dialog__actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.undo-dialog__btn {
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.undo-dialog__btn--confirm {
		background-color: var(--orange-700);
		color: var(--white);
	}

	.undo-dialog__btn--confirm:hover {
		background-color: var(--orange-800);
	}

	.undo-dialog__btn--cancel {
		background-color: var(--grayscale-200);
		color: var(--grayscale-900);
	}

	.undo-dialog__btn--cancel:hover {
		background-color: var(--grayscale-300);
	}
</style>
