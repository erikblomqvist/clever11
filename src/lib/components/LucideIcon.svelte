<script>
	/** @type {{ name?: string, iconNode: Array<[string, Record<string, string>]>, size?: number, color?: string, strokeWidth?: number, absoluteStrokeWidth?: boolean }} */
	let {
		name,
		iconNode,
		size = 24,
		color = 'currentColor',
		strokeWidth = 2,
		absoluteStrokeWidth = false,
		...rest
	} = $props();

	const classes = $derived(['lucide-icon', 'lucide', name ? `lucide-${name}` : ''].filter(Boolean).join(' '));
	const computedStrokeWidth = $derived(absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth);
</script>

<svg
	{...rest}
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={color}
	stroke-width={computedStrokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={classes}
>
	{#each iconNode as [tag, attrs], i (i)}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
