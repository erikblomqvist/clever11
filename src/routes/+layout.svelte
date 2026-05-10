<script>
	import { onMount } from 'svelte';
	import { setupI18n } from '$lib/i18n';
	import { waitLocale } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';

	let { data, children } = $props();
	const { supabase, session } = $derived(data);
	let i18nReady = $state(import.meta.env.SSR); // Ready by default on server

	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));

	onMount(async () => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		// On the client, we ensure the locale is loaded before showing translated content
		await waitLocale();
		i18nReady = true;

		return () => subscription.unsubscribe();
	});
</script>

{#if i18nReady}
	{#if isAdmin}
		{@render children()}
	{:else}
		<div class="main-app">
			{@render children()}
		</div>
	{/if}
{:else}
	<div class="loading-overlay" aria-busy="true">
		<span class="loading-spinner"></span>
	</div>
{/if}
