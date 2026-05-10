<script>
	import HomeActions from './HomeActions.svelte';
	import HomeLanguageSwitcher from './HomeLanguageSwitcher.svelte';
	import HomeLoadForm from './HomeLoadForm.svelte';
	import HomeLogo from './HomeLogo.svelte';

	/**
	 * @type {{
	 *   onnewgame: () => void,
	 *   onloadgame: (code: string) => void,
	 *   onpreviousgames: () => void,
	 *   loaderror?: string|null,
	 * }}
	 */
	let { onnewgame, onloadgame, onpreviousgames, loaderror = null } = $props();

	let showLoad = $state(false);
	let code = $state('');

	function handleLoad(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (code.length === 5) onloadgame(code);
	}

	function handleCodeInput(/** @type {InputEvent} */ e) {
		code = /** @type {HTMLInputElement} */ (e.target).value
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 5);
	}
</script>

<div class="home">
	<HomeLogo />

	{#if !showLoad}
		<HomeActions
			{onnewgame}
			onloadgame={() => (showLoad = true)}
			{onpreviousgames}
		/>
	{:else}
		<HomeLoadForm
			{code}
			{loaderror}
			onsubmit={handleLoad}
			oncodeinput={handleCodeInput}
			oncancel={() => {
				showLoad = false;
				code = '';
			}}
		/>
	{/if}
</div>

<HomeLanguageSwitcher />

<style>
	.home {
		display: grid;
		place-items: center;
		gap: 1.5rem;
		text-align: center;
	}

</style>
