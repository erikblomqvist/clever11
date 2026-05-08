<script>
	import GameView from './GameView.svelte';
	import { loadDemoGame } from '../lib/game.svelte.js';
	import { DEMO_SCENARIOS } from '../demo/scenarios.js';

	/** @type {{ onback: () => void }} */
	let { onback } = $props();

	/** @type {string|null} */
	let activeScenarioId = $state(null);

	const activeScenario = $derived(
		DEMO_SCENARIOS.find((scenario) => scenario.id === activeScenarioId) ?? null,
	);

	function openScenario(/** @type {(typeof DEMO_SCENARIOS)[number]} */ scenario) {
		loadDemoGame(scenario.snapshot);
		activeScenarioId = scenario.id;
	}

	function backToSelector() {
		activeScenarioId = null;
	}
</script>

{#if activeScenario}
	<div class="demo-game-shell">
		<div class="demo-game-toolbar">
			<button class="demo-game-toolbar__btn" type="button" onclick={backToSelector}>
				Back to demo states
			</button>
			<span class="demo-game-toolbar__label">{activeScenario.title}</span>
		</div>
		<GameView onstartover={backToSelector} />
	</div>
{:else}
	<main class="main--demo-selector">
		<section class="demo-selector" aria-labelledby="demo-selector-title">
			<div class="demo-selector__header">
				<p class="demo-selector__eyebrow">Smart 10 Demo</p>
				<h1 id="demo-selector-title" class="demo-selector__title">
					Pick a game state
				</h1>
				<p class="demo-selector__description">
					These examples use local fixture data and render through the real game
					views.
				</p>
			</div>

			<div class="demo-selector__actions">
				{#each DEMO_SCENARIOS as scenario (scenario.title)}
					<button
						class="demo-card"
						type="button"
						onclick={() => openScenario(scenario)}
					>
						<span class="demo-card__title">{scenario.title}</span>
						<span class="demo-card__description">{scenario.description}</span>
					</button>
				{/each}
			</div>

			<button class="demo-selector__back" type="button" onclick={onback}>
				Back to app
			</button>
		</section>
	</main>
{/if}

<style>
	.demo-game-shell {
		position: relative;
	}

	.demo-game-toolbar {
		position: fixed;
		z-index: 20;
		top: max(0.75rem, env(safe-area-inset-top));
		left: max(0.75rem, env(safe-area-inset-left));
		display: flex;
		align-items: center;
		gap: 0.75rem;
		max-width: calc(100vw - 1.5rem);
	}

	.demo-game-toolbar__btn,
	.demo-selector__back {
		border: 1px solid hsl(0 0% 100% / 0.18);
		border-radius: 999px;
		background: hsl(0 0% 0% / 0.45);
		color: var(--white);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-sm);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.demo-game-toolbar__btn {
		padding: 0.55rem 0.9rem;
	}

	.demo-game-toolbar__label {
		overflow: hidden;
		border-radius: 999px;
		padding: 0.45rem 0.75rem;
		background: hsl(0 0% 0% / 0.3);
		color: hsl(0 0% 100% / 0.78);
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-lg);
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.main--demo-selector {
		padding: max(2rem, env(safe-area-inset-top)) 1rem
			max(2rem, env(safe-area-inset-bottom));
		background:
			radial-gradient(circle at top, hsl(32 95% 58% / 0.35), transparent 34rem),
			linear-gradient(160deg, hsl(0 0% 12%) 0%, hsl(0 0% 5%) 100%);
	}

	.demo-selector {
		width: min(44rem, 100%);
		border: 1px solid hsl(0 0% 100% / 0.12);
		border-radius: 1.5rem;
		padding: clamp(1.25rem, 4vw, 2rem);
		background: hsl(0 0% 0% / 0.28);
		box-shadow: 0 1.5rem 4rem hsl(0 0% 0% / 0.28);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.demo-selector__header {
		margin-bottom: 1.5rem;
		color: var(--white);
	}

	.demo-selector__eyebrow {
		margin: 0 0 0.4rem;
		color: hsl(0 0% 100% / 0.55);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-sm);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.demo-selector__title {
		margin: 0;
		font-family: 'Oswald', sans-serif;
		font-size: clamp(2.4rem, 8vw, 4.5rem);
		line-height: 0.92;
		text-transform: uppercase;
	}

	.demo-selector__description {
		max-width: 32rem;
		margin: 0.9rem 0 0;
		color: hsl(0 0% 100% / 0.72);
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-xl);
		line-height: 1.15;
	}

	.demo-selector__actions {
		display: grid;
		gap: 0.75rem;
	}

	.demo-card {
		display: grid;
		gap: 0.25rem;
		width: 100%;
		border: 1px solid hsl(0 0% 100% / 0.12);
		border-radius: 1rem;
		padding: 1rem;
		background: hsl(0 0% 100% / 0.08);
		color: var(--white);
		text-align: left;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	.demo-card:hover {
		border-color: hsl(0 0% 100% / 0.24);
		background: hsl(0 0% 100% / 0.12);
		transform: translateY(-1px);
	}

	.demo-card__title {
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-xl);
		font-weight: 600;
		text-transform: uppercase;
	}

	.demo-card__description {
		color: hsl(0 0% 100% / 0.68);
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-lg);
	}

	.demo-selector__back {
		margin-top: 1.5rem;
		padding: 0.65rem 1rem;
	}
</style>
