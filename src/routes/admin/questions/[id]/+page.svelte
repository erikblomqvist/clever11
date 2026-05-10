<script>
	import QuestionFormView from '$lib/admin/QuestionFormView.svelte';
	import { page } from '$app/state';

	const id = $derived(page.params.id === 'new' ? null : page.params.id);
</script>

<QuestionFormView {id} />
