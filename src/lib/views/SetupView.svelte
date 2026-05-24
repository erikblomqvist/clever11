<script>
	import { _ } from 'svelte-i18n';
	import {
		BASE_PLAYER_ICONS,
		PANTRY_ICONS,
		MENAGERIE_ICONS,
		PLAYER_COLORS,
	} from '$lib/playerIcons.js';
	import { supabase } from '$lib/supabase.js';
	import SetupStepShell from '$lib/components/SetupStepShell.svelte';
	import SetupPlayersStep from '$lib/components/SetupPlayersStep.svelte';
	import SetupSeatingStep from '$lib/components/SetupSeatingStep.svelte';
	import SetupDecksStep from '$lib/components/SetupDecksStep.svelte';
	import SetupRulesStep from '$lib/components/SetupRulesStep.svelte';
	import SetupStartingStep from '$lib/components/SetupStartingStep.svelte';

	/** @type {{ oninit: (setup: GameSetup) => void, onback: () => void }} */
	let { oninit, onback } = $props();

	/**
	 * @typedef {{ id: string, name: string, icon: string, color: string, seatPosition: number|null, turnOrder: number|null }} SetupPlayer
	 * @typedef {{ players: SetupPlayer[], selectedDeckIds: string[], startingPlayerIndex: number, turnTimerSeconds: number|null, volcanoRumble: boolean, winScore: number }} GameSetup
	 */

	// --- Navigation ---
	let step = $state(
		/** @type {'players'|'seating'|'decks'|'rules'|'starting'} */ (
			'players'
		),
	);

	function navigateStep(
		/** @type {'players'|'seating'|'decks'|'rules'|'starting'} */ newStep,
	) {
		if (document.startViewTransition) {
			document.startViewTransition(() => {
				step = newStep;
			});
		} else {
			step = newStep;
		}
	}

	function goBack() {
		if (step === 'players') {
			onback();
		} else if (step === 'seating') {
			players = players.map((p) => ({
				...p,
				seatPosition: null,
				turnOrder: null,
			}));
			currentSeatingIdx = 0;
			navigateStep('players');
		} else if (step === 'decks') {
			players = players.map((p) => ({
				...p,
				seatPosition: null,
				turnOrder: null,
			}));
			currentSeatingIdx = 0;
			navigateStep('seating');
		} else if (step === 'rules') {
			navigateStep('decks');
		} else if (step === 'starting') {
			navigateStep('rules');
		}
	}

	// --- Players step ---
	let players = $state(/** @type {SetupPlayer[]} */ ([]));
	let newName = $state('');
	let newIcon = $state(BASE_PLAYER_ICONS[0].id);
	let newColor = $state(PLAYER_COLORS[0].id);

	// Easter-egg unlock state — ephemeral, scoped to this setup session.
	// Resets when SetupView unmounts (leaving setup); persists across
	// step navigation within setup.
	let pantryUnlocked = $state(false);
	let menagerieUnlocked = $state(false);
	const pickerIcons = $derived([
		...BASE_PLAYER_ICONS,
		...(pantryUnlocked ? PANTRY_ICONS : []),
		...(menagerieUnlocked ? MENAGERIE_ICONS : []),
	]);

	const addRowValid = $derived(
		newName.trim().length > 0 &&
			!players.some(
				(p) =>
					p.name.trim().toLowerCase() ===
					newName.trim().toLowerCase(),
			),
	);
	const canAddPlayer = $derived(addRowValid && players.length < 7);
	const effectivePlayerCount = $derived(
		players.length + (addRowValid ? 1 : 0),
	);
	const allPlayersValid = $derived(
		players.every((p) => {
			const trimmed = p.name.trim();
			if (!trimmed) return false;
			const lower = trimmed.toLowerCase();
			return !players.some(
				(other) =>
					other.id !== p.id &&
					other.name.trim().toLowerCase() === lower,
			);
		}),
	);

	function addPlayer() {
		if (!addRowValid) return;
		const name = newName.trim();
		players = [
			...players,
			{
				id: crypto.randomUUID(),
				name,
				icon: newIcon,
				color: newColor,
				seatPosition: null,
				turnOrder: null,
			},
		];
		newName = '';
		const nextIcon = pickerIcons.find(
			(i) => !players.map((p) => p.icon).includes(i.id),
		);
		newIcon = nextIcon?.id ?? BASE_PLAYER_ICONS[0].id;
		const nextColor = PLAYER_COLORS.find(
			(c) => !players.map((p) => p.color).includes(c.id),
		);
		newColor = nextColor?.id ?? PLAYER_COLORS[0].id;
	}

	function removePlayer(/** @type {string} */ id) {
		players = players.filter((p) => p.id !== id);
		if (players.map((p) => p.icon).includes(newIcon)) {
			const next = pickerIcons.find(
				(i) => !players.map((p) => p.icon).includes(i.id),
			);
			if (next) newIcon = next.id;
		}
		if (players.map((p) => p.color).includes(newColor)) {
			const next = PLAYER_COLORS.find(
				(c) => !players.map((p) => p.color).includes(c.id),
			);
			if (next) newColor = next.id;
		}
	}

	function goToSeating() {
		if (addRowValid) addPlayer();
		players = players.map((p) => ({
			...p,
			seatPosition: null,
			turnOrder: null,
		}));
		currentSeatingIdx = 0;
		navigateStep('seating');
	}

	// --- Seating step ---
	let currentSeatingIdx = $state(0);
	const currentSeatingPlayer = $derived(players[currentSeatingIdx] ?? null);

	function claimSeat(/** @type {number} */ position) {
		players = players.map((p, i) =>
			i === currentSeatingIdx ? { ...p, seatPosition: position } : p,
		);
		if (currentSeatingIdx < players.length - 1) {
			currentSeatingIdx++;
		} else {
			const sorted = [...players].sort(
				(a, b) => (a.seatPosition ?? 0) - (b.seatPosition ?? 0),
			);
			players = players.map((p) => ({
				...p,
				turnOrder: sorted.findIndex((s) => s.id === p.id),
			}));
			navigateStep('decks');
		}
	}

	// --- Decks step ---
	/**
	 * @typedef {{ id: string, name: string, description: string|null, icon: string|null, css_unselected: string|null, css_selected: string|null }} Deck
	 */
	/** @type {Deck[]} */
	let decks = $state([]);
	let decksLoading = $state(true);
	let selectedDeckIds = $state(/** @type {string[]} */ ([]));

	$effect(() => {
		if (!supabase) {
			decks = [
				{
					id: 'mock-1',
					name: 'General Knowledge',
					description: 'A bit of everything',
					icon: null,
					css_unselected: null,
					css_selected: null,
				},
				{
					id: 'mock-2',
					name: 'Music',
					description: 'Artists, albums, and songs',
					icon: null,
					css_unselected: null,
					css_selected: null,
				},
				{
					id: 'mock-3',
					name: 'History',
					description: 'Journey through time',
					icon: null,
					css_unselected: null,
					css_selected: null,
				},
			];
			decksLoading = false;
			return;
		}
		supabase
			.from('decks')
			.select('id, name, description, icon, css_unselected, css_selected')
			.order('name')
			.then(({ data }) => {
				decks = data ?? [];
				decksLoading = false;
			});
	});

	function toggleDeck(/** @type {string} */ id) {
		selectedDeckIds = selectedDeckIds.includes(id)
			? selectedDeckIds.filter((d) => d !== id)
			: [...selectedDeckIds, id];
	}

	// --- Rules step ---
	let timerEnabled = $state(false);
	let timerSeconds = $state(60);
	let volcanoRumble = $state(false);
	let winScore = $state(50);

	// --- Starting player step ---
	let startingPlayerIdx = $state(/** @type {number|null} */ (null));
	const sortedPlayers = $derived(
		[...players].sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0)),
	);

	function randomize() {
		startingPlayerIdx = Math.floor(Math.random() * players.length);
	}

	function handleComplete() {
		const idx =
			startingPlayerIdx ?? Math.floor(Math.random() * players.length);
		oninit({
			players,
			selectedDeckIds,
			startingPlayerIndex: idx,
			turnTimerSeconds: timerEnabled ? timerSeconds : null,
			volcanoRumble,
			winScore,
		});
	}
</script>

{#if step === 'players'}
	<SetupStepShell
		title={$_('setup.players_title')}
		onback={goBack}
		primaryLabel={$_('setup.continue')}
		onprimary={goToSeating}
		primaryDisabled={effectivePlayerCount < 2 || !allPlayersValid}
	>
		<SetupPlayersStep
			bind:players
			bind:newName
			bind:newIcon
			bind:newColor
			bind:pantryUnlocked
			bind:menagerieUnlocked
			{canAddPlayer}
			onaddplayer={addPlayer}
			onremoveplayer={removePlayer}
		/>
	</SetupStepShell>
{:else if step === 'seating'}
	<SetupSeatingStep
		{players}
		{currentSeatingIdx}
		{currentSeatingPlayer}
		onback={goBack}
		onclaimseat={claimSeat}
	/>
{:else if step === 'decks'}
	<SetupStepShell
		title={$_('setup.choose_decks_title')}
		onback={goBack}
		primaryLabel={$_('setup.continue')}
		onprimary={() => navigateStep('rules')}
		primaryDisabled={selectedDeckIds.length === 0}
	>
		<SetupDecksStep
			{decks}
			{decksLoading}
			{selectedDeckIds}
			ontoggledeck={toggleDeck}
		/>
	</SetupStepShell>
{:else if step === 'rules'}
	<SetupStepShell
		title={$_('setup.rules_title')}
		onback={goBack}
		primaryLabel={$_('setup.continue')}
		onprimary={() => navigateStep('starting')}
		primaryDisabled={(timerEnabled &&
			(!timerSeconds || timerSeconds < 10 || timerSeconds > 600)) ||
			!winScore ||
			winScore < 10 ||
			winScore > 1000}
	>
		<SetupRulesStep
			bind:timerEnabled
			bind:timerSeconds
			bind:volcanoRumble
			bind:winScore
		/>
	</SetupStepShell>
{:else if step === 'starting'}
	<SetupStepShell
		title={$_('setup.who_goes_first_title')}
		onback={goBack}
		primaryLabel={$_('setup.start_game')}
		onprimary={handleComplete}
	>
		<SetupStartingStep
			{players}
			{sortedPlayers}
			bind:startingPlayerIdx
			onrandomize={randomize}
		/>
	</SetupStepShell>
{/if}
