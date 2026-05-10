<script>
	import DeckFormView from '$src/admin/DeckFormView.svelte';
	import { page } from '$app/state';

	const id = $derived(page.params.id === 'new' ? null : page.params.id);
</script>

<DeckFormView {id} />
