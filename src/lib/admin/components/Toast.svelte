<script>
	let toasts = $state([]);
	let nextId = 0;

	export function show(message, opts = {}) {
		const id = nextId++;
		const toast = {
			id,
			message,
			variant: opts.variant ?? 'simple',
			onundo: opts.onundo ?? null,
			progress: opts.progress ?? null,
			total: opts.total ?? null,
		};
		toasts.push(toast);

		const duration = opts.onundo ? 5000 : 2400;
		setTimeout(() => dismiss(id), duration);
	}

	function dismiss(id) {
		toasts = toasts.filter((t) => t.id !== id);
	}
</script>

{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as toast (toast.id)}
			<div
				class="toast"
				class:toast--undo={toast.onundo}
				class:toast--progress={toast.variant === 'progress'}
			>
				{#if toast.variant === 'progress' && toast.total}
					<div class="toast__bar">
						<div
							class="toast__bar-fill"
							style:width="{((toast.progress ?? 0) /
								toast.total) *
								100}%"
						></div>
					</div>
				{:else}
					<span class="toast__led"></span>
				{/if}
				<span class="toast__message">{toast.message}</span>
				{#if toast.onundo}
					<button
						class="toast__undo"
						onclick={() => {
							toast.onundo();
							dismiss(toast.id);
						}}>Undo</button
					>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		display: flex;
		position: fixed;
		bottom: 18px;
		left: 50%;
		z-index: 100;

		flex-direction: column;
		gap: 8px;

		transform: translateX(-50%);
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;

		font-size: 13px;
		white-space: nowrap;

		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);
		box-shadow: var(--shadow-pop);

		animation: fade-in var(--dur-fade-in) ease;
	}

	.toast__led {
		width: 6px;
		height: 6px;

		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0 6px var(--accent);
	}

	.toast__message {
		color: var(--fg);
	}

	.toast__undo {
		padding: 2px 8px;

		font-size: 12px;
		font-weight: 500;

		color: var(--accent);
		background: var(--accent-soft);
		border: 1px solid var(--border-accent);
		border-radius: var(--r-1);

		transition: background 80ms ease;
	}

	.toast__undo:hover {
		background: var(--accent-soft-2);
	}

	.toast__bar {
		overflow: hidden;
		width: 80px;
		height: 4px;

		background: var(--border);
		border-radius: 2px;
	}

	.toast__bar-fill {
		height: 100%;

		background: var(--accent);
		border-radius: 2px;

		transition: width 200ms ease;
	}
</style>
