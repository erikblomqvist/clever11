/**
 * @typedef {'active'|'passed'|'out'|'removed'} PlayerStatus
 *
 * @typedef {{
 *   id: string,
 *   dbId: string|null,
 *   name: string,
 *   icon: string,
 *   color: string,
 *   seatPosition: number,
 *   turnOrder: number,
 *   totalScore: number,
 *   roundScore: number,
 *   status: PlayerStatus,
 * }} GamePlayer
 *
 * @typedef {{
 *   id: string,
 *   type: import('$lib/data/questionTypes.js').QuestionType,
 *   text: string,
 *   deck: string,
 *   deckIcon: string|null,
 *   options: string[],
 *   correctAnswers: import('$lib/data/game.js').CorrectAnswer[],
 *   answerMedia: object[],
 *   mileage: number,
 * }} GameQuestion
 *
 * @typedef {{
 *   blobIndex: number,
 *   playerId: string,
 *   previousRoundScore: number,
 *   previousStatus: PlayerStatus,
 *   previousCurrentPlayerId: string|null,
 *   previousLastPlayerId: string|null,
 *   answerId?: string|null,
 *   deleteWhenPersisted?: boolean,
 *   [key: string]: any,
 * }} LastAnswerMove
 *
 * @typedef {{
 *   roundNumber: number,
 *   question: GameQuestion,
 *   answeredBlobs: number[],
 *   blobResults: Record<number, boolean>,
 *   lastPlayerId: string|null,
 *   dbId: string|null,
 *   lastAnswerMove: LastAnswerMove|null,
 * }} Round
 *
 * @typedef {{
 *   status: 'idle'|'playing'|'round_review'|'finished',
 *   code: string|null,
 *   dbGameId: string|null,
 *   winScore: number,
 *   players: GamePlayer[],
 *   currentPlayerId: string|null,
 *   startingTurnOrderIndex: number,
 *   selectedDeckIds: string[],
 *   usedQuestionIds: string[],
 *   currentRound: Round|null,
 *   turnTimerSeconds: number|null,
 *   volcanoRumble: boolean,
 *   roundVote: boolean|null,
 * }} GameState
 *
 * @typedef {{
 *   playerId: string,
 *   previousRoundScore: number,
 *   newRoundScore: number,
 *   isCorrect: boolean,
 *   nextPlayerId: string|null,
 *   roundIsOver: boolean,
 * }} RevealBlobResult
 */

import { getForcedFirstQuestionId } from './testingOptions.js';
import * as gamePersist from './gamePersist.js';
import { SupabaseGameAdapter } from './gameAdapter.js';

/** @type {GameQuestion[]} */
let questionPool = gamePersist.MOCK_QUESTIONS;

export class Game {
	/** @type {'idle'|'playing'|'round_review'|'finished'} */
	status = $state('idle');
	/** @type {string|null} */
	code = $state(null);
	/** @type {string|null} */
	dbGameId = $state(null);
	winScore = $state(50);
	/** @type {GamePlayer[]} */
	players = $state([]);
	/** @type {string|null} */
	currentPlayerId = $state(null);
	startingTurnOrderIndex = $state(0);
	/** @type {string[]} */
	selectedDeckIds = $state([]);
	/** @type {string[]} */
	usedQuestionIds = $state([]);
	/** @type {Round|null} */
	currentRound = $state(null);
	/** @type {number|null} */
	turnTimerSeconds = $state(null);
	/** @type {boolean} */
	volcanoRumble = $state(false);
	/** @type {boolean|null} Vote on current round's question quality: true=up, false=down, null=none */
	roundVote = $state(null);
	/** @type {boolean} True if a persistence operation is in progress */
	isSyncing = $state(false);

	constructor(adapter) {
		this.adapter = adapter;
	}

	// --- Derived queries ---

	get currentPlayer() {
		return this.players.find((p) => p.id === this.currentPlayerId) ?? null;
	}

	get blobStates() {
		return this.currentRound?.question
			? this.currentRound.question.options.map((_, i) => {
					return this.currentRound?.blobResults?.[i] ?? null;
				})
			: [];
	}

	get roundIsOver() {
		if (!this.currentRound) return false;
		const allAnswered =
			this.currentRound.answeredBlobs.length >=
			this.currentRound.question.options.length;
		const allInactive = this.players.every(
			(p) =>
				p.status === 'passed' ||
				p.status === 'out' ||
				p.status === 'removed',
		);
		return allAnswered || allInactive;
	}

	get undoIsAvailable() {
		const round = this.currentRound;
		if (!round?.lastAnswerMove) return false;
		const lastAnsweredBlob = round.answeredBlobs.at(-1);
		return lastAnsweredBlob === round.lastAnswerMove.blobIndex;
	}

	get undoableBlobIndex() {
		return this.undoIsAvailable
			? (this.currentRound?.lastAnswerMove?.blobIndex ?? null)
			: null;
	}

	get canSkipRound() {
		if (!this.currentRound) return false;
		if (this.currentRound.answeredBlobs.length !== 0) return false;
		return this.players
			.filter((p) => p.status !== 'removed')
			.every((p) => p.status === 'active');
	}

	// --- Internal Helpers ---

	generateCode() {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		return Array.from(
			{ length: 5 },
			() => chars[Math.floor(Math.random() * chars.length)],
		).join('');
	}

	generateId() {
		return crypto.randomUUID();
	}

	pickNextQuestion() {
		const available = questionPool.filter(
			(q) => !this.usedQuestionIds.includes(q.id),
		);
		const pool = available.length > 0 ? available : questionPool;
		if (available.length === 0) this.usedQuestionIds = [];

		// Weighted random selection based on mileage: Weight = 1 / (mileage + 1)
		const weightedPool = pool.map((q) => ({
			question: q,
			weight: 1 / (q.mileage + 1),
		}));

		const totalWeight = weightedPool.reduce(
			(sum, item) => sum + item.weight,
			0,
		);
		let random = Math.random() * totalWeight;

		let q = pool[0]; // Fallback
		for (const item of weightedPool) {
			if (random < item.weight) {
				q = item.question;
				break;
			}
			random -= item.weight;
		}

		this.usedQuestionIds.push(q.id);
		return q;
	}

	lockPortraitOnPhone() {
		if (typeof screen === 'undefined' || !('orientation' in screen)) return;
		const isPhone = window.matchMedia(
			'(max-width: 768px) and (pointer: coarse)',
		).matches;
		if (isPhone) {
			screen.orientation.lock('portrait').catch(() => {});
		}
	}

	getNextActivePlayerId(currentPlayerId) {
		const sorted = [...this.players]
			.filter((p) => p.status !== 'removed')
			.sort((a, b) => a.turnOrder - b.turnOrder);
		const currentIdx = sorted.findIndex((p) => p.id === currentPlayerId);
		for (let i = 1; i <= sorted.length; i++) {
			const idx = (currentIdx + i) % sorted.length;
			if (sorted[idx].status === 'active') return sorted[idx].id;
		}
		return null;
	}

	// --- Actions ---

	loadDemoGame(snapshot) {
		const demoGame = cloneJson(snapshot);
		const demoQuestion = demoGame.currentRound?.question ?? null;

		this.status = demoGame.status;
		this.code = demoGame.code ?? 'DEMO';
		this.dbGameId = null;
		this.winScore = demoGame.winScore ?? 50;
		this.players = demoGame.players.map((player) => ({
			...player,
			dbId: null,
		}));
		this.currentPlayerId = demoGame.currentPlayerId;
		this.startingTurnOrderIndex = demoGame.startingTurnOrderIndex ?? 0;
		this.selectedDeckIds = demoGame.selectedDeckIds ?? [];
		this.usedQuestionIds =
			demoGame.usedQuestionIds ?? (demoQuestion ? [demoQuestion.id] : []);
		this.turnTimerSeconds = demoGame.turnTimerSeconds ?? null;
		this.volcanoRumble = demoGame.volcanoRumble ?? false;
		this.roundVote = null;
		this.isSyncing = false;

		this.currentRound = demoGame.currentRound
			? {
					...demoGame.currentRound,
					answeredBlobs: [...demoGame.currentRound.answeredBlobs],
					blobResults: { ...demoGame.currentRound.blobResults },
					dbId: null,
					lastAnswerMove: demoGame.currentRound.lastAnswerMove
						? {
								...demoGame.currentRound.lastAnswerMove,
								answerId: null,
							}
						: null,
				}
			: null;

		questionPool = demoQuestion
			? [
					demoQuestion,
					...gamePersist.MOCK_QUESTIONS.filter(
						(question) => question.id !== demoQuestion.id,
					),
				]
			: gamePersist.MOCK_QUESTIONS;

		this.lockPortraitOnPhone();
	}

	async initGame(setup) {
		this.isSyncing = true;
		try {
			questionPool = await this.adapter.fetchQuestionsForDecks(
				setup.selectedDeckIds,
			);

			const gamePlayers = setup.players.map((p, i) => ({
				id: `player-${i}`,
				dbId: /** @type {string|null} */ (null),
				name: p.name,
				icon: p.icon,
				color: p.color,
				seatPosition: p.seatPosition ?? 0,
				turnOrder: p.turnOrder ?? i,
				totalScore: 0,
				roundScore: 0,
				status: /** @type {PlayerStatus} */ ('active'),
			}));

			const startingPlayer =
				gamePlayers[setup.startingPlayerIndex] ?? gamePlayers[0];
			const code = this.generateCode();
			const firstQuestion =
				(await this.adapter.fetchForcedQuestion(
					getForcedFirstQuestionId(),
				)) ?? this.pickNextQuestion();

			this.status = 'playing';
			this.code = code;
			this.dbGameId = null;
			this.winScore = setup.winScore ?? 50;
			this.players = gamePlayers;
			this.currentPlayerId = startingPlayer.id;
			this.startingTurnOrderIndex = startingPlayer.turnOrder;
			this.selectedDeckIds = setup.selectedDeckIds;
			this.usedQuestionIds = [firstQuestion.id];
			this.turnTimerSeconds = setup.turnTimerSeconds ?? null;
			this.volcanoRumble = setup.volcanoRumble ?? false;
			this.roundVote = null;
			this.currentRound = {
				roundNumber: 1,
				question: firstQuestion,
				answeredBlobs: [],
				blobResults: {},
				lastPlayerId: null,
				dbId: null,
				lastAnswerMove: null,
			};

			this.lockPortraitOnPhone();

			await this.adapter.persistNewGame(this);
		} finally {
			this.isSyncing = false;
		}
	}

	revealBlob(blobIndex, isCorrect, options = {}) {
		if (!this.currentRound) return null;

		const playerIdx = this.players.findIndex(
			(p) => p.id === this.currentPlayerId,
		);
		if (playerIdx === -1) return null;

		const actingPlayerId = this.currentPlayerId;
		const actingPlayerDbId = this.players[playerIdx].dbId;
		const previousRoundScore = this.players[playerIdx].roundScore;
		const answerId = this.generateId();

		const round = this.currentRound;
		round.lastAnswerMove = {
			blobIndex,
			playerId: actingPlayerId,
			previousRoundScore,
			previousStatus: this.players[playerIdx].status,
			previousCurrentPlayerId: actingPlayerId,
			previousLastPlayerId: round.lastPlayerId,
			answerId,
			deleteWhenPersisted: false,
		};
		round.answeredBlobs.push(blobIndex);
		round.blobResults[blobIndex] = isCorrect;
		round.lastPlayerId = actingPlayerId;

		if (isCorrect) {
			this.players[playerIdx].roundScore += 1;
		} else {
			this.players[playerIdx].roundScore = 0;
			this.players[playerIdx].status = 'out';
		}

		const roundIsOver = this.roundIsOver;
		const nextPlayerId = roundIsOver
			? null
			: this.getNextActivePlayerId(actingPlayerId);

		if (nextPlayerId && !options.deferAdvance) {
			this.currentPlayerId = nextPlayerId;
		}

		this.isSyncing = true;
		this.adapter
			.persistBlobReveal(
				this,
				round,
				blobIndex,
				isCorrect,
				actingPlayerDbId,
				round.lastAnswerMove,
			)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});

		return {
			playerId: actingPlayerId,
			previousRoundScore,
			newRoundScore: this.players[playerIdx].roundScore,
			isCorrect,
			nextPlayerId,
			roundIsOver,
		};
	}
	advanceCurrentPlayer(expectedCurrentPlayerId = this.currentPlayerId) {
		if (this.status !== 'playing' || this.roundIsOver) return false;
		if (this.currentPlayerId !== expectedCurrentPlayerId) return false;

		const nextId = this.getNextActivePlayerId(expectedCurrentPlayerId);
		if (!nextId) return false;

		this.currentPlayerId = nextId;
		this.isSyncing = true;
		this.adapter
			.syncGameState(this)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});
		return true;
	}

	undoLastMove() {
		const round = this.currentRound;
		const move = round?.lastAnswerMove;
		if (!round || !move || !this.undoIsAvailable) return;

		const playerIdx = this.players.findIndex((p) => p.id === move.playerId);
		if (playerIdx === -1) return;

		const answerId = move.answerId;

		round.answeredBlobs.pop();
		delete round.blobResults[move.blobIndex];
		round.lastPlayerId = move.previousLastPlayerId;
		round.lastAnswerMove = null;

		this.players[playerIdx].roundScore = move.previousRoundScore;
		this.players[playerIdx].status = move.previousStatus;
		this.currentPlayerId = move.previousCurrentPlayerId;

		this.isSyncing = true;
		if (answerId) {
			this.adapter
				.deletePersistedAnswer({ answerId })
				.catch(console.error);
		} else {
			move.deleteWhenPersisted = true;
		}
		this.adapter
			.syncGameState(this)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});
	}

	passCurrentPlayer() {
		const playerIdx = this.players.findIndex(
			(p) => p.id === this.currentPlayerId,
		);
		if (playerIdx === -1) return;

		this.players[playerIdx].status = 'passed';
		if (this.currentRound) {
			this.currentRound.lastPlayerId = this.currentPlayerId;
			this.currentRound.lastAnswerMove = null;
		}

		if (this.roundIsOver) {
			this.endRound();
		} else {
			const nextId = this.getNextActivePlayerId(this.currentPlayerId);
			if (nextId) this.currentPlayerId = nextId;
			this.isSyncing = true;
			this.adapter
				.syncGameState(this)
				.catch(console.error)
				.finally(() => {
					this.isSyncing = false;
				});
		}
	}

	skipRound() {
		this.players.forEach((_, idx) => {
			if (this.players[idx].status === 'active') {
				this.players[idx].status = 'passed';
			}
		});
		if (this.currentRound) {
			this.currentRound.lastAnswerMove = null;
		}
		this.endRound();
	}

	endRound() {
		if (this.currentRound) this.currentRound.lastAnswerMove = null;

		this.players.forEach((_, idx) => {
			if (this.players[idx].status !== 'removed') {
				this.players[idx].totalScore += this.players[idx].roundScore;
			}
		});

		const winner = this.players.find(
			(p) => p.status !== 'removed' && p.totalScore >= this.winScore,
		);
		this.status = winner ? 'finished' : 'round_review';
		this.isSyncing = true;
		this.adapter
			.syncGameState(this)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});
	}

	addPlayer(params) {
		const activeCount = this.players.filter(
			(p) => p.status !== 'removed',
		).length;
		if (activeCount >= 8) return false;

		const maxIdNum = this.players.reduce((max, p) => {
			const num = parseInt(p.id.replace('player-', ''), 10);
			return num > max ? num : max;
		}, -1);
		const newId = `player-${maxIdNum + 1}`;

		const maxTurnOrder = this.players.reduce(
			(max, p) => (p.turnOrder > max ? p.turnOrder : max),
			-1,
		);

		/** @type {GamePlayer} */
		const newPlayer = {
			id: newId,
			dbId: null,
			name: params.name,
			icon: params.icon,
			color: params.color,
			seatPosition: params.seatPosition,
			turnOrder: maxTurnOrder + 1,
			totalScore: 0,
			roundScore: 0,
			status: 'active',
		};

		this.players.push(newPlayer);
		this.isSyncing = true;
		this.adapter
			.persistNewPlayer(this, newPlayer)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});

		return newId;
	}

	removePlayer(playerId) {
		const playerIdx = this.players.findIndex((p) => p.id === playerId);
		if (playerIdx === -1) return false;

		const player = this.players[playerIdx];
		if (player.status === 'removed') return false;

		const activeCount = this.players.filter(
			(p) => p.status !== 'removed',
		).length;
		if (activeCount <= 2) return false;

		let nextId = null;
		if (this.currentPlayerId === playerId) {
			nextId = this.getNextActivePlayerId(playerId);
		}

		this.players[playerIdx].status = 'removed';
		this.players[playerIdx].seatPosition = -1;
		this.players[playerIdx].roundScore = 0;

		if (nextId) this.currentPlayerId = nextId;
		this.isSyncing = true;
		this.adapter
			.syncGameState(this)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});
		return true;
	}

	replacePlayer(playerId, replacement) {
		const player = this.players.find((p) => p.id === playerId);
		if (!player || player.status === 'removed') return false;

		player.name = replacement.name;
		player.icon = replacement.icon;
		player.color = replacement.color;
		this.isSyncing = true;
		this.adapter
			.syncGameState(this)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});
		return true;
	}

	setRoundVote(vote) {
		this.roundVote = vote;
	}

	toggleVolcanoRumble() {
		this.volcanoRumble = !this.volcanoRumble;
		if (this.dbGameId) {
			this.isSyncing = true;
			this.adapter
				.syncGameState(this)
				.catch(console.error)
				.finally(() => {
					this.isSyncing = false;
				});
		}
	}

	startNextRound() {
		if (this.status === 'playing') return;

		if (this.roundVote !== null) {
			this.isSyncing = true;
			this.adapter
				.persistQuestionVote(this)
				.catch(console.error)
				.finally(() => {
					this.isSyncing = false;
				});
		}
		this.roundVote = null;

		const question = this.pickNextQuestion();
		const activePlayers = this.players.filter(
			(p) => p.status !== 'removed',
		);
		const allPassed = activePlayers.every((p) => p.status === 'passed');

		this.players.forEach((_, idx) => {
			if (this.players[idx].status !== 'removed') {
				this.players[idx].status = 'active';
				this.players[idx].roundScore = 0;
			}
		});

		const sorted = [...activePlayers].sort(
			(a, b) => a.turnOrder - b.turnOrder,
		);

		if (!allPassed) {
			this.startingTurnOrderIndex =
				(this.startingTurnOrderIndex + 1) % sorted.length;
		}

		const nextStarter = sorted[this.startingTurnOrderIndex % sorted.length];
		this.currentPlayerId = nextStarter.id;

		this.currentRound = {
			roundNumber: (this.currentRound?.roundNumber ?? 0) + 1,
			question,
			answeredBlobs: [],
			blobResults: {},
			lastPlayerId: null,
			dbId: null,
			lastAnswerMove: null,
		};

		this.status = 'playing';

		this.isSyncing = true;
		this.adapter
			.dbCreateNewRound(this)
			.catch(console.error)
			.finally(() => {
				this.isSyncing = false;
			});
	}

	async loadGame(code) {
		this.isSyncing = true;
		try {
			const state = await this.adapter.loadGame(code);

			this.status = /** @type {any} */ (state.status);
			this.code = state.code;
			this.dbGameId = state.dbGameId;
			this.winScore = state.winScore;
			this.players = state.players;
			this.currentPlayerId = state.currentPlayerId;
			this.startingTurnOrderIndex = state.startingTurnOrderIndex;
			this.selectedDeckIds = state.selectedDeckIds;
			this.usedQuestionIds = state.usedQuestionIds;
			this.turnTimerSeconds = state.turnTimerSeconds ?? null;
			this.volcanoRumble = state.volcanoRumble ?? false;
			this.roundVote = null;
			this.currentRound = state.currentRound;

			questionPool = state.questionPool;

			this.lockPortraitOnPhone();
		} finally {
			this.isSyncing = false;
		}
	}
}

// --- Singleton instance ---

export const game = new Game(new SupabaseGameAdapter());

// --- Helpers ---

/** @template T @param {T} value @returns {T} */
function cloneJson(value) {
	return JSON.parse(JSON.stringify(value));
}
