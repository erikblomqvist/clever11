<script>
	import { locale } from 'svelte-i18n';
	import { setLocale } from '../lib/i18n.js';

	const LANGUAGES = [
		{ code: 'en', label: 'EN' },
		{ code: 'sv', label: 'SV' },
		{ code: 'no', label: 'NO' },
	];
</script>

<nav class="home-language" aria-label="Language">
	{#each LANGUAGES as lang (lang.code)}
		<button
			class="home-lang-btn"
			class:home-lang-btn--active={$locale === lang.code}
			type="button"
			onclick={() => setLocale(lang.code)}
		>
			{lang.label}
		</button>
	{/each}
</nav>

<style>
	.home-language {
		position: fixed;
		bottom: max(1rem, env(safe-area-inset-bottom));
		right: max(1rem, env(safe-area-inset-right));
		display: flex;
		gap: 0.25rem;
	}

	.home-lang-btn {
		border: 2px solid hsl(0 0% 100% / 0.4);
		border-radius: 0.375rem;
		padding: 0.25rem 0.5rem;
		background: transparent;
		color: hsl(0 0% 100% / 0.7);
		font-family: var(--font-family-display);
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition:
			background-color 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.home-lang-btn:hover {
		background-color: hsl(0 0% 100% / 0.15);
		color: var(--white);
	}

	.home-lang-btn--active {
		background-color: hsl(0 0% 100% / 0.2);
		border-color: var(--white);
		color: var(--white);
	}
</style>
