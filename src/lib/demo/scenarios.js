import newRound from './fixtures/new-round.json';
import threeCorrect from './fixtures/three-correct.json';
import streakActive from './fixtures/streak-active.json';
import lastAnswer from './fixtures/last-answer.json';
import finishedRound from './fixtures/finished-round.json';
import rankMidRound from './fixtures/rank-mid-round.json';
import winnerSingle from './fixtures/winner-single.json';
import winnersJoint from './fixtures/winners-joint.json';
import winnersFourWay from './fixtures/winners-four-way.json';
import turnTimerRunning from './fixtures/turn-timer-running.json';

export const DEMO_SCENARIOS = [
	// TEMP: remove after #49 verification
	{
		id: 'turn-timer-running',
		title: 'Turn timer running (20s)',
		description:
			'Temporary scenario to verify the flush border and rounded corners fix.',
		snapshot: turnTimerRunning,
	},
	{
		id: 'new-round',
		title: 'A new round has started',
		description:
			'Round 2 is fresh, all players are active, and no answers are revealed.',
		snapshot: newRound,
	},
	{
		id: 'three-correct',
		title: 'A few turns into a round',
		description:
			'Ava has three correct answers while the round is still in progress.',
		snapshot: threeCorrect,
	},
	{
		id: 'streak-active',
		title: 'A player is on a streak',
		description:
			'Ava has four correct answers and the wheel is electric on her turn.',
		snapshot: streakActive,
	},
	{
		id: 'last-answer',
		title: 'The very last answer',
		description: 'Only one answer left to reveal! The volcano is erupting.',
		snapshot: lastAnswer,
	},
	{
		id: 'finished-round',
		title: 'A finished round',
		description:
			'All answers are revealed and the real round review panel is shown.',
		snapshot: finishedRound,
	},
	{
		id: 'rank-mid-round',
		title: 'Rank question in progress',
		description:
			'A 1–10 rank round with a few blobs adjudicated. Tap a covered blob to see disabled buttons.',
		snapshot: rankMidRound,
	},
	{
		id: 'winner-single',
		title: 'Game Over: Single Winner',
		description: 'A clear champion has emerged!',
		snapshot: winnerSingle,
	},
	{
		id: 'winners-joint',
		title: 'Game Over: Joint Winners',
		description: 'A tie at the top! Multiple players shared the victory.',
		snapshot: winnersJoint,
	},
	{
		id: 'winners-four-way',
		title: 'Game Over: 4-way Tie',
		description: 'Chaos! Four players reached the finish line together.',
		snapshot: winnersFourWay,
	},
];
