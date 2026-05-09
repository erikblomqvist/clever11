<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{
	 *   onnewgame: () => void,
	 *   onloadgame: () => void,
	 *   onpreviousgames: () => void,
	 * }}
	 */
	let { onnewgame, onloadgame, onpreviousgames } = $props();
</script>

<div class="home-actions">
	<button class="home-btn home-btn--primary" type="button" onclick={onnewgame}>
		{$_('home.new_game')}
	</button>
	<button class="home-btn home-btn--secondary" type="button" onclick={onloadgame}>
		{$_('home.load_game')}
	</button>
	<button class="home-btn home-btn--secondary" type="button" onclick={onpreviousgames}>
		{$_('home.previous_games')}
	</button>
</div>

<style>
	.home-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 16rem;
	}

	.home-btn {
		border: none;
		border-radius: 0.5rem;
		padding: 1rem 2rem;
		font-family: var(--font-family-display);
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.home-btn--primary {
		background-color: var(--orange-700);
		color: var(--white);
	}

	.home-btn--primary:hover {
		background-color: var(--orange-800);
	}

	.home-btn--secondary {
		background-color: hsl(0 0% 100% / 0.2);
		color: var(--white);
	}

	.home-btn--secondary:hover {
		background-color: hsl(0 0% 100% / 0.3);
	}
</style>
