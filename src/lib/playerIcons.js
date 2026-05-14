import {
	Crown,
	Dog,
	Rocket,
	Ghost,
	Sword,
	Anchor,
	Trophy,
	Flame,
	Moon,
	IceCreamCone,
	// Pantry (pinch unlock)
	Donut,
	Banana,
	Drumstick,
	Croissant,
	Pizza,
	Microwave,
	Soup,
	ChefHat,
	Cookie,
	Worm,
	// Menagerie (MAGIC unlock)
	Brain,
	Bone,
	Tornado,
	Snail,
	Bug,
	PartyPopper,
	Pyramid,
	Magnet,
	Joystick,
	TrafficCone,
	// Legacy (retired from picker, still rendered for existing games)
	Car,
	Gem,
} from 'lucide-svelte';

/** @typedef {{ id: string, component: import('svelte').Component }} PlayerIcon */

/** @type {PlayerIcon[]} */
export const BASE_PLAYER_ICONS = [
	{ id: 'Crown', component: Crown },
	{ id: 'Dog', component: Dog },
	{ id: 'Rocket', component: Rocket },
	{ id: 'Ghost', component: Ghost },
	{ id: 'Sword', component: Sword },
	{ id: 'Anchor', component: Anchor },
	{ id: 'Trophy', component: Trophy },
	{ id: 'Flame', component: Flame },
	{ id: 'Moon', component: Moon },
	{ id: 'IceCreamCone', component: IceCreamCone },
];

/** @type {PlayerIcon[]} */
export const PANTRY_ICONS = [
	{ id: 'Donut', component: Donut },
	{ id: 'Banana', component: Banana },
	{ id: 'Drumstick', component: Drumstick },
	{ id: 'Croissant', component: Croissant },
	{ id: 'Pizza', component: Pizza },
	{ id: 'Microwave', component: Microwave },
	{ id: 'Soup', component: Soup },
	{ id: 'ChefHat', component: ChefHat },
	{ id: 'Cookie', component: Cookie },
	{ id: 'Worm', component: Worm },
];

/** @type {PlayerIcon[]} */
export const MENAGERIE_ICONS = [
	{ id: 'Brain', component: Brain },
	{ id: 'Bone', component: Bone },
	{ id: 'Tornado', component: Tornado },
	{ id: 'Snail', component: Snail },
	{ id: 'Bug', component: Bug },
	{ id: 'PartyPopper', component: PartyPopper },
	{ id: 'Pyramid', component: Pyramid },
	{ id: 'Magnet', component: Magnet },
	{ id: 'Joystick', component: Joystick },
	{ id: 'TrafficCone', component: TrafficCone },
];

/** @type {PlayerIcon[]} */
export const LEGACY_ICONS = [
	{ id: 'Car', component: Car },
	{ id: 'Gem', component: Gem },
];

/**
 * Default exported set — what consumers iterate when they want "all selectable
 * icons in display order." Includes base only; the secret sets are appended
 * by callers that know about unlock state.
 *
 * Note: this is kept as `PLAYER_ICONS` for backwards-compat with call sites
 * that aren't unlock-aware (avatars, score lists, etc. — they use
 * `getPlayerIconComponent` for resolution, but some might iterate this list
 * for fallback defaults).
 *
 * @type {PlayerIcon[]}
 */
export const PLAYER_ICONS = BASE_PLAYER_ICONS;

const ALL_ICONS = [
	...BASE_PLAYER_ICONS,
	...PANTRY_ICONS,
	...MENAGERIE_ICONS,
	...LEGACY_ICONS,
];

/** @param {string} id */
export function getPlayerIconComponent(id) {
	return ALL_ICONS.find((i) => i.id === id)?.component ?? null;
}

/** @type {Array<{ id: string }>} */
export const PLAYER_COLORS = [
	{ id: 'player-color-1' },
	{ id: 'player-color-2' },
	{ id: 'player-color-3' },
	{ id: 'player-color-4' },
	{ id: 'player-color-5' },
	{ id: 'player-color-6' },
	{ id: 'player-color-7' },
	{ id: 'player-color-8' },
	{ id: 'player-color-9' },
	{ id: 'player-color-10' },
];
