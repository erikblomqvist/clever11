<script>
	import { _ } from 'svelte-i18n';
	import Button from './Button.svelte';
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

<form class="home-load" {onsubmit}>
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
		<Button
			text={$_('home.load')}
			type="submit"
			disabled={code.length !== 5}
		/>
		<Button
			variant="secondary"
			text={$_('home.cancel')}
			onclick={oncancel}
		/>
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

	.home-load-actions :global(.btn) {
		flex: 1;
	}
</style>
