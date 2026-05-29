<script>
	import LucideIcon from '$lib/components/LucideIcon.svelte';
	import { getDeckIconNode } from '$lib/deckIcons.js';

	/** @type {{ icon?: string|null, image?: string|null, size?: number }} */
	let { icon = null, image = null, size = 44 } = $props();

	const iconNode = $derived(getDeckIconNode(icon));
</script>

{#if image}
	<div
		class="deck-badge deck-badge--image"
		style:width="{size}px"
		style:height="{size}px"
		style:flex="0 0 {size}px"
		style:background-image="url({image})"
	>
		<span class="deck-badge__overlay">
			<LucideIcon
				name={icon ?? 'Layers'}
				{iconNode}
				size={Math.round(size * 0.45)}
				aria-hidden="true"
			/>
		</span>
	</div>
{:else}
	<div
		class="deck-badge deck-badge--icon"
		style:width="{size}px"
		style:height="{size}px"
		style:flex="0 0 {size}px"
	>
		<LucideIcon
			name={icon ?? 'Layers'}
			{iconNode}
			size={Math.round(size * 0.5)}
			aria-hidden="true"
		/>
	</div>
{/if}

<style>
	.deck-badge {
		display: grid;

		border-radius: var(--r-2);

		place-items: center;
	}

	.deck-badge--icon {
		color: var(--fg-mute);
		background: var(--surface-2);
		border: 1px solid var(--border);
	}

	.deck-badge--image {
		position: relative;
		overflow: hidden;

		background-position: center;
		background-size: cover;
		border: 1px solid var(--border-strong);
		box-shadow: inset 0 0 0 1px lch(100% 0 0 / 0.04);
	}

	.deck-badge__overlay {
		display: grid;
		position: absolute;
		inset: 0;

		color: lch(100% 0 0);

		mix-blend-mode: overlay;
		place-items: center;
	}
</style>
