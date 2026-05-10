/**
 * Keeps a native dialog's modal state in sync with reactive state.
 *
 * @param {HTMLDialogElement | null} dialogEl
 * @param {boolean} open
 */
export function syncDialogOpen(dialogEl, open) {
	if (!dialogEl) return;
	if (open && !dialogEl.open) dialogEl.showModal();
	else if (!open && dialogEl.open) dialogEl.close();
}
