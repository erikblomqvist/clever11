<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../../admin.css';

	let { data, children } = $props();
	const { supabase, session } = $derived(data);

	onMount(() => {
		document.body.classList.add('admin-body');
		return () => document.body.classList.remove('admin-body');
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/admin/login');
	}

	const currentPath = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>Clever 11 — Admin</title>
	<link rel="icon" type="image/png" href="/favicon-admin.png" />
</svelte:head>

{#if !session && currentPath !== '/admin/login'}
	<div class="admin-loading">Redirecting to login...</div>
{:else if currentPath === '/admin/login'}
	{@render children()}
{:else}
	<div class="admin-shell">
		<nav class="admin-nav">
			<a class="admin-nav__brand" href="/admin">Clever 11</a>
			<a
				class="admin-nav__link"
				href="/admin/decks"
				class:admin-nav__link--active={currentPath.startsWith('/admin/decks')}>Decks</a
			>
			<a
				class="admin-nav__link"
				href="/admin/questions"
				class:admin-nav__link--active={currentPath.startsWith('/admin/questions')}>Questions</a
			>
			<a
				class="admin-nav__link"
				href="/admin/question-quality"
				class:admin-nav__link--active={currentPath === '/admin/question-quality'}>Quality</a
			>
			<a
				class="admin-nav__link"
				href="/admin/users"
				class:admin-nav__link--active={currentPath === '/admin/users'}>Users</a
			>
			<span class="admin-nav__spacer"></span>
			<button
				class="admin-nav__signout"
				type="button"
				onclick={handleLogout}>Sign out</button
			>
		</nav>

		<main class="admin-content">
			{@render children()}
		</main>
	</div>
{/if}
