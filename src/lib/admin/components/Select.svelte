<script>
	let {
		label = '',
		value = null,
		options = [],
		onchange,
		allowClear = false,
	} = $props();

	let open = $state(false);
	let triggerEl = $state(null);

	let current = $derived(options.find((o) => o.value === value));
	let isAll = $derived(value === null || value === undefined || value === '');

	function pick(val) {
		onchange?.(val);
		open = false;
	}

	function handleClear(e) {
		e.stopPropagation();
		onchange?.(null);
	}
</script>

<div class="select">
	<button
		bind:this={triggerEl}
		class="select__trigger"
		onclick={() => (open = !open)}
	>
		{#if label}
			<span class="select__label">{label}</span>
		{/if}
		<span class="select__value" class:select__value--placeholder={isAll}>
			{current ? current.label : 'All'}
		</span>
		<svg
			class="select__caret"
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="m9 6 6 6-6 6" />
		</svg>
	</button>
	{#if !isAll && allowClear}
		<button
			class="select__clear"
			aria-label="Clear selection"
			onclick={handleClear}
		>
			<svg
				width="11"
				height="11"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M6 6l12 12" /><path d="M18 6 6 18" />
			</svg>
		</button>
	{/if}

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
		<div class="select__backdrop" onclick={() => (open = false)}></div>
		<div class="select__dropdown">
			{#if allowClear}
				<button
					class="select__option"
					class:select__option--active={isAll}
					onclick={() => pick(null)}
				>
					All
				</button>
			{/if}
			{#each options as opt (opt.value)}
				<button
					class="select__option"
					class:select__option--active={opt.value === value}
					onclick={() => pick(opt.value)}
				>
					{#if opt.swatch}
						<span
							class="select__swatch"
							style:background={opt.swatch}
						></span>
					{/if}
					<span class="select__option-label">{opt.label}</span>
					{#if opt.hint}
						<span class="select__option-hint">{opt.hint}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.select {
		position: relative;
	}

	.select__trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: var(--h-button);
		min-width: 140px;
		padding: 0 10px 0 12px;

		font-size: 13px;

		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition: border-color 80ms ease;
	}

	.select__trigger:hover {
		border-color: var(--border-strong);
	}

	.select__label {
		font-size: 12px;

		color: var(--fg-faint);
	}

	.select__value {
		flex: 1;

		text-align: left;
	}

	.select__value--placeholder {
		color: var(--fg-mute);
	}

	.select__clear {
		display: grid;
		position: absolute;
		top: 50%;
		right: 26px;
		z-index: 1;
		width: 18px;
		height: 18px;

		place-items: center;

		color: var(--fg-faint);
		border-radius: 3px;

		transform: translateY(-50%);
		transition:
			background 80ms ease,
			color 80ms ease;
	}

	.select__clear:hover {
		color: var(--fg);
		background: var(--surface-hover);
	}

	.select__caret {
		color: var(--fg-faint);

		opacity: 0.8;
		transform: rotate(90deg);
	}

	.select__backdrop {
		position: fixed;
		inset: 0;
		z-index: 29;
	}

	.select__dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 30;
		overflow: auto;
		min-width: 100%;
		max-height: 280px;
		padding: 4px;

		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);
		box-shadow: var(--shadow-pop);

		animation: pop 100ms ease;
	}

	.select__option {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;

		font-size: 13px;
		text-align: left;

		color: var(--fg);
		border-radius: var(--r-1);

		transition: background 80ms ease;
	}

	.select__option:hover {
		background: var(--surface-2);
	}

	.select__option--active {
		background: var(--surface-2);
	}

	.select__option-label {
		flex: 1;
	}

	.select__option-hint {
		font-size: 11.5px;

		color: var(--fg-faint);
	}

	.select__swatch {
		width: 8px;
		height: 8px;

		border-radius: 2px;
	}
</style>
