<script>
	import { _ } from 'svelte-i18n';
	import { Shuffle } from 'lucide-svelte';
	import Button from './Button.svelte';
	import { getPlayerIconComponent } from '$lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: import('$lib/views/SetupView.svelte').SetupPlayer[],
	 *   sortedPlayers: import('$lib/views/SetupView.svelte').SetupPlayer[],
	 *   startingPlayerIdx: number | null,
	 *   onrandomize: () => void,
	 * }}
	 */
	let {
		players,
		sortedPlayers,
		startingPlayerIdx = $bindable(),
		onrandomize,
	} = $props();
</script>

<ul class="starting-list" role="list">
	{#each sortedPlayers as player (player.id)}
		{@const idx = players.findIndex((p) => p.id === player.id)}
		{@const Icon = getPlayerIconComponent(player.icon)}
		<li>
			<button
				class="starting-card"
				class:starting-card--selected={startingPlayerIdx === idx}
				onclick={() => (startingPlayerIdx = idx)}
				type="button"
			>
				<span
					class="starting-card__icon"
					style:--player-ring="var(--{player.color})"
					aria-hidden="true"
				>
					{#if Icon}
						<Icon size={20} />
					{/if}
				</span>
				<span class="starting-card__name">{player.name}</span>
			</button>
		</li>
	{/each}
</ul>

<Button
	class="randomize-btn"
	variant="secondary"
	size="base"
	icon={Shuffle}
	text={$_('setup.randomize')}
	onclick={onrandomize}
/>

<style>
	.starting-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.starting-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		border: 2px solid lch(from var(--palette-purple-dark) calc(l + 5) c h);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--palette-purple-dark);
		color: var(--palette-white);
		text-align: left;
		cursor: pointer;

		&:hover {
			background-color: lch(
				from var(--palette-purple-dark) calc(l + 5) c h
			);
		}
	}

	.starting-card--selected {
		background-color: var(--palette-purple-mid);
		border-color: var(--palette-purple-start);

		&:hover {
			background-color: lch(
				from var(--palette-purple-mid) calc(l + 5) c h
			);
		}
	}

	.starting-card__icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		background-color: var(--player-ring);
	}

	.starting-card__name {
		font-family: var(--font-family-primary);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	:global(.randomize-btn) {
		align-self: flex-start;
	}
</style>
