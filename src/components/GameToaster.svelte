<script>
	import { Toaster } from 'svelte-sonner';
</script>

<Toaster
	position="top-center"
	toastOptions={{
		style: `
			font-family: var(--font-family-display);
			font-size: var(--font-size-md);
			background: var(--grayscale-900);
			color: var(--white);
			border: 1px solid var(--grayscale-700);
		`,
	}}
/>
