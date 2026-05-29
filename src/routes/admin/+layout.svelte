<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../../admin.css';
	import Sidebar from '$lib/admin/components/Sidebar.svelte';
	import Topbar from '$lib/admin/components/Topbar.svelte';
	import MobileDrawer from '$lib/admin/components/MobileDrawer.svelte';
	import CommandPalette from '$lib/admin/components/CommandPalette.svelte';

	let { data, children } = $props();
	const { supabase, session } = $derived(data);
	let drawerOpen = $state(false);
	let cmdkOpen = $state(false);

	onMount(() => {
		document.body.classList.add('admin-body');
		return () => document.body.classList.remove('admin-body');
	});

	function handleKeydown(e) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			cmdkOpen = true;
		}
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/admin/login');
	}

	const currentPath = $derived(page.url.pathname);
	const user = $derived(session?.user ?? null);
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Clever 11 — Admin</title>
	<link rel="icon" type="image/png" href="/favicon-admin.png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon-admin.png" />
</svelte:head>

{#if !session && currentPath !== '/admin/login'}
	<div class="admin-loading">Redirecting to login...</div>
{:else if currentPath === '/admin/login'}
	{@render children()}
{:else}
	<div class="admin-shell">
		<Sidebar {user} onSignOut={handleLogout} />
		<div class="admin-main">
			<Topbar onMenuClick={() => (drawerOpen = true)} />
			<main class="admin-content">
				{@render children()}
			</main>
		</div>
	</div>
	<MobileDrawer
		{user}
		open={drawerOpen}
		onClose={() => (drawerOpen = false)}
		onSignOut={handleLogout}
	/>
	<CommandPalette
		open={cmdkOpen}
		onclose={() => (cmdkOpen = false)}
		onSignOut={handleLogout}
	/>
{/if}
