<script>
	import { _ } from 'svelte-i18n';
	import Button from './Button.svelte';

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
	<Button text={$_('home.new_game')} onclick={onnewgame} />
	<Button
		variant="secondary"
		text={$_('home.load_game')}
		onclick={onloadgame}
	/>
	<Button
		variant="secondary"
		text={$_('home.previous_games')}
		onclick={onpreviousgames}
	/>
</div>

<style>
	.home-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 16rem;

		& :global(.btn) {
			box-shadow: var(--dynamic-shadow);
			/* Optional: smoothing the shadow movement slightly if it feels jittery */
			transition:
				background-color 0s,
				scale var(--transition-default-duration) ease-out,
				box-shadow 0.1s linear;
		}
	}
</style>
