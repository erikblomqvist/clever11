<script>
	/** @type {{ onlogin: (user: import('@supabase/supabase-js').User) => void, supabase?: import('@supabase/supabase-js').SupabaseClient|null }} */
	let { onlogin, supabase: supabaseProp } = $props();
	import { supabase as supabaseGlobal } from '../lib/supabase.js';

	const supabase = $derived(supabaseProp ?? supabaseGlobal);

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (!supabase) return;
		loading = true;
		error = '';
		const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
		if (authError) {
			loading = false;
			error = authError.message;
			return;
		}
		if (!data.user) { error = 'Login failed.'; loading = false; return; }

		// Check admin flag
		const { data: userData } = await supabase
			.from('users')
			.select('is_admin')
			.eq('id', data.user.id)
			.single();
		
		if (!userData?.is_admin) {
			await supabase.auth.signOut();
			loading = false;
			error = 'You do not have admin access.';
			return;
		}
		onlogin(data.user);
		loading = false;
	}
</script>

<div class="admin-login">
	<form class="admin-login__form" onsubmit={handleSubmit}>
		<h1 class="admin-login__title">Clever 11 Admin</h1>
		{#if error}
			<p class="admin-form-error">{error}</p>
		{/if}
		<label class="admin-label">
			Email
			<input class="admin-input" type="email" bind:value={email} required autocomplete="email" disabled={loading} />
		</label>
		<label class="admin-label">
			Password
			<input class="admin-input" type="password" bind:value={password} required autocomplete="current-password" disabled={loading} />
		</label>
		<button class="admin-btn admin-btn--primary" type="submit" disabled={loading}>
			{loading ? 'Signing in…' : 'Sign in'}
		</button>
	</form>
</div>
