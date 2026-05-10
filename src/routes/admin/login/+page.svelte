<script>
	import LoginView from '$src/admin/LoginView.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
</script>

<LoginView
	supabase={data.supabase}
	onlogin={() => {
		goto('/admin');
	}}
/>
