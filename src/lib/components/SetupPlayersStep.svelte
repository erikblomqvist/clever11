<script>
	import { _ } from 'svelte-i18n';
	import { Plus, X } from 'lucide-svelte';
	import Button from './Button.svelte';
	import {
		PLAYER_ICONS,
		PLAYER_COLORS,
		getPlayerIconComponent,
	} from '$lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: import('$lib/views/SetupView.svelte').SetupPlayer[],
	 *   newName: string,
	 *   newIcon: string,
	 *   newColor: string,
	 *   usedIcons: string[],
	 *   usedColors: string[],
	 *   canAddPlayer: boolean,
	 *   onaddplayer: () => void,
	 *   onremoveplayer: (name: string) => void,
	 * }}
	 */
	let {
		players,
		newName = $bindable(),
		newIcon = $bindable(),
		newColor = $bindable(),
		usedIcons,
		usedColors,
		canAddPlayer,
		onaddplayer,
		onremoveplayer,
	} = $props();
</script>

<div class="icon-picker" role="group" aria-label="Choose icon">
	{#each PLAYER_ICONS as { id, component: IconComp } (id)}
		<button
			class="icon-option"
			class:icon-option--active={newIcon === id}
			class:icon-option--used={usedIcons.includes(id)}
			onclick={() => {
				if (!usedIcons.includes(id)) newIcon = id;
			}}
			type="button"
			aria-label={id}
			aria-pressed={newIcon === id}
			disabled={usedIcons.includes(id)}
		>
			<IconComp size={20} />
		</button>
	{/each}
</div>

<div class="color-picker" role="group" aria-label="Choose color">
	{#each PLAYER_COLORS as { id } (id)}
		<button
			class="color-option"
			class:color-option--active={newColor === id}
			class:color-option--used={usedColors.includes(id)}
			style:--swatch="var(--{id})"
			onclick={() => {
				if (!usedColors.includes(id)) newColor = id;
			}}
			type="button"
			aria-label={id}
			aria-pressed={newColor === id}
			disabled={usedColors.includes(id)}
		></button>
	{/each}
</div>

<div class="player-input-row">
	<input
		class="player-name-input"
		type="text"
		placeholder={$_('setup.player_name_placeholder')}
		maxlength="20"
		bind:value={newName}
		onkeydown={(e) => e.key === 'Enter' && onaddplayer()}
		autocomplete="off"
	/>
	<Button
		class="add-player-btn"
		variant="cta"
		icon={Plus}
		onclick={onaddplayer}
		disabled={!canAddPlayer}
		aria-label={$_('setup.add_player_aria')}
	/>
</div>

{#if players.length > 0}
	<ul class="player-list" role="list">
		{#each players as player (player.name)}
			{@const Icon = getPlayerIconComponent(player.icon)}
			<li class="player-list-item">
				<span
					class="player-list-icon"
					style:--player-ring="var(--{player.color})"
					aria-hidden="true"
				>
					{#if Icon}
						<Icon size={18} />
					{/if}
				</span>
				<span class="player-list-name">{player.name}</span>
				<button
					class="remove-player-btn"
					type="button"
					onclick={() => onremoveplayer(player.name)}
					aria-label="Remove {player.name}"
				>
					<X size={16} />
				</button>
			</li>
		{/each}
	</ul>
{:else}
	<p class="setup-hint">{$_('setup.min_players_hint')}</p>
{/if}

<style>
	.icon-picker,
	.color-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.icon-option {
		display: grid;
		place-items: center;

		border: 2px solid var(--palette-gray-muted);
		border-radius: 0.5rem;
		width: 2.75rem;
		height: 2.75rem;
		background-color: var(--palette-gray-dimmed);
		color: var(--palette-white);
		cursor: pointer;
		transition:
			background-color,
			border-color,
			scale var(--transition-default-duration) ease-out;

		&:active {
			scale: 0.97;
		}

		&:not(:disabled) {
			&:not(.icon-option--active):hover {
				border-color: var(--palette-white);
			}
		}
	}

	.icon-option--active {
		background-color: var(--palette-purple-mid);
		border-color: var(--palette-purple-start);

		&:hover {
			background-color: lch(
				from var(--palette-purple-mid) calc(l + 5) c h
			);
		}
	}

	.icon-option--used {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.color-option {
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 50%;
		width: 2.75rem;
		height: 2.75rem;
		background: var(--swatch);
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.1s,
			box-shadow 0.1s;

		&:hover:not(:disabled) {
			border-color: var(--palette-white);
			transform: scale(1.1);
		}
	}

	.color-option--active {
		border-color: var(--palette-white);
		box-shadow: 0 0 0 2px var(--swatch);
	}

	.color-option--used {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.player-input-row {
		display: flex;
		gap: 0.5rem;
	}

	.player-name-input {
		flex: 1;
		border: 3px solid var(--palette-purple-start);
		border-radius: 0.5rem;
		padding: 0.425rem 0.875rem;
		background-color: var(--palette-white);
		color: var(--palette-black);
		font-family: var(--font-family-primary);
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.player-name-input:focus {
		outline: 3px solid var(--palette-purple-start);
		outline-offset: 2px;
	}

	.player-input-row :global(.add-player-btn) {
		flex-shrink: 0;
	}

	.player-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.player-list-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background-color: hsl(0 0% 100% / 0.15);
		color: var(--white);
	}

	.player-list-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		background-color: var(--player-ring);
	}

	.player-list-name {
		flex: 1;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.remove-player-btn {
		display: grid;
		place-items: center;
		border: none;
		border-radius: 0.375rem;
		width: 1.75rem;
		height: 1.75rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--white);
		cursor: pointer;
		flex-shrink: 0;
		transition: background-color 0.15s;
	}

	.remove-player-btn:hover {
		background-color: hsl(0 86% 58% / 0.4);
	}

	.setup-hint {
		margin: 0;
		color: hsl(0 0% 100% / 0.7);
		font-size: var(--font-size-base);
		text-align: center;
	}
</style>
