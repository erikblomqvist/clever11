<script>
	import AdminIcon from './AdminIcon.svelte';

	let { words = [], disabled = false, ontoggle } = $props();

	const SHY = '­';

	/** @param {string} wordText */
	function parseWordChars(wordText) {
		/** @type {string[]} */
		const chars = [];
		/** @type {Record<number, true>} */
		const shyAfter = {};
		for (const c of wordText) {
			if (c === SHY) {
				if (chars.length > 0) shyAfter[chars.length - 1] = true;
			} else {
				chars.push(c);
			}
		}
		return { chars, shyAfter };
	}
</script>

{#if words.length > 0}
	<div class="shy">
		<div class="shy__header">
			<AdminIcon name="bolt" size={12} />
			<span>
				{words.some((w) => !w.text.includes(SHY))
					? 'Long word detected — tap between letters to add break hints'
					: 'Break points set'}
			</span>
		</div>
		<div class="shy__words">
			{#each words as word (word.offset)}
				{@const parsed = parseWordChars(word.text)}
				<div
					class="shy__word"
					class:shy__word--done={word.text.includes(SHY)}
				>
					{#each parsed.chars as char, i (i)}
						<button
							class="shy__letter"
							class:shy__letter--break={parsed.shyAfter[i]}
							type="button"
							onclick={() =>
								ontoggle?.(word.offset, word.text, i)}
							{disabled}>{char}</button
						>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.shy {
		padding: 10px 12px;

		font-size: 0.75rem;

		background: var(--warn-soft);
		border: 1px solid var(--warn-soft-2);
		border-radius: var(--r-2);
	}

	.shy__header {
		display: flex;
		margin-bottom: 8px;
		align-items: center;

		color: var(--warn);

		gap: 8px;
	}

	.shy__words {
		display: flex;

		flex-wrap: wrap;
		gap: 8px;
	}

	.shy__word {
		display: inline-flex;
		padding: 2px 4px;
		align-items: center;

		background: var(--surface);
		border: 1px solid var(--warn-soft-2);
		border-radius: var(--r-2);
	}

	.shy__word--done {
		border-color: var(--border);
	}

	.shy__letter {
		position: relative;
		padding: 6px 2px;

		font-family: var(--font-mono);
		font-size: 1rem;
		line-height: 1;

		color: var(--fg-mute);

		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.shy__letter::after {
		position: absolute;
		right: -1px;
		top: 4px;
		bottom: 4px;
		width: 2px;

		background: transparent;
		border-radius: 1px;

		transition: background-color 150ms;

		content: '';
	}

	.shy__letter:hover::after {
		background: lch(100% 0 0 / 0.13);
	}

	.shy__letter--break::after {
		background: var(--accent);
	}

	.shy__letter--break:hover::after {
		background: var(--accent-hover);
	}

	.shy__letter:last-child::after {
		display: none;
	}

	.shy__letter:disabled {
		cursor: default;
		pointer-events: none;
	}
</style>
