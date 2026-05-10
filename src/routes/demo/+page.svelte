<script>
	import DemoView from '$lib/views/DemoView.svelte';
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Clever 11 — Demo</title>
</svelte:head>

<DemoView onback={() => goto('/')} />
