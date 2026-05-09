<script>
	import { _ } from 'svelte-i18n';
	import Message from './Message.svelte';

	/**
	 * @type {{
	 *   code: string,
	 *   loaderror?: string|null,
	 *   onsubmit: (event: SubmitEvent) => void,
	 *   oncodeinput: (event: InputEvent) => void,
	 *   oncancel: () => void,
	 * }}
	 */
	let { code, loaderror = null, onsubmit, oncodeinput, oncancel } = $props();
</script>

<form class="home-load" onsubmit={onsubmit}>
	<input
		class="home-code-input"
		type="text"
		placeholder={$_('home.game_code_placeholder')}
		value={code}
		oninput={oncodeinput}
		autocomplete="off"
		spellcheck="false"
		inputmode="text"
		aria-label={$_('home.game_code_aria')}
	/>
	{#if loaderror}
		<Message variant="error" description={loaderror} />
	{/if}
	<div class="home-load-actions">
		<button
			class="home-btn home-btn--primary"
			type="submit"
			disabled={code.length !== 5}
		>
			{$_('home.load')}
		</button>
		<button class="home-btn home-btn--secondary" type="button" onclick={oncancel}>
			{$_('home.cancel')}
		</button>
	</div>
</form>

<style>
	.home-load {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 16rem;
	}

	.home-code-input {
		border: 3px solid var(--orange-700);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--white);
		color: var(--grayscale-900);
		font-family: var(--font-family-monospace);
		font-size: 2rem;
		font-weight: 600;
		text-align: center;
		width: 100%;
		box-sizing: border-box;
	
		&::placeholder {
			color: var(--grayscale-400);
		}
	}

	.home-code-input:focus {
		outline: 3px solid var(--orange-700);
		outline-offset: 2px;
	}

	.home-load-actions {
		display: flex;
		gap: 0.75rem;
	}

	.home-load-actions .home-btn {
		flex: 1;
	}

	.home-btn {
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 2rem;
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
	
		&:hover {
			background-color: var(--orange-800);
		}
		
		&:disabled {
			background-color: var(--orange-300);
			cursor: not-allowed;
		}
	}

	.home-btn--secondary {
		background-color: hsl(0 0% 100% / 0.2);
		color: var(--white);
		
		&:hover {
			background-color: hsl(0 0% 100% / 0.3);
		}
	}

</style>
