<script>
	import { getPlayerIconComponent } from '$lib/playerIcons.js';

	/**
	 * @type {{
	 *   player: { color: string, icon: string },
	 *   size?: number,
	 *   className?: string,
	 * }}
	 */
	let {
		player,
		size = 14,
		className = '',
	} = $props();

	const style = $derived.by(() => {
		const styles = [
			`--player-ring: var(--${player.color})`,
		];

		styles.push(`--player-icon-size: ${size}px`);

		return styles.join('; ');
	});

    const Icon = $derived(getPlayerIconComponent(player.icon))
</script>

<span
	class={`player-icon-badge ${className}`.trim()}
	{style}
	aria-hidden="true"
>
    <Icon size={size * 0.5} />
</span>

<style>
	.player-icon-badge {
		display: grid;
		place-items: center;

		border-radius: 50%;
		width: var(--player-icon-size, 1.75rem);
		height: var(--player-icon-size, 1.75rem);
		background-color: var(--player-ring, transparent);

		color: var(--palette-white);
	}
</style>
