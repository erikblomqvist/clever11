import newRound from './fixtures/new-round.json';
import threeCorrect from './fixtures/three-correct.json';
import streakActive from './fixtures/streak-active.json';
import finishedRound from './fixtures/finished-round.json';

export const DEMO_SCENARIOS = [
	{
		id: 'new-round',
		title: 'A new round has started',
		description: 'Round 2 is fresh, all players are active, and no answers are revealed.',
		snapshot: newRound,
	},
	{
		id: 'three-correct',
		title: 'A few turns into a round',
		description: 'Ava has three correct answers while the round is still in progress.',
		snapshot: threeCorrect,
	},
	{
		id: 'streak-active',
		title: 'A player is on a streak',
		description: 'Ava has four correct answers and the wheel is electric on her turn.',
		snapshot: streakActive,
	},
	{
		id: 'finished-round',
		title: 'A finished round',
		description: 'All answers are revealed and the real round review panel is shown.',
		snapshot: finishedRound,
	},
];
