<script>
	let { name, size = 18 } = $props();

	const paths = {
		chip: '<rect x="5" y="5" width="14" height="14" rx="1.5"/><path d="M9 9h6v6H9z"/><path d="M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3M9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3"/>',
		deck: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
		question:
			'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 4 2.5c-.7.5-1.5 1-1.5 2"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/>',
		quality: '<path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h6v6"/>',
		import: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
		users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 19c.5-3.2 3-5 6-5s5.5 1.8 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2 0 4 1.4 5 4"/>',
		search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
		menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/>',
		close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
		power: '<path d="M12 4v8"/><path d="M7.5 7a7 7 0 1 0 9 0"/>',
		edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/>',
		archive:
			'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		bolt: '<path d="M13 3 4 14h7l-1 7 9-11h-7z"/>',
		arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
		caret: '<path d="m9 6 6 6-6 6"/>',
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html paths[name] ?? ''}
</svg>
