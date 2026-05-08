<script>
	import { supabase } from './lib/supabase.js';
	import LoginView from './admin/LoginView.svelte';
	import DashboardView from './admin/DashboardView.svelte';
	import DecksView from './admin/DecksView.svelte';
	import DeckFormView from './admin/DeckFormView.svelte';
	import QuestionsView from './admin/QuestionsView.svelte';
	import QuestionFormView from './admin/QuestionFormView.svelte';
	import QuestionImportView from './admin/QuestionImportView.svelte';
	import UsersView from './admin/UsersView.svelte';
	import QuestionQualityView from './admin/QuestionQualityView.svelte';

	/** @type {import('@supabase/supabase-js').User|null} */
	let user = $state(null);
	let authChecked = $state(false);
	let hash = $state(window.location.hash || '#/');

	$effect(() => {
		if (!supabase) {
			authChecked = true;
			return;
		}
		supabase.auth.getUser().then(({ data }) => {
			user = data.user ?? null;
			authChecked = true;
		});
		const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
			user = session?.user ?? null;
		});
		const onHash = () => {
			hash = window.location.hash || '#/';
		};
		window.addEventListener('hashchange', onHash);
		return () => {
			listener.subscription.unsubscribe();
			window.removeEventListener('hashchange', onHash);
		};
	});

	const route = $derived.by(() => {
		const h = hash.replace(/^#/, '') || '/';
		if (h === '/login') return { view: 'login' };
		if (h === '/decks') return { view: 'decks' };
		if (h === '/decks/new') return { view: 'deck-form', id: null };
		const deckEdit = h.match(/^\/decks\/([^/]+)$/);
		if (deckEdit) return { view: 'deck-form', id: deckEdit[1] };
		if (h === '/questions') return { view: 'questions' };
		if (h === '/questions/import') return { view: 'question-import' };
		if (h === '/questions/new') return { view: 'question-form', id: null };
		const qEdit = h.match(/^\/questions\/([^/]+)$/);
		if (qEdit) return { view: 'question-form', id: qEdit[1] };
		if (h === '/users') return { view: 'users' };
		if (h === '/question-quality') return { view: 'question-quality' };
		return { view: 'dashboard' };
	});

	function navigate(/** @type {string} */ path) {
		window.location.hash = path;
	}

	async function handleLogout() {
		await supabase?.auth.signOut();
		navigate('/login');
	}
</script>

{#if !authChecked}
	<div class="admin-loading">Loading…</div>
{:else if !supabase}
	<div class="admin-loading admin-loading--error">
		Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and
		<code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file.
	</div>
{:else if !user || route.view === 'login'}
	<LoginView
		onlogin={(u) => {
			user = u;
			navigate('/');
		}}
	/>
{:else}
	<div class="admin-shell">
		<nav class="admin-nav">
			<a class="admin-nav__brand" href="#/">Clever 11</a>
			<a class="admin-nav__link" href="#/decks" class:admin-nav__link--active={route.view === 'decks' || route.view === 'deck-form'}>Decks</a>
			<a class="admin-nav__link" href="#/questions" class:admin-nav__link--active={route.view === 'questions' || route.view === 'question-form'}>Questions</a>
			<a class="admin-nav__link" href="#/question-quality" class:admin-nav__link--active={route.view === 'question-quality'}>Quality</a>
			<a class="admin-nav__link" href="#/users" class:admin-nav__link--active={route.view === 'users'}>Users</a>
			<span class="admin-nav__spacer"></span>
			<button class="admin-nav__signout" type="button" onclick={handleLogout}>Sign out</button>
		</nav>

		<main class="admin-content">
			{#if route.view === 'dashboard'}
				<DashboardView {navigate} />
			{:else if route.view === 'decks'}
				<DecksView {navigate} />
			{:else if route.view === 'deck-form'}
				<DeckFormView id={route.id} {navigate} />
			{:else if route.view === 'questions'}
				<QuestionsView {navigate} />
			{:else if route.view === 'question-import'}
				<QuestionImportView {navigate} />
			{:else if route.view === 'question-form'}
				<QuestionFormView id={route.id} {navigate} />
			{:else if route.view === 'question-quality'}
				<QuestionQualityView {navigate} />
			{:else if route.view === 'users'}
				<UsersView />
			{/if}
		</main>
	</div>
{/if}
