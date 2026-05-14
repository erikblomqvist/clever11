<script>
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
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
	 *   canAddPlayer: boolean,
	 *   onaddplayer: () => void,
	 *   onremoveplayer: (id: string) => void,
	 * }}
	 */
	let {
		players = $bindable(),
		newName = $bindable(),
		newIcon = $bindable(),
		newColor = $bindable(),
		canAddPlayer,
		onaddplayer,
		onremoveplayer,
	} = $props();

	/** @type {string | null} */
	let activePlayerId = $state(null);
	const removingIds = new SvelteSet();
	/** @type {string | null} */
	let suppressEntranceFor = $state(null);
	let addRowKey = $state(0);
	let addRowInputEl = $state(
		/** @type {HTMLInputElement | undefined} */ (undefined),
	);

	const activeIcon = $derived(
		activePlayerId === null
			? newIcon
			: (players.find((p) => p.id === activePlayerId)?.icon ?? newIcon),
	);
	const activeColor = $derived(
		activePlayerId === null
			? newColor
			: (players.find((p) => p.id === activePlayerId)?.color ?? newColor),
	);
	const usedIcons = $derived(
		players.filter((p) => p.id !== activePlayerId).map((p) => p.icon),
	);
	const usedColors = $derived(
		players.filter((p) => p.id !== activePlayerId).map((p) => p.color),
	);
	const atMax = $derived(players.length >= 8);

	function selectIcon(/** @type {string} */ id) {
		if (usedIcons.includes(id)) return;
		if (activePlayerId === null) {
			newIcon = id;
		} else {
			const p = players.find((p) => p.id === activePlayerId);
			if (p) p.icon = id;
			if (newIcon === id) {
				const next = PLAYER_ICONS.find(
					(i) => !players.some((pp) => pp.icon === i.id),
				);
				if (next) newIcon = next.id;
			}
		}
	}

	function selectColor(/** @type {string} */ id) {
		if (usedColors.includes(id)) return;
		if (activePlayerId === null) {
			newColor = id;
		} else {
			const p = players.find((p) => p.id === activePlayerId);
			if (p) p.color = id;
			if (newColor === id) {
				const next = PLAYER_COLORS.find(
					(c) => !players.some((pp) => pp.color === c.id),
				);
				if (next) newColor = next.id;
			}
		}
	}

	function isInvalid(
		/** @type {import('$lib/views/SetupView.svelte').SetupPlayer} */ player,
	) {
		const trimmed = player.name.trim();
		if (!trimmed) return true;
		const lower = trimmed.toLowerCase();
		return players.some(
			(other) =>
				other.id !== player.id &&
				other.name.trim().toLowerCase() === lower,
		);
	}

	function handleRemove(/** @type {string} */ id) {
		if (activePlayerId === id) activePlayerId = null;
		removingIds.add(id);
		setTimeout(() => {
			onremoveplayer(id);
			removingIds.delete(id);
		}, 200);
	}

	async function handleAdd() {
		if (!canAddPlayer) return;
		activePlayerId = null;
		onaddplayer();
		suppressEntranceFor = players[players.length - 1]?.id ?? null;
		addRowKey++;
		await tick();
		addRowInputEl?.focus();
		await tick();
		suppressEntranceFor = null;
	}

	const NewIconComp = $derived(getPlayerIconComponent(newIcon));
</script>

<div class="icon-picker" role="group" aria-label="Choose icon">
	{#each PLAYER_ICONS as { id, component: IconComp } (id)}
		<button
			class="icon-option"
			class:icon-option--active={activeIcon === id}
			class:icon-option--used={usedIcons.includes(id)}
			onclick={() => selectIcon(id)}
			type="button"
			aria-label={id}
			aria-pressed={activeIcon === id}
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
			class:color-option--active={activeColor === id}
			class:color-option--used={usedColors.includes(id)}
			style:--swatch="var(--{id})"
			onclick={() => selectColor(id)}
			type="button"
			aria-label={id}
			aria-pressed={activeColor === id}
			disabled={usedColors.includes(id)}
		></button>
	{/each}
</div>

<ul class="player-list" role="list">
	{#each players as player (player.id)}
		{@const Icon = getPlayerIconComponent(player.icon)}
		{@const active = activePlayerId === player.id}
		{@const invalid = isInvalid(player)}
		{@const removing = removingIds.has(player.id)}
		<li
			class="player-row"
			class:player-row--active={active}
			class:player-row--invalid={invalid}
			class:player-row--removing={removing}
			class:player-row--no-enter={suppressEntranceFor === player.id}
		>
			<button
				class="player-avatar"
				style:--player-ring="var(--{player.color})"
				onclick={() => (activePlayerId = player.id)}
				type="button"
				aria-label="Edit {player.name}"
			>
				{#if Icon}
					<Icon size={18} />
				{/if}
			</button>
			<input
				class="player-name-input"
				type="text"
				maxlength="20"
				bind:value={player.name}
				onfocus={() => (activePlayerId = player.id)}
				autocomplete="off"
			/>
			<button
				class="remove-player-btn"
				type="button"
				onclick={() => handleRemove(player.id)}
				aria-label="Remove {player.name}"
			>
				<X size={16} />
			</button>
		</li>
	{/each}

	{#key addRowKey}
		<li
			class="player-row player-row--add"
			class:player-row--active={activePlayerId === null}
		>
			<button
				class="player-avatar"
				style:--player-ring="var(--{newColor})"
				onclick={() => {
					activePlayerId = null;
					addRowInputEl?.focus();
				}}
				type="button"
				aria-label={$_('setup.add_player_aria')}
				disabled={atMax}
			>
				{#if NewIconComp}
					<NewIconComp size={18} />
				{/if}
			</button>
			<input
				class="player-name-input"
				type="text"
				placeholder={$_('setup.player_name_placeholder')}
				maxlength="20"
				bind:value={newName}
				bind:this={addRowInputEl}
				onfocus={() => (activePlayerId = null)}
				onkeydown={(e) => e.key === 'Enter' && handleAdd()}
				autocomplete="off"
				disabled={atMax}
			/>
			<Button
				class="add-player-btn"
				variant="cta"
				icon={Plus}
				onclick={handleAdd}
				disabled={!canAddPlayer}
				aria-label={$_('setup.add_player_aria')}
			/>
		</li>
	{/key}
</ul>

{#if players.length < 2}
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

	.player-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		interpolate-size: allow-keywords;
	}

	.player-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-block: 0.25rem;
		border: 2px solid hsl(0 0% 100% / 0.3);
		border-radius: 0.5rem;
		padding: 0.5rem;
		background-color: hsl(0 0% 100% / 0.15);
		color: var(--palette-white);
		overflow: hidden;
		transition:
			opacity 200ms ease-out,
			height 200ms ease-out,
			margin-top 200ms ease-out,
			margin-bottom 200ms ease-out,
			padding-top 200ms ease-out,
			padding-bottom 200ms ease-out,
			border-top-width 200ms ease-out,
			border-bottom-width 200ms ease-out,
			scale 200ms ease-out,
			border-color var(--transition-default-duration) ease-out,
			background-color var(--transition-default-duration) ease-out;
	}

	@starting-style {
		.player-row:not(.player-row--no-enter) {
			opacity: 0;
			height: 20px;
			margin-top: 0;
			margin-bottom: 0;
			padding-top: 0;
			padding-bottom: 0;
			border-top-width: 0;
			border-bottom-width: 0;
			scale: 0.92;
		}
	}

	.player-row--removing {
		opacity: 0;
		height: 0;
		margin-top: 0;
		margin-bottom: 0;
		padding-top: 0;
		padding-bottom: 0;
		border-top-width: 0;
		border-bottom-width: 0;
		scale: 0.92;
	}

	.player-row--add {
		border-style: dashed;
	}

	.player-row--active {
		border-color: var(--palette-purple-start);
	}

	.player-row--active:not(.player-row--add) {
		border-style: solid;
	}

	.player-row--invalid {
		border-color: hsl(0 86% 58%);
	}

	.player-avatar {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: none;
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		background-color: var(--player-ring);
		color: var(--palette-white);
		cursor: pointer;
		padding: 0;
		transition: scale var(--transition-default-duration) ease-out;

		&:active:not(:disabled) {
			scale: 0.95;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.player-name-input {
		flex: 1;
		min-width: 0;
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

	.player-name-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.player-row :global(.add-player-btn) {
		flex-shrink: 0;
	}

	.remove-player-btn {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: none;
		border-radius: 0.375rem;
		width: 2.75rem;
		height: 2.75rem;
		background: hsl(0 0% 100% / 0.15);
		color: var(--palette-white);
		cursor: pointer;
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
