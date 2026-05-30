<script>
	/**
	 * @type {{
	 *   chars: string[],
	 *   shyAfter: Record<number, true>,
	 *   anchorX: number,
	 *   anchorY: number,
	 *   fingerX: number,
	 *   previewIndex: number | null,
	 *   canceling?: boolean,
	 *   onPreview: (index: number) => void,
	 * }}
	 */
	let {
		chars,
		shyAfter,
		anchorX,
		anchorY,
		fingerX,
		previewIndex,
		canceling = false,
		onPreview,
	} = $props();

	/** @type {HTMLElement[]} */
	const gapEls = [];

	/** The transformed container; measured to keep the strip on-screen. */
	let rootEl = $state(/** @type {HTMLElement | null} */ (null));
	/** Horizontal center after clamping the press point to the viewport. */
	let left = $state(anchorX);
	/** Flip below the press point when there is no room above. */
	let placeBelow = $state(false);

	$effect(() => {
		anchorX;
		anchorY;
		const el = rootEl;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const margin = 8;
		const vw = window.innerWidth;
		const half = rect.width / 2;
		if (rect.width + margin * 2 >= vw) {
			left = vw / 2;
		} else {
			left = Math.min(
				Math.max(anchorX, margin + half),
				vw - margin - half,
			);
		}
		const rem =
			parseFloat(getComputedStyle(document.documentElement).fontSize) ||
			16;
		placeBelow = anchorY - rect.height - 3.25 * rem < margin;
	});

	/** @param {number} index */
	function gapTarget(index) {
		/** @param {HTMLElement} node */
		return (node) => {
			gapEls[index] = node;
			return () => {
				gapEls[index] = /** @type {HTMLElement} */ (undefined);
			};
		};
	}

	$effect(() => {
		fingerX;
		const slots = chars.length - 1;
		if (slots <= 0) return;
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < slots; i++) {
			const el = gapEls[i];
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const dist = Math.abs(fingerX - cx);
			if (dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		}
		onPreview(best);
	});
</script>

<div
	bind:this={rootEl}
	class="loupe"
	class:loupe--below={placeBelow}
	class:loupe--canceling={canceling}
	style:left="{left}px"
	style:top="{anchorY}px"
	role="presentation"
	aria-hidden="true"
>
	<div class="loupe__strip">
		{#each chars as char, i (i)}
			<span class="loupe__char">{char}</span>
			{#if i < chars.length - 1}
				<span
					{@attach gapTarget(i)}
					class="loupe__gap"
					class:loupe__gap--preview={previewIndex === i}
					class:loupe__gap--set={shyAfter[i]}
				></span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.loupe {
		position: fixed;
		z-index: 2000;

		pointer-events: none;

		transform: translate(-50%, calc(-100% - 3.25rem));
		transition: opacity 120ms ease;
	}

	.loupe--below {
		transform: translate(-50%, 3.25rem);
	}

	.loupe--canceling {
		opacity: 0.4;
	}

	.loupe__strip {
		display: inline-flex;
		padding: 10px 14px;
		align-items: center;

		font-family: var(--font-mono);
		font-size: 1.5rem;
		line-height: 1;
		white-space: nowrap;

		color: var(--fg);

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);
		box-shadow:
			0 12px 40px lch(0% 0 0 / 0.45),
			0 0 0 1px lch(100% 0 0 / 0.06);
	}

	.loupe__char {
		padding: 0 1px;
	}

	.loupe__gap {
		flex-shrink: 0;
		width: 10px;
		height: 1.4em;
		margin: 0 1px;

		border-radius: 2px;
	}

	.loupe__gap--set {
		background: color-mix(in lch, var(--accent) 35%, transparent);
	}

	.loupe__gap--preview {
		background: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in lch, var(--accent) 40%, transparent);
	}

	.loupe__gap--preview.loupe__gap--set {
		background: var(--accent-hover);
	}
</style>
