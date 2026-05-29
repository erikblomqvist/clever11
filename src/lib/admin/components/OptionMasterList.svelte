<script>
	import { hslToCss } from '$lib/utilities/color.js';

	/**
	 * @type {{
	 *   options: string[],
	 *   type: import('$lib/data/questionTypes.js').QuestionType,
	 *   correctAnswers: any[],
	 *   colorHsl: { h: number, s: number, l: number }[],
	 *   media: { option_image_url: string }[],
	 *   optionDisplayMode: 'text' | 'image',
	 *   focusedIndex: number,
	 *   onfocus: (index: number) => void,
	 *   onmove: (from: number, to: number) => void,
	 * }}
	 */
	let {
		options,
		type,
		correctAnswers,
		colorHsl,
		media,
		optionDisplayMode,
		focusedIndex,
		onfocus,
		onmove,
	} = $props();

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
</script>

<!-- Desktop master list -->
<div class="master">
	<div class="master__head">
		<span class="master__label upper">Options</span>
		<span class="master__count mono">10 / 10</span>
		<span class="master__spacer"></span>
		<span class="master__hint mono">↑ ↓</span>
	</div>
	<div class="master__list">
		{#each options as _, i (i)}
			{@const active = i === focusedIndex}
			{@const label = options[i]}
			{@const hasImage =
				optionDisplayMode === 'image' && media[i]?.option_image_url}
			{@const variant = chipVariant(type, correctAnswers[i])}
			{@const chipText = chipLabel(type, correctAnswers[i])}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="row"
				class:row--active={active}
				onclick={() => onfocus(i)}
			>
				{#if active}
					<span class="row__accent-bar"></span>
				{/if}
				<div class="row__handle">
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
				<div class="row__thumb" class:row__thumb--has-img={hasImage}>
					{#if hasImage}
						<img
							src={media[i].option_image_url}
							alt=""
							class="row__thumb-img"
						/>
					{:else}
						<span class="mono">{i + 1}</span>
					{/if}
				</div>
				<div class="row__body">
					<span class="row__label" class:row__label--empty={!label}>
						{label || `Option ${i + 1}`}
					</span>
					{#if type === 'colors' && correctAnswers[i]}
						{@const bg = hslToCss(
							colorHsl[i].h,
							colorHsl[i].s,
							colorHsl[i].l,
						)}
						<span class="row__chip row__chip--color">
							<span
								class="row__color-dot"
								style="background: {bg}"
							></span>
							{chipText || `hsl(${colorHsl[i].h}°)`}
						</span>
					{:else if chipText}
						<span class="row__chip row__chip--{variant}">
							{chipText}
						</span>
					{/if}
				</div>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="row__arrows" onclick={(e) => e.stopPropagation()}>
					<button
						class="row__arrow-btn"
						type="button"
						disabled={i === 0}
						onclick={() => onmove(i, i - 1)}
						aria-label="Move up"
					>
						<svg
							width="8"
							height="6"
							viewBox="0 0 8 6"
							fill="currentColor"><path d="M4 0l4 6H0z" /></svg
						>
					</button>
					<button
						class="row__arrow-btn"
						type="button"
						disabled={i === 9}
						onclick={() => onmove(i, i + 1)}
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
<div class="chips">
	<span class="chips__label upper">Options</span>
	{#each options as _, i (i)}
		{@const active = i === focusedIndex}
		<button
			class="chip"
			class:chip--active={active}
			type="button"
			onclick={() => onfocus(i)}
		>
			<span class="chip__num mono">{i + 1}</span>
			<span class="chip__label">
				{options[i] || `Option ${i + 1}`}
			</span>
		</button>
	{/each}
</div>

<style>
	/* ─── Desktop master list ──────────────────────────────────── */

	.master {
		display: flex;
		width: 320px;

		background: var(--bg-2);
		border-right: 1px solid var(--border);

		flex: 0 0 320px;
		flex-direction: column;
	}

	.master__head {
		display: flex;
		padding: 12px 12px 12px 16px;
		align-items: center;

		border-bottom: 1px solid var(--border);

		gap: 8px;
	}

	.master__label {
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
	}

	.master__count {
		font-size: 0.6875rem;

		color: var(--fg-faint);
	}

	.master__spacer {
		flex: 1;
	}

	.master__hint {
		font-size: 0.625rem;

		color: var(--fg-faint);
	}

	.master__list {
		overflow-y: auto;
		min-height: 0;

		flex: 1;
	}

	/* ─── Row ──────────────────────────────────────────────────── */

	.row {
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

	.row:first-child {
		border-top: none;
	}

	.row:hover {
		background: var(--surface);
	}

	.row--active {
		background: var(--surface-2);
	}

	.row--active:hover {
		background: var(--surface-2);
	}

	.row__accent-bar {
		position: absolute;
		top: 8px;
		bottom: 8px;
		left: 0;
		width: 2px;

		background: var(--accent);
	}

	.row__handle {
		display: flex;
		align-items: center;
		justify-content: center;

		color: var(--fg-faint);
	}

	.row__thumb {
		display: grid;
		width: 32px;
		height: 32px;

		font-size: 0.75rem;

		color: var(--fg-mute);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.row__thumb--has-img {
		overflow: hidden;
		padding: 0;

		background: none;
	}

	.row__thumb-img {
		width: 100%;
		height: 100%;

		object-fit: cover;
	}

	.row__body {
		display: flex;
		min-width: 0;

		flex-direction: column;
		gap: 2px;
	}

	.row__label {
		overflow: hidden;

		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.row__label--empty {
		color: var(--fg-faint);
	}

	.row__chip {
		display: inline-flex;
		width: fit-content;
		max-width: 200px;
		height: 16px;
		padding: 0 6px;
		align-items: center;

		font-family: var(--font-mono);
		font-size: 0.625rem;
		letter-spacing: 0.04em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.row__chip--mute {
		color: var(--fg-faint);
	}

	.row__chip--ok {
		color: var(--ok);
		background: var(--ok-soft);
		border-color: var(--ok-soft-2);
	}

	.row__chip--danger {
		color: var(--danger);
		background: var(--danger-soft);
		border-color: var(--danger-soft-2);
	}

	.row__chip--accent {
		color: var(--accent);
		background: var(--accent-soft);
		border-color: var(--border-accent);
	}

	.row__chip--info {
		color: var(--info);
		background: var(--info-soft);
		border-color: var(--info-soft-2);
	}

	.row__chip--default {
		color: var(--fg-mute);
	}

	.row__chip--color {
		display: inline-flex;
		align-items: center;

		font-family: var(--font-mono);
		font-size: 0.625rem;

		color: var(--fg-mute);
		border: none;

		gap: 4px;
	}

	.row__color-dot {
		width: 10px;
		height: 10px;

		border: 1px solid var(--border);
		border-radius: 2px;

		flex: 0 0 10px;
	}

	.row__arrows {
		display: flex;

		flex-direction: column;
		gap: 2px;
	}

	.row__arrow-btn {
		display: grid;
		width: 18px;
		height: 16px;

		color: var(--fg-faint);
		border-radius: 2px;

		place-items: center;
	}

	.row__arrow-btn:hover:not(:disabled) {
		color: var(--fg-mute);
	}

	.row__arrow-btn:disabled {
		color: var(--fg-disabled);
		cursor: not-allowed;
	}

	/* ─── Mobile chip strip ────────────────────────────────────── */

	.chips {
		display: none;
	}

	.chips__label {
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.06em;

		color: var(--fg-mute);

		flex: 0 0 auto;
	}

	.chip {
		display: inline-flex;
		height: 38px;
		padding: 0 12px;
		align-items: center;

		font-size: 0.75rem;

		color: var(--fg-mute);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 100px;

		flex: 0 0 auto;
		gap: 6px;
	}

	.chip--active {
		color: var(--fg);
		background: var(--surface-2);
		border-color: var(--border-strong);
	}

	.chip__num {
		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	.chip--active .chip__num {
		color: var(--accent);
	}

	.chip__label {
		overflow: hidden;
		max-width: 90px;

		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.master {
			display: none;
		}

		.chips {
			display: flex;
			padding: 8px 16px;
			align-items: center;
			overflow-x: auto;
			flex: 1 0 50px;

			background: var(--bg-2);
			border-bottom: 1px solid var(--border);

			gap: 6px;
		}
	}
</style>
