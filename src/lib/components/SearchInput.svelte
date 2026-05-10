<script>
	import { Search } from 'lucide-svelte';

	/**
	 * @type {{
	 *   placeholder?: string,
	 *   value?: string,
	 * }}
	 */
	let { placeholder = '', value = $bindable('') } = $props();
</script>

<div class="search-input">
	<Search size={18} />
	<input type="search" {placeholder} bind:value />
</div>

<style>
	.search-input {
		display: flex;
		align-items: center;
		gap: 0.75rem;

		padding: 0.75rem 1rem;
		border: 1px solid hsl(0 0% 100% / 0.15);
		border-radius: 0.625rem;
		background-color: transparent;
		color: var(--color-muted);
		transition: border-color var(--transition-default-duration);

		&:focus-within {
			border-color: hsl(0 0% 100% / 0.3);
		}
	}

	input {
		flex: 1;
		border: none;
		background: none;
		color: var(--white);
		font-family: var(--font-family-monospace);
		font-size: var(--font-size-base);
		outline: none;
	}

	input::placeholder {
		color: var(--color-muted);
	}

	input::-webkit-search-cancel-button {
		-webkit-appearance: none;
	}
</style>
