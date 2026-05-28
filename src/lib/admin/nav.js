export const NAV_ITEMS = [
	{ id: 'dashboard', label: 'Dashboard', icon: 'chip', path: '/admin' },
	{ id: 'decks', label: 'Decks', icon: 'deck', path: '/admin/decks' },
	{
		id: 'questions',
		label: 'Questions',
		icon: 'question',
		path: '/admin/questions',
	},
	{
		id: 'quality',
		label: 'Quality',
		icon: 'quality',
		path: '/admin/question-quality',
	},
	{
		id: 'import',
		label: 'Import',
		icon: 'import',
		path: '/admin/questions/import',
	},
	{ id: 'users', label: 'Users', icon: 'users', path: '/admin/users' },
];

export function getActiveId(pathname) {
	for (let i = NAV_ITEMS.length - 1; i > 0; i--) {
		const item = NAV_ITEMS[i];
		if (pathname === item.path || pathname.startsWith(item.path + '/')) {
			return item.id;
		}
	}
	return 'dashboard';
}
