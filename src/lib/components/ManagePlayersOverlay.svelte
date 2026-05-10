<script>
	import { _ } from 'svelte-i18n';
	import { X, UserMinus, UserPen, UserPlus } from 'lucide-svelte';
	import Button from './Button.svelte';
	import {
		PLAYER_ICONS,
		PLAYER_COLORS,
		getPlayerIconComponent,
	} from '$lib/playerIcons.js';
	import SeatMap from './SeatMap.svelte';

	/**
	 * @type {{
	 *   players: import('$lib/game.svelte.js').GamePlayer[],
	 *   onremove: (playerId: string) => void,
	 *   onreplace: (playerId: string, identity: { name: string, icon: string, color: string }) => void,
	 *   onadd: (params: { name: string, icon: string, color: string, seatPosition: number }) => void,
	 *   onclose: () => void,
	 * }}
	 */
	let { players, onremove, onreplace, onadd, onclose } = $props();

	const activePlayers = $derived(players.filter((p) => p.status !== 'removed'));
	const canRemove = $derived(activePlayers.length > 2);
	const canAdd = $derived(activePlayers.length < 8);
	const usedIcons = $derived(activePlayers.map((p) => p.icon));
	const usedColors = $derived(activePlayers.map((p) => p.color));
	const usedSeats = $derived(activePlayers.map((p) => p.seatPosition));

	/** @type {'list' | 'add' | 'replace'} */
	let mode = $state('list');
	/** @type {string|null} */
	let replacingPlayerId = $state(null);

	let formName = $state('');
	let formIcon = $state('');
	let formColor = $state('');
	let formSeat = $state(-1);

	function startAdd() {
		const availableIcon = PLAYER_ICONS.find((i) => !usedIcons.includes(i.id))?.id ?? '';
		const availableColor = PLAYER_COLORS.find((c) => !usedColors.includes(c.id))?.id ?? '';
		formName = '';
		formIcon = availableIcon;
		formColor = availableColor;
		formSeat = -1;
		mode = 'add';
	}

	/** @param {import('$lib/game.svelte.js').GamePlayer} player */
	function startReplace(player) {
		replacingPlayerId = player.id;
		formName = player.name;
		formIcon = player.icon;
		formColor = player.color;
		mode = 'replace';
	}

	function confirmAdd() {
		if (!formName.trim() || !formIcon || !formColor || formSeat === -1) return;
		onadd({ name: formName.trim(), icon: formIcon, color: formColor, seatPosition: formSeat });
		mode = 'list';
	}

	function confirmReplace() {
		if (!replacingPlayerId || !formName.trim() || !formIcon || !formColor) return;
		onreplace(replacingPlayerId, { name: formName.trim(), icon: formIcon, color: formColor });
		mode = 'list';
	}

	const formValid = $derived(
		mode === 'add'
			? formName.trim().length > 0 && formIcon && formColor && formSeat !== -1
			: formName.trim().length > 0 && formIcon && formColor,
	);

	const iconsForForm = $derived(
		mode === 'replace'
			? usedIcons.filter((i) => i !== activePlayers.find((p) => p.id === replacingPlayerId)?.icon)
			: usedIcons,
	);

	const colorsForForm = $derived(
		mode === 'replace'
			? usedColors.filter((c) => c !== activePlayers.find((p) => p.id === replacingPlayerId)?.color)
			: usedColors,
	);
</script>

<div class="mp-overlay" role="dialog" aria-modal="true">
	<div class="mp-overlay__backdrop" onclick={onclose}></div>
	<div class="mp-overlay__panel">
		<header class="mp-overlay__header">
			<h2 class="mp-overlay__title">
				{#if mode === 'list'}
					{$_('manage_players.title')}
				{:else if mode === 'add'}
					{$_('manage_players.add_player')}
				{:else}
					{$_('manage_players.replace_player')}
				{/if}
			</h2>
			{#if mode !== 'list'}
				<button class="mp-overlay__back" type="button" onclick={() => (mode = 'list')}>
					{$_('setup.back')}
				</button>
			{/if}
			<button class="mp-overlay__close" type="button" onclick={onclose} aria-label="Close">
				<X size={20} />
			</button>
		</header>

		{#if mode === 'list'}
			<ul class="mp-list">
				{#each activePlayers as player (player.id)}
					{@const Icon = getPlayerIconComponent(player.icon)}
					<li class="mp-list__item">
						<span class="mp-list__icon" style:--player-ring="var(--{player.color})" aria-hidden="true">
							{#if Icon}<Icon size={16} />{/if}
						</span>
						<span class="mp-list__name">{player.name}</span>
						<button
							class="mp-list__action"
							type="button"
							onclick={() => startReplace(player)}
							aria-label="{$_('manage_players.replace_aria', { values: { name: player.name } })}"
						>
							<UserPen size={16} />
						</button>
						<button
							class="mp-list__action mp-list__action--danger"
							type="button"
							onclick={() => onremove(player.id)}
							disabled={!canRemove}
							aria-label="{$_('manage_players.remove_aria', { values: { name: player.name } })}"
						>
							<UserMinus size={16} />
						</button>
					</li>
				{/each}
			</ul>

			{#if canAdd}
				<button class="mp-add-btn" type="button" onclick={startAdd}>
					<UserPlus size={18} />
					<span>{$_('manage_players.add_player')}</span>
				</button>
			{/if}
		{:else}
			<div class="mp-form">
				<input
					class="mp-form__name"
					type="text"
					placeholder={$_('setup.player_name_placeholder')}
					maxlength="20"
					bind:value={formName}
					autocomplete="off"
				/>

				<div class="mp-form__picker" role="group" aria-label="Choose icon">
					{#each PLAYER_ICONS as { id, component: IconComp } (id)}
						<button
							class="mp-form__icon-opt"
							class:mp-form__icon-opt--active={formIcon === id}
							class:mp-form__icon-opt--used={iconsForForm.includes(id)}
							onclick={() => { if (!iconsForForm.includes(id)) formIcon = id; }}
							type="button"
							disabled={iconsForForm.includes(id)}
							aria-pressed={formIcon === id}
						>
							<IconComp size={18} />
						</button>
					{/each}
				</div>

				<div class="mp-form__picker" role="group" aria-label="Choose color">
					{#each PLAYER_COLORS as { id } (id)}
						<button
							class="mp-form__color-opt"
							class:mp-form__color-opt--active={formColor === id}
							class:mp-form__color-opt--used={colorsForForm.includes(id)}
							style:--swatch="var(--{id})"
							onclick={() => { if (!colorsForForm.includes(id)) formColor = id; }}
							type="button"
							disabled={colorsForForm.includes(id)}
							aria-pressed={formColor === id}
						>
						</button>
					{/each}
				</div>

				{#if mode === 'add'}
					<p class="mp-form__label">{$_('manage_players.choose_seat')}</p>
					<div class="mp-form__seat-map">
						<SeatMap
							players={activePlayers}
							disabledSeats={usedSeats}
							selectedSeat={formSeat}
							onselect={(pos) => { if (!usedSeats.includes(pos)) formSeat = pos; }}
						/>
					</div>
				{/if}

				<Button
					text={mode === 'add' ? $_('manage_players.add_player') : $_('manage_players.confirm_replace')}
					onclick={mode === 'add' ? confirmAdd : confirmReplace}
					disabled={!formValid}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.mp-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
	}

	.mp-overlay__backdrop {
		position: absolute;
		inset: 0;
		background: hsl(0 0% 0% / 0.6);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.mp-overlay__panel {
		position: relative;
		display: grid;
		gap: 0.75rem;
		width: min(24rem, calc(100vw - 2rem));
		max-height: calc(100svh - 4rem);
		overflow-y: auto;
		border-radius: 1rem;
		padding: 1.25rem;
		background: hsl(0 0% 100%);
		box-shadow: 0 1rem 3rem hsl(0 0% 0% / 0.3);
	}

	.mp-overlay__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.mp-overlay__title {
		flex: 1;
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--grayscale-900);
	}

	.mp-overlay__back {
		border: none;
		border-radius: 0.375rem;
		padding: 0.25rem 0.75rem;
		background: var(--grayscale-100);
		color: var(--grayscale-700);
		font-family: inherit;
		font-size: var(--font-size-sm);
		cursor: pointer;
	}

	.mp-overlay__back:hover {
		background: var(--grayscale-200);
	}

	.mp-overlay__close {
		display: grid;
		place-items: center;
		border: none;
		border-radius: 0.375rem;
		width: 2rem;
		height: 2rem;
		background: none;
		color: var(--grayscale-500);
		cursor: pointer;
	}

	.mp-overlay__close:hover {
		background: var(--grayscale-100);
		color: var(--grayscale-700);
	}

	.mp-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.mp-list__item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 2px solid var(--grayscale-200);
		border-radius: 0.5rem;
		padding: 0.5rem 0.625rem;
	}

	.mp-list__icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: 2px solid var(--player-ring, transparent);
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		color: var(--grayscale-700);
	}

	.mp-list__name {
		flex: 1;
		font-family: var(--font-family-body);
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--grayscale-900);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mp-list__action {
		display: grid;
		place-items: center;
		border: none;
		border-radius: 0.375rem;
		width: 2rem;
		height: 2rem;
		background: var(--grayscale-100);
		color: var(--grayscale-600);
		cursor: pointer;
		flex-shrink: 0;
	}

	.mp-list__action:hover:not(:disabled) {
		background: var(--grayscale-200);
		color: var(--grayscale-800);
	}

	.mp-list__action--danger:hover:not(:disabled) {
		background: hsl(0 86% 95%);
		color: hsl(0 86% 45%);
	}

	.mp-list__action:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.mp-add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 2px dashed var(--grayscale-300);
		border-radius: 0.5rem;
		padding: 0.625rem;
		background: none;
		color: var(--grayscale-600);
		font-family: var(--font-family-primary);
		font-size: var(--font-size-md);
		font-weight: 600;
		cursor: pointer;
		width: 100%;
	}

	.mp-add-btn:hover {
		border-color: var(--orange-600);
		color: var(--orange-700);
		background: var(--orange-100);
	}

	.mp-form {
		display: grid;
		gap: 0.75rem;
	}

	.mp-form__name {
		border: 2px solid var(--grayscale-300);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--grayscale-900);
	}

	.mp-form__name:focus {
		outline: 2px solid var(--orange-600);
		outline-offset: 1px;
		border-color: var(--orange-600);
	}

	.mp-form__picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.mp-form__icon-opt {
		display: grid;
		place-items: center;
		border: 2px solid var(--grayscale-200);
		border-radius: 0.375rem;
		width: 2.25rem;
		height: 2.25rem;
		background: var(--grayscale-50);
		color: var(--grayscale-700);
		cursor: pointer;
	}

	.mp-form__icon-opt:not(:disabled):hover {
		border-color: var(--grayscale-400);
	}

	.mp-form__icon-opt--active {
		background-color: var(--orange-600);
		border-color: var(--orange-700);
		color: var(--white);
	}

	.mp-form__icon-opt--used {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.mp-form__color-opt {
		border: 2px solid var(--grayscale-200);
		border-radius: 50%;
		width: 2.25rem;
		height: 2.25rem;
		background: var(--swatch);
		cursor: pointer;
	}

	.mp-form__color-opt:not(:disabled):hover {
		border-color: var(--grayscale-500);
		transform: scale(1.1);
	}

	.mp-form__color-opt--active {
		border-color: var(--grayscale-800);
		box-shadow: 0 0 0 2px var(--swatch);
	}

	.mp-form__color-opt--used {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.mp-form__label {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: var(--grayscale-600);
	}

	.mp-form__seat-map {
		width: 10rem;
		height: 10rem;
		margin: 0 auto;
		border-radius: 0.75rem;
		padding: 1rem;
		background: linear-gradient(to bottom, var(--orange-500), var(--orange-600));
	}

</style>
