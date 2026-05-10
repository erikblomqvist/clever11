import {
	CirclePower,
	CircleHelp,
	ChartNoAxesColumn,
	Blocks,
	PaintBucket,
	Binary,
	CalendarDays,
} from 'lucide-svelte';

/**
 * @typedef {'boolean'|'standard'|'rank'|'chooseBetween'|'colors'|'numbers'|'centuryDecade'} QuestionType
 */

/** @type {Record<QuestionType, { label: string, cssToken: string, icon: import('svelte').Component }>} */
export const QUESTION_TYPES = {
	boolean: {
		label: 'Yes / No',
		cssToken: 'boolean',
		icon: CirclePower,
		description: 'Answer with a yes or no.',
	},
	standard: {
		label: 'Standard',
		cssToken: 'standard',
		icon: CircleHelp,
		description: 'Answer with a standard answer.',
	},
	rank: {
		label: '1 – 10',
		cssToken: 'rank',
		icon: ChartNoAxesColumn,
		description: 'Answer with a number between 1 and 10.',
	},
	chooseBetween: {
		label: 'Choose between',
		cssToken: 'choose-between',
		icon: Blocks,
		description: 'Choose between a few options.',
	},
	colors: {
		label: 'Colors',
		cssToken: 'colors',
		icon: PaintBucket,
		description: 'Answer with a color.',
	},
	numbers: {
		label: 'Numbers',
		cssToken: 'numbers',
		icon: Binary,
		description: 'Answer with a number.',
	},
	centuryDecade: {
		label: 'Century / Decade',
		cssToken: 'century-decade',
		icon: CalendarDays,
		description: 'Answer with a century or decade.',
	},
};
