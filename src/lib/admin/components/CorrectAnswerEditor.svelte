<script>
	import { hslToHex, hslToCss, hexToHsl } from '$lib/utilities/color.js';
	import LabelledField from './LabelledField.svelte';

	/**
	 * @type {{
	 *   type: import('$lib/data/questionTypes.js').QuestionType,
	 *   value: any,
	 *   hsl: { h: number, s: number, l: number },
	 *   allAnswers: any[],
	 *   focusedIndex: number,
	 *   disabled?: boolean,
	 *   onchange: (value: any) => void,
	 *   onhslchange: (hsl: { h: number, s: number, l: number }) => void,
	 * }}
	 */
	let {
		type,
		value,
		hsl,
		allAnswers,
		focusedIndex,
		disabled = false,
		onchange,
		onhslchange,
	} = $props();

	/** @param {string} t */
	function hint(t) {
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
	function placeholder(t) {
		const placeholders = {
			standard: 'e.g. Sverige',
			chooseBetween: 'e.g. Star Wars',
			centuryDecade: 'e.g. 1980-talet',
		};
		return placeholders[t] ?? 'Correct answer';
	}

	function colorCss() {
		return hslToCss(hsl.h, hsl.s, hsl.l);
	}

	/** @param {string} hex */
	function applyFromNativePicker(hex) {
		const parsed = hexToHsl(hex);
		onhslchange(parsed);
		const text =
			typeof value === 'object' ? (value?.text ?? '') : (value ?? '');
		onchange({
			text,
			backgroundColor: hslToCss(parsed.h, parsed.s, parsed.l),
		});
	}

	/** @param {string} key @param {number} val */
	function updateSlider(key, val) {
		const next = { ...hsl, [key]: val };
		onhslchange(next);
		const text =
			typeof value === 'object' ? (value?.text ?? '') : (value ?? '');
		onchange({ text, backgroundColor: hslToCss(next.h, next.s, next.l) });
	}

	/** @param {string} text */
	function setColorText(text) {
		onchange({ text, backgroundColor: colorCss() });
	}
</script>

<LabelledField label="Correct answer" hint={hint(type)}>
	{#if type === 'standard' || type === 'chooseBetween' || type === 'centuryDecade'}
		<input
			class="ca-input"
			type="text"
			{value}
			oninput={(e) =>
				onchange(
					/** @type {HTMLInputElement} */ (e.currentTarget).value,
				)}
			placeholder={placeholder(type)}
			{disabled}
		/>
	{:else if type === 'boolean'}
		<div class="bool-field">
			{#each [{ v: true, label: 'Yes', cls: 'ok' }, { v: false, label: 'No', cls: 'danger' }] as opt (opt.label)}
				<button
					class="bool-btn"
					class:bool-btn--active={value === opt.v}
					class:bool-btn--ok={opt.cls === 'ok' && value === opt.v}
					class:bool-btn--danger={opt.cls === 'danger' &&
						value === opt.v}
					type="button"
					onclick={() => onchange(opt.v)}
					{disabled}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	{:else if type === 'rank'}
		{@const usedRanks = allAnswers
			.map((r, ri) => (ri !== focusedIndex ? Number(r) : null))
			.filter((r) => r != null && r > 0)}
		<div class="rank-field">
			<div class="rank-grid">
				{#each Array(10) as _, ri (ri)}
					{@const n = ri + 1}
					{@const taken = usedRanks.includes(n)}
					{@const selected = Number(value) === n}
					<button
						class="rank-btn"
						class:rank-btn--selected={selected}
						class:rank-btn--taken={taken && !selected}
						type="button"
						disabled={(taken && !selected) || disabled}
						onclick={() => onchange(selected ? 0 : n)}
						title={taken && !selected
							? `Used by option ${allAnswers.findIndex((r, idx) => idx !== focusedIndex && Number(r) === n) + 1}`
							: ''}
					>
						<span class="mono">{n}</span>
					</button>
				{/each}
			</div>
			<span class="rank-hint"
				>All 10 options must form a complete permutation.</span
			>
		</div>
	{:else if type === 'colors'}
		{@const css = colorCss()}
		<div class="color-field">
			<div class="color-top">
				<label class="color-swatch" style="background: {css}">
					<input
						type="color"
						class="color-native"
						value={hslToHex(hsl.h, hsl.s, hsl.l)}
						oninput={(e) =>
							applyFromNativePicker(
								/** @type {HTMLInputElement} */ (
									e.currentTarget
								).value,
							)}
						{disabled}
					/>
				</label>
				<div class="color-sliders">
					{#each [{ key: 'h', label: 'H', min: 0, max: 360, suffix: '°', track: `linear-gradient(90deg, hsl(0 ${hsl.s}% ${hsl.l}%), hsl(60 ${hsl.s}% ${hsl.l}%), hsl(120 ${hsl.s}% ${hsl.l}%), hsl(180 ${hsl.s}% ${hsl.l}%), hsl(240 ${hsl.s}% ${hsl.l}%), hsl(300 ${hsl.s}% ${hsl.l}%), hsl(360 ${hsl.s}% ${hsl.l}%))` }, { key: 's', label: 'S', min: 0, max: 100, suffix: '%', track: `linear-gradient(90deg, hsl(${hsl.h} 0% ${hsl.l}%), hsl(${hsl.h} 100% ${hsl.l}%))` }, { key: 'l', label: 'L', min: 0, max: 100, suffix: '%', track: `linear-gradient(90deg, hsl(${hsl.h} ${hsl.s}% 0%), hsl(${hsl.h} ${hsl.s}% 50%), hsl(${hsl.h} ${hsl.s}% 100%))` }] as slider (slider.key)}
						<div class="slider-row">
							<span class="slider-label mono">{slider.label}</span
							>
							<div class="slider-track-wrap">
								<div
									class="slider-track"
									style="background: {slider.track}"
								></div>
								<input
									type="range"
									class="slider-input"
									min={slider.min}
									max={slider.max}
									value={hsl[slider.key]}
									oninput={(e) =>
										updateSlider(
											slider.key,
											+(
												/** @type {HTMLInputElement} */ (
													e.target
												).value
											),
										)}
									{disabled}
								/>
								<div
									class="slider-thumb"
									style="left: calc({((hsl[slider.key] -
										slider.min) /
										(slider.max - slider.min)) *
										100}% - 7px)"
								></div>
							</div>
							<span class="slider-value mono"
								>{hsl[slider.key]}{slider.suffix}</span
							>
						</div>
					{/each}
				</div>
			</div>
			<LabelledField label="Color label" hint="Shown to players">
				<input
					class="ca-input"
					type="text"
					value={typeof value === 'object'
						? (value?.text ?? '')
						: (value ?? '')}
					oninput={(e) =>
						setColorText(
							/** @type {HTMLInputElement} */ (e.target).value,
						)}
					placeholder="e.g. Sky blue"
					{disabled}
				/>
			</LabelledField>
		</div>
	{:else if type === 'numbers'}
		<input
			class="ca-input"
			type="number"
			{value}
			oninput={(e) =>
				onchange(
					+(/** @type {HTMLInputElement} */ (e.currentTarget).value),
				)}
			placeholder="Number for this option"
			{disabled}
		/>
	{/if}
</LabelledField>

<style>
	.ca-input {
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

	.ca-input:focus {
		border-color: var(--border-strong);
	}

	.ca-input::placeholder {
		color: var(--fg-faint);
	}

	.ca-input:disabled {
		opacity: 0.5;
	}

	/* ─── Boolean ───────────────────────────────────────────────── */

	.bool-field {
		display: flex;

		gap: 8px;
	}

	.bool-btn {
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

	.bool-btn--active {
		color: var(--fg);
		background: var(--surface-2);
		border-color: var(--border-strong);
	}

	.bool-btn--ok {
		border-left: 3px solid var(--ok);
	}

	.bool-btn--danger {
		border-left: 3px solid var(--danger);
	}

	/* ─── Rank ──────────────────────────────────────────────────── */

	.rank-grid {
		display: flex;

		flex-wrap: wrap;
		gap: 4px;
	}

	.rank-btn {
		display: grid;
		width: 34px;
		height: 34px;

		font-weight: 600;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-1);

		place-items: center;
	}

	.rank-btn:hover:not(:disabled) {
		background: var(--surface-2);
	}

	.rank-btn--selected {
		color: var(--accent-fg);
		background: var(--accent);
		border-color: transparent;
	}

	.rank-btn--selected:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.rank-btn--taken {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.rank-hint {
		display: block;
		margin-top: 8px;

		font-size: 11.5px;

		color: var(--fg-faint);
	}

	/* ─── Color ─────────────────────────────────────────────────── */

	.color-field {
		display: flex;

		flex-direction: column;
		gap: 10px;
	}

	.color-top {
		display: flex;
		align-items: center;

		gap: 12px;
	}

	.color-swatch {
		display: block;
		width: 56px;
		height: 56px;

		border: 1px solid var(--border-strong);
		border-radius: var(--r-2);
		box-shadow: inset 0 0 0 1px lch(100% 0 0 / 0.04);
		cursor: pointer;

		flex: 0 0 56px;
	}

	.color-native {
		width: 0;
		height: 0;

		opacity: 0;
	}

	.color-sliders {
		display: flex;

		flex: 1;
		flex-direction: column;
		gap: 6px;
	}

	.slider-row {
		display: flex;
		align-items: center;

		gap: 10px;
	}

	.slider-label {
		width: 14px;

		font-size: 11px;

		color: var(--fg-faint);
	}

	.slider-track-wrap {
		display: flex;
		position: relative;
		height: 14px;
		align-items: center;

		flex: 1;
	}

	.slider-track {
		position: absolute;
		right: 0;
		left: 0;
		height: 6px;

		border: 1px solid var(--border);
		border-radius: 100px;
	}

	.slider-input {
		position: absolute;
		width: 100%;

		opacity: 0;
		cursor: pointer;

		inset: 0;
	}

	.slider-thumb {
		position: absolute;
		width: 14px;
		height: 14px;

		background: var(--fg);
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		box-shadow: 0 1px 3px lch(0% 0 0 / 0.6);

		pointer-events: none;
	}

	.slider-value {
		width: 36px;

		font-size: 11.5px;
		text-align: right;

		color: var(--fg-mute);
	}
</style>
