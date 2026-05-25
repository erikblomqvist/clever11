<script>
	import GameView from './GameView.svelte';
	import { game } from '$lib/game';
	import { DEMO_SCENARIOS } from '$lib/demo/scenarios.js';
	import SetupStepShell from '$lib/components/setup/SetupStepShell.svelte';
	import Button from '$lib/components/Button.svelte';
	import { ChevronLeft } from 'lucide-svelte';

	/** @type {{ onback: () => void }} */
	let { onback } = $props();

	/** @type {string|null} */
	let activeScenarioId = $state(null);

	/** @type {string|null} */
	let selectedScenarioId = $state(null);

	const activeScenario = $derived(
		DEMO_SCENARIOS.find((scenario) => scenario.id === activeScenarioId) ??
			null,
	);

	function openScenario(
		/** @type {(typeof DEMO_SCENARIOS)[number]} */ scenario,
	) {
		game.loadDemoGame(scenario.snapshot);
		activeScenarioId = scenario.id;
	}

	function startSelectedScenario() {
		const scenario = DEMO_SCENARIOS.find(
			(s) => s.id === selectedScenarioId,
		);
		if (scenario) {
			openScenario(scenario);
		}
	}

	function backToSelector() {
		activeScenarioId = null;
	}
</script>

{#if activeScenario}
	<div class="demo-game-shell">
		<div class="demo-game-toolbar">
			<Button
				variant="secondary"
				size="sm"
				icon={ChevronLeft}
				text="Back to scenarios"
				onclick={backToSelector}
				style="--btn-padding: 0.375rem 0.625rem"
			/>
			<span class="demo-game-toolbar__label">{activeScenario.title}</span>
		</div>
		<GameView onstartover={backToSelector} />
	</div>
{:else}
	<SetupStepShell
		title="Pick a game state"
		{onback}
		primaryLabel="Start Demo"
		onprimary={startSelectedScenario}
		primaryDisabled={!selectedScenarioId}
	>
		<p class="setup-hint">
			These examples use local fixture data and render through the real
			game views.
		</p>

		<ul class="scenario-list" role="list">
			{#each DEMO_SCENARIOS as scenario (scenario.id)}
				{@const isSelected = selectedScenarioId === scenario.id}
				<li>
					<button
						class="scenario-card"
						class:scenario-card--selected={isSelected}
						onclick={() => (selectedScenarioId = scenario.id)}
						type="button"
						role="radio"
						aria-checked={isSelected}
					>
						<span class="scenario-card__info">
							<span class="scenario-card__title"
								>{scenario.title}</span
							>
							{#if scenario.description}
								<span class="scenario-card__desc"
									>{scenario.description}</span
								>
							{/if}
						</span>
						<span class="scenario-card__check" aria-hidden="true">
							{#if isSelected}✓{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</SetupStepShell>
{/if}

<style>
	.demo-game-shell {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 100svh;
		display: grid;
		place-items: center;
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

	.demo-game-toolbar__label {
		overflow: hidden;
		border-radius: 999px;
		padding: 0.45rem 0.75rem;
		background: hsl(0 0% 0% / 0.3);
		color: hsl(0 0% 100% / 0.78);
		font-family: var(--font-family-body);
		font-size: var(--font-size-lg);
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.setup-hint {
		margin: 0;
		color: hsl(0 0% 100% / 0.7);
		font-size: var(--font-size-base);
		text-align: center;
	}

	.scenario-list {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.scenario-card {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.875rem;

		border: 2px solid lch(from var(--palette-purple-dark) calc(l + 5) c h);
		border-radius: 0.625rem;
		width: 100%;
		min-height: 5rem;
		padding: 0.875rem 1rem;
		background-color: var(--palette-purple-dark);

		text-align: start;
		color: var(--palette-white);

		&:hover {
			background-color: lch(
				from var(--palette-purple-dark) calc(l + 5) c h
			);
		}
	}

	.scenario-card--selected {
		background-color: var(--palette-purple-mid);
		border-color: var(--palette-purple-start);

		&:hover {
			background-color: lch(
				from var(--palette-purple-mid) calc(l + 5) c h
			);
		}
	}

	.scenario-card__info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.scenario-card__title {
		font-family: var(--font-family-display);
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.scenario-card__desc {
		font-family: var(--font-family-body);
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}

	.scenario-card__check {
		font-size: var(--font-size-lg);
		font-weight: 700;
		width: 1.5rem;
		text-align: center;
		flex-shrink: 0;
	}
</style>
