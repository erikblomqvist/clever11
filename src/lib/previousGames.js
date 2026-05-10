import { supabase } from './supabase.js';

export const PREVIOUS_GAMES_PAGE_SIZE = 20;

/**
 * @typedef {{
 *   name: string,
 *   icon: string,
 *   color: string,
 *   totalScore: number,
 * }} PreviousGameParticipant
 *
 * @typedef {{
 *   id: string,
 *   code: string,
 *   status: string,
 *   startedAt: string,
 *   deckNames: string[],
 *   participants: PreviousGameParticipant[],
 *   lastMoveAt: string|null,
 *   roundNumber: number,
 * }} PreviousGame
 *
 * @typedef {{
 *   games: PreviousGame[],
 *   page: number,
 *   pageSize: number,
 *   total: number,
 *   totalPages: number,
 * }} PreviousGamesPage
 */

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeStringArray(value) {
	return Array.isArray(value)
		? value.filter((item) => typeof item === 'string')
		: [];
}

/**
 * @param {string[]} ids
 */
function unique(ids) {
	return [...new Set(ids)];
}

/**
 * @param {number} page
 * @param {string} [search]
 * @returns {Promise<PreviousGamesPage>}
 */
export async function fetchPreviousGamesPage(page = 1, search = '') {
	if (!supabase) {
		throw new Error('Supabase is not configured. Check your .env file.');
	}

	const safePage = Math.max(1, page);
	const from = (safePage - 1) * PREVIOUS_GAMES_PAGE_SIZE;
	const to = from + PREVIOUS_GAMES_PAGE_SIZE - 1;

	let searchGameIds = /** @type {string[]} */ ([]);
	if (search) {
		const { data: matchingPlayers } = await supabase
			.from('game_players')
			.select('game_id')
			.ilike('name', `%${search}%`);

		searchGameIds = unique((matchingPlayers ?? []).map((r) => r.game_id));
	}

	let query = supabase
		.from('games')
		.select(
			'id, code, status, selected_decks, created_at, current_round_id',
			{ count: 'exact' },
		)
		.neq('status', 'finished');

	if (search) {
		if (searchGameIds.length > 0) {
			query = query.or(
				`code.ilike.%${search}%,id.in.(${searchGameIds.join(',')})`,
			);
		} else {
			query = query.ilike('code', `%${search}%`);
		}
	}

	const {
		data: gameRows,
		count,
		error,
	} = await query.order('created_at', { ascending: false }).range(from, to);

	if (error) {
		throw new Error(error.message);
	}

	const rows = gameRows ?? [];
	const total = count ?? rows.length;
	const gameIds = rows.map((row) => row.id);
	const deckIds = unique(
		rows.flatMap((row) => normalizeStringArray(row.selected_decks)),
	);

	const [
		{ data: playerRows, error: playersError },
		{ data: deckRows, error: decksError },
		{ data: roundRows, error: roundsError },
	] = await Promise.all([
		gameIds.length
			? supabase
					.from('game_players')
					.select(
						'game_id, name, turn_order, icon, color, total_score',
					)
					.in('game_id', gameIds)
			: Promise.resolve({ data: [] }),
		deckIds.length
			? supabase.from('decks').select('id, name').in('id', deckIds)
			: Promise.resolve({ data: [] }),
		gameIds.length
			? supabase
					.from('game_rounds')
					.select('id, game_id, round_number')
					.in('game_id', gameIds)
			: Promise.resolve({ data: [] }),
	]);

	const relatedError = playersError ?? decksError ?? roundsError;
	if (relatedError) {
		throw new Error(relatedError.message);
	}

	const playersByGameId = new Map();
	for (const player of playerRows ?? []) {
		const players = playersByGameId.get(player.game_id) ?? [];
		players.push(player);
		playersByGameId.set(player.game_id, players);
	}

	const deckNameById = new Map(
		(deckRows ?? []).map((deck) => [deck.id, deck.name]),
	);
	const gameIdByRoundId = new Map(
		(roundRows ?? []).map((round) => [round.id, round.game_id]),
	);
	const roundNumberByRoundId = new Map(
		(roundRows ?? []).map((round) => [round.id, round.round_number]),
	);
	const roundIds = [...gameIdByRoundId.keys()];

	const { data: answerRows, error: answersError } = roundIds.length
		? await supabase
				.from('player_answers')
				.select('round_id, answered_at')
				.in('round_id', roundIds)
				.order('answered_at', { ascending: false })
		: { data: [] };

	if (answersError) {
		throw new Error(answersError.message);
	}

	const latestMoveByGameId = new Map();
	for (const answer of answerRows ?? []) {
		const gameId = gameIdByRoundId.get(answer.round_id);
		if (gameId && !latestMoveByGameId.has(gameId)) {
			latestMoveByGameId.set(gameId, answer.answered_at);
		}
	}

	return {
		games: rows.map((row) => {
			const players = (playersByGameId.get(row.id) ?? []).sort(
				(a, b) => a.turn_order - b.turn_order,
			);
			const selectedDeckIds = normalizeStringArray(row.selected_decks);

			return {
				id: row.id,
				code: row.code,
				status: row.status,
				startedAt: row.created_at,
				deckNames: selectedDeckIds.map(
					(id) => deckNameById.get(id) ?? id,
				),
				participants: players.map((player) => ({
					name: player.name,
					icon: player.icon ?? '',
					color: player.color ?? 'player-color-1',
					totalScore: player.total_score ?? 0,
				})),
				lastMoveAt: latestMoveByGameId.get(row.id) ?? null,
				roundNumber:
					roundNumberByRoundId.get(row.current_round_id) ?? 1,
			};
		}),
		page: safePage,
		pageSize: PREVIOUS_GAMES_PAGE_SIZE,
		total,
		totalPages: Math.max(1, Math.ceil(total / PREVIOUS_GAMES_PAGE_SIZE)),
	};
}
